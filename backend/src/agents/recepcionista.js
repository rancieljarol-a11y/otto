// OttO - Agente Recepcionista
// Nivel 1: 100% reglas, cero IA
// Recibe mensajes entrantes, identifica negocio, detecta spam, enruta

const Negocio = require('../models/negocio');
const Cliente = require('../models/cliente');
const Conversacion = require('../models/conversacion');
const WhatsAppService = require('../services/whatsapp');

class AgenteRecepcionista {
  // Procesar mensaje entrante
  static async procesar(mensaje, numeroEntrante) {
    const startTime = Date.now();
    const resultado = {
      agente: 'recepcionista',
      tiempo_procesamiento: 0,
      acciones: [],
      negocio_id: null,
      cliente_id: null,
      debe_rutear: false,
      siguiente_agente: null
    };

    try {
      // 1. Detectar spam primero (anti-spam always-on)
      const esSpam = this.detectarSpam(mensaje, numeroEntrante);
      if (esSpam.bloqueado) {
        resultado.acciones.push({ tipo: 'spam_bloqueado', razon: esSpam.razon });
        return resultado;
      }

      // 2. Identificar negocio por número entrante
      const negocio = await this.identificarNegocio(numeroEntrante);
      if (!negocio) {
        resultado.acciones.push({ tipo: 'negocio_no_encontrado', numero: numeroEntrante });
        return resultado;
      }

      resultado.negocio_id = negocio.id;
      resultado.acciones.push({ tipo: 'negocio_identificado', nombre: negocio.nombre });

      // 3. Verificar si está fuera de horario
      const fueraDeHorario = this.estaFueraDeHorario(negocio);
      if (fueraDeHorario.activo) {
        // Enviar mensaje automático de fuera de horario
        await this.enviarMensajeFueraHorario(negocio, numeroEntrante);
        resultado.acciones.push({ tipo: 'fuera_de_horario', mensaje: negocio.mensaje_fuera_horario });
        
        // Verificar si acepta pedidos fuera de horario
        if (!negocio.acepta_pedidos_fuera_horario) {
          return resultado;
        }
      }

      // 4. Identificar rol del número
      const rol = await this.identificarRol(numeroEntrante, negocio.id);
      resultado.acciones.push({ tipo: 'rol_identificado', rol });

      // 5. Obtener o crear cliente
      const cliente = await Cliente.upsert(negocio.id, numeroEntrante, {
        nombre: `Cliente ${numeroEntrante.slice(-4)}`
      });
      resultado.cliente_id = cliente.id;

      // 6. Verificar si cliente está bloqueado
      if (cliente.bloqueado) {
        resultado.acciones.push({ tipo: 'cliente_bloqueado' });
        return resultado;
      }

      // 7. Obtér o crear conversación
      const conversacion = await Conversacion.upsert(negocio.id, cliente.id);

      // 8. Procesar el mensaje según rol y contenido
      const respuesta = await this.procesarMensaje(mensaje, {
        negocio,
        cliente,
        conversacion,
        rol,
        fueraDeHorario
      });

      // 9. Guardar mensaje en conversación
      await Conversacion.addMessage(conversacion.id, negocio.id, {
        role: 'user',
        content: mensaje,
        timestamp: new Date().toISOString()
      });

      // 10. Enviar respuesta si existe
      if (respuesta) {
        await WhatsAppService.sendMessage(numeroEntrante, respuesta, negocio.id);
        
        await Conversacion.addMessage(conversacion.id, negocio.id, {
          role: 'assistant',
          content: respuesta,
          timestamp: new Date().toISOString()
        });
        
        resultado.acciones.push({ tipo: 'respuesta_enviada' });
      }

      // 11. Determinar si debe rutear a otro agente
      if (respuesta?.debe_rutear) {
        resultado.debe_rutear = true;
        resultado.siguiente_agente = respuesta.siguiente_agente;
      }

      resultado.tiempo_procesamiento = Date.now() - startTime;
      return resultado;

    } catch (error) {
      resultado.acciones.push({ tipo: 'error', error: error.message });
      console.error('AgenteRecepcionista error:', error);
      return resultado;
    }
  }

  // Detectar spam (Anti-spam Agent - 100% reglas)
  static detectarSpam(mensaje, numero) {
    const msgLower = mensaje.toLowerCase();
    
    // Patrones de spam conocidos
    const patronesSpam = [
      /ganaste.*premio/i,
      /click.*aqu.*premio/i,
      /gratis.*dinero/i,
      /inversión.*doble/i,
      /crypto.*bitcoin/i,
      /sexo.*gratis/i,
      /contacto.*mujeres/i,
      /\.{5,}/, // Demasiados puntos
      /!{5,}/,  // Demasiadas exclamaciones
      /^.{200,}$/  // Mensaje muy largo
    ];

    for (const patron of patronesSpam) {
      if (patron.test(mensaje)) {
        return { bloqueado: true, razon: 'patron_spam_detectado' };
      }
    }

    // Números con demasiados mensajes en poco tiempo (rate limiting básico)
    // Esto se manejaría con una tabla de rate limits
    
    // Verificar si es un número reportado como spam
    // (Pendiente: implementar tabla de spam_reports)

    return { bloqueado: false };
  }

  // Identificar negocio por número
  static async identificarNegocio(numero) {
    // Buscar en números autorizados primero
    const resultado = await require('../config/database').query(
      `SELECT n.* FROM negocios n
       JOIN numeros_autorizados na ON na.negocio_id = n.id
       WHERE na.numero_whatsapp = $1 AND na.activo = true`,
      [numero]
    );

    if (resultado.rows.length > 0) {
      return resultado.rows[0];
    }

    // Buscar por número del negocio o del dueño
    return await Negocio.findByWhatsApp(numero);
  }

  // Identificar rol del número
  static async identificarRol(numero, negocioId) {
    const resultado = await require('../config/database').query(
      `SELECT rol FROM numeros_autorizados 
       WHERE negocio_id = $1 AND numero_whatsapp = $2 AND activo = true`,
      [negocioId, numero]
    );

    if (resultado.rows.length > 0) {
      return resultado.rows[0].rol;
    }

    // Si es el número del dueño
    const negocio = await Negocio.findById(negocioId);
    if (negocio?.whatsapp_dueno === numero) {
      return 'dueño';
    }

    return 'cliente';
  }

  // Verificar horario de atención
  static estaFueraDeHorario(negocio) {
    const ahora = new Date();
    const zonaHoraria = negocio.zona_horaria || 'America/Lima';
    
    // Convertir a la zona horaria del negocio
    const fechaNegocio = this.convertirZonaHoraria(ahora, zonaHoraria);
    const diaSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][fechaNegocio.getDay()];
    const horaActual = fechaNegocio.getHours();
    const minutoActual = fechaNegocio.getMinutes();
    const horaMinutos = horaActual * 60 + minutoActual;

    const horario = negocio.horario_atencion || {};
    const configDia = horario[diaSemana];

    if (!configDia?.activo) {
      return { activo: true, razon: 'dia_cerrado' };
    }

    const [inicioH, inicioM] = (configDia.inicio || '08:00').split(':').map(Number);
    const [finH, finM] = (configDia.fin || '22:00').split(':').map(Number);
    
    const inicioMinutos = inicioH * 60 + inicioM;
    const finMinutos = finH * 60 + finM;

    if (horaMinutos < inicioMinutos || horaMinutos >= finMinutos) {
      return { activo: true, razon: 'fuera_de_horario' };
    }

    return { activo: false };
  }

  // Convertir timestamp a zona horaria del negocio
  static convertirZonaHoraria(fecha, zonaHoraria) {
    // En producción usar moment-timezone o date-fns-tz
    // Por ahora asumimos misma zona
    return fecha;
  }

  // Enviar mensaje de fuera de horario
  static async enviarMensajeFueraHorario(negocio, numero) {
    const mensaje = negocio.mensaje_fuera_horario || 
      'Gracias por contactarnos. Estamos fuera de horario. Nuestro horario de atención es de 8:00 AM a 10:00 PM.';
    
    await WhatsAppService.sendMessage(numero, mensaje, negocio.id);
  }

  // Procesar mensaje según contenido (reglas puras)
  static async procesarMensaje(mensaje, contexto) {
    const { negocio, rol, fueraDeHorario } = contexto;
    const msgLower = mensaje.toLowerCase().trim();

    // Si es empleado/admin, permitir comandos especiales
    if (rol === 'dueño' || rol === 'supervisor') {
      if (msgLower.startsWith('/')) {
        return await this.procesarComandoAdmin(mensaje, contexto);
      }
    }

    // Reglas públicas para todos
    // Menú / Catálogo
    if (this.esConsultaMenu(msgLower)) {
      return {
        texto: await this.generarMenu(negocio),
        debe_rutear: false
      };
    }

    // Estado de pedido
    if (this.esConsultaPedido(msgLower)) {
      return await this.procesarConsultaPedido(mensaje, contexto);
    }

    // Información de contacto/ubicación
    if (this.esConsultaUbicacion(msgLower)) {
      return {
        texto: this.generarInfoContacto(negocio),
        debe_rutear: false
      };
    }

    // Reservación
    if (this.esReservacion(msgLower)) {
      return {
        texto: 'Para hacer una reservación, por favor contacta al negocio directamente por llamada o escribe más detalles de tu solicitud.',
        debe_rutear: true,
        siguiente_agente: 'ventas'
      };
    }

    // Hacer un pedido
    if (this.esPedido(msgLower)) {
      // ENROUTAR directamente al agente de ventas SIN responder nada
      // El agente de ventas procesará el mensaje completo del cliente
      return {
        texto: null,
        debe_rutear: true,
        siguiente_agente: 'ventas'
      };
    }

    // Saludo
    if (this.esSaludo(msgLower)) {
      const nombre = contexto.cliente?.nombre || 'bienvenido';
      return {
        texto: `¡Hola! 👋\n\nBienvenido a *${negocio.nombre}*\n\n¿En qué puedo ayudarte hoy?\n- Ver el menú\n- Hacer un pedido\n- Consultar un pedido anterior`,
        debe_rutear: false
      };
    }

    // Despedida
    if (this.esDespedida(msgLower)) {
      return {
        texto: '¡Gracias por contactarnos! Que tengas un excelente día. 👋',
        debe_rutear: false
      };
    }

    // Si no matched ninguna regla, rutear a ventas
    return {
      texto: 'Gracias por tu mensaje. Un asesor te atenderá pronto.',
      debe_rutear: true,
      siguiente_agente: 'ventas'
    };
  }

  // Comandos de administrador (dueño/supervisor)
  static async procesarComandoAdmin(mensaje, contexto) {
    const { negocio, rol } = contexto;
    const msgLower = mensaje.toLowerCase();
    const partes = mensaje.split(' ');
    const comando = partes[0].toLowerCase();
    const args = partes.slice(1).join(' ');

    const comandos = {
      '/menu': () => this.generarMenu(negocio),
      '/pedidos': () => `Tienes ${args || '10'} pedidos pendientes. Escribe /pedidos lista para ver detalles.`,
      '/stats': () => '📊 *Estadísticas de hoy:*\n- Pedidos: 15\n- Ventas: RD$ 450.00\n- Clientes nuevos: 3',
      '/ayuda': () => this.ayudaAdmin(),
      '/pausar': () => this.pausarNegocio(negocio.id),
      '/temp': () => this.modoTemporada(negocio.id, args)
    };

    if (comandos[comando]) {
      return { texto: await comandos[comando](), debe_rutear: false };
    }

    return { texto: 'Comando no reconocido. Escribe /ayuda para ver comandos disponibles.', debe_rutear: false };
  }

  static ayudaAdmin() {
    return `*Comandos disponibles:*

/menu - Ver menú actual
/pedidos - Ver pedidos pendientes
/stats - Ver estadísticas
/ayuda - Mostrar esta ayuda
/pausar - Pausar el negocio (max 3/año)
/temp [días] - Modo temporada`;
  }

  static async pausarNegocio(negocioId) {
    const db = require('../config/database');
    const resultado = await db.query(
      `UPDATE negocios SET 
        estado = 'pausado',
        fecha_pausa = NOW(),
        pausas_usadas_anio = pausas_usadas_anio + 1
       WHERE id = $1
       RETURNING *`,
      [negocioId]
    );
    return 'Negocio pausado. Los clientes verán un mensaje indicando que estás fuera de servicio.';
  }

  static async modoTemporada(negocioId, dias) {
    const diasNum = parseInt(dias) || 7;
    const db = require('../config/database');
    await db.query(
      `UPDATE negocios SET 
        metadata = metadata || jsonb_build_object('modo_temporada', true, 'regresa', NOW() + INTERVAL '${diasNum} days')
       WHERE id = $1`,
      [negocioId]
    );
    return `Modo temporada activado por ${diasNum} días.`;
  }

  // ========== HELPERS ==========

  static esConsultaMenu(msg) {
    const palabras = ['menú', 'menu', 'carta', 'productos', 'catalogo', 'catálogo', 'ver', 'quieren'];
    return palabras.some(p => msg.includes(p)) && !msg.includes('pedir');
  }

  static esConsultaPedido(msg) {
    const palabras = ['pedido', 'orden', 'mi pedido', 'estado', 'progreso'];
    return palabras.some(p => msg.includes(p));
  }

  static esConsultaUbicacion(msg) {
    const palabras = ['ubicación', 'ubicacion', 'dirección', 'direccion', 'donde', 'cómo llegar', 'como llegar'];
    return palabras.some(p => msg.includes(p));
  }

  static esReservacion(msg) {
    const palabras = ['reservar', 'reserva', 'reservación', 'reservacion', 'reservar mesa'];
    return palabras.some(p => msg.includes(p));
  }

  static esPedido(msg) {
    const palabras = ['pedir', 'ordenar', 'comprar', 'quiero', 'necesito', 'para llevar', 'delivery', 'domicilio'];
    return palabras.some(p => msg.includes(p));
  }

  static esSaludo(msg) {
    const saludos = ['hola', 'buenos', 'buenas', 'hey', 'hi', 'que tal', 'qué tal', 'buen dia', 'buen día', 'buenas'];
    return saludos.some(s => msg.startsWith(s));
  }

  static esDespedida(msg) {
    const despedidas = ['gracias', 'chao', 'adios', 'adiós', 'nos vemos', 'hasta luego', 'bye', 'ok gracias'];
    return despedidas.some(d => msg.includes(d));
  }

  static async generarMenu(negocio) {
    const Producto = require('../models/producto');
    const productos = await Producto.list(negocio.id, { activo: true });

    if (!productos.length) {
      return `🍽️ *${negocio.nombre}*\n\nAún no tenemos productos disponibles. ¡Contáctanos para hacer tu pedido!`;
    }

    // Agrupar por categoría
    const porCategoria = {};
    for (const p of productos) {
      const cat = p.categoria || 'General';
      if (!porCategoria[cat]) porCategoria[cat] = [];
      porCategoria[cat].push(p);
    }

    let mensaje = `🍽️ *${negocio.nombre}*\n\n`;
    
    for (const [categoria, items] of Object.entries(porCategoria)) {
      mensaje += `*${categoria}:*\n`;
      for (const p of items) {
        mensaje += `• ${p.nombre} - RD$${p.precio.toFixed(2)}`;
        if (p.descripcion) mensaje += `\n  ${p.descripcion}`;
        mensaje += '\n';
      }
      mensaje += '\n';
    }

    mensaje += '\n_¿Qué te gustaría pedir?_';
    return mensaje;
  }

  static async procesarConsultaPedido(mensaje, contexto) {
    const Pedido = require('../models/pedido');
    const { negocio, cliente } = contexto;

    // Extraer número de pedido
    const match = mensaje.match(/[A-Z]{3}[0-9]{6}/i);
    if (match) {
      const pedido = await Pedido.findByNumero(match[0].toUpperCase(), negocio.id);
      if (pedido) {
        const estados = {
          nuevo: '🆕 Nuevo',
          confirmado: '✅ Confirmado',
          preparando: '👨‍🍳 Preparando',
          listo: '📦 Listo',
          entregado: '🎉 Entregado',
          cancelado: '❌ Cancelado'
        };
        return {
          texto: `Tu pedido *${pedido.numero_pedido}* está: *${estados[pedido.estado]}*\n\nTotal: RD$${pedido.total.toFixed(2)}`,
          debe_rutear: false
        };
      }
    }

    // Buscar pedidos recientes del cliente
    const pedidos = await Pedido.list(negocio.id, { cliente_id: cliente.id, limit: 5 });
    if (pedidos.length > 0) {
      let mensaje = '📋 *Tus pedidos recientes:*\n\n';
      for (const p of pedidos) {
        const fecha = new Date(p.fecha_pedido).toLocaleDateString('es-PE');
        mensaje += `• *${p.numero_pedido}* - ${fecha}\n  Estado: ${p.estado}\n`;
      }
      mensaje += '\n_Dime el número de pedido para más detalles_';
      return { texto: mensaje, debe_rutear: false };
    }

    return {
      texto: 'No encontré pedidos con tu número. ¿Tienes el número de tu pedido?',
      debe_rutear: false
    };
  }

  static generarInfoContacto(negocio) {
    let mensaje = `📍 *Información de contacto*\n\n`;
    if (negocio.whatsapp_negocio) {
      mensaje += `📱 WhatsApp: ${negocio.whatsapp_negocio}\n`;
    }
    if (negocio.direccion) {
      mensaje += `🏠 Dirección: ${negocio.direccion}\n`;
    }
    return mensaje;
  }
}

module.exports = AgenteRecepcionista;