// OttO - Agente de Ventas v2
// Mejorado para entender contexto y mantener conversación natural

const Negocio = require('../models/negocio');
const Cliente = require('../models/cliente');
const Producto = require('../models/producto');
const Pedido = require('../models/pedido');
const Conversacion = require('../models/conversacion');
const WhatsAppService = require('../services/whatsapp');

class AgenteVentas {
  // Retornar siempre un objeto con estructura consistente
  static async procesar(mensaje, contexto) {
    const { negocio, cliente, conversacion } = contexto;
    
    try {
      // Cargar contexto previo
      const contextoPedido = await this.cargarContextoPedido(conversacion.id, negocio.id);
      const intencion = this.detectarIntencion(mensaje, contextoPedido);
      
      // Si hay un pedido en progreso, procesar según el estado
      if (contextoPedido?.productos?.length > 0) {
        const resultado = await this.procesarConPedidoEnProgreso(mensaje, contexto, contextoPedido, intencion);
        return typeof resultado === 'string' ? { texto: resultado } : resultado;
      }
      
      // Procesar nuevo pedido
      switch (intencion.tipo) {
        case 'saludo':
          return { texto: this.respuestaSaludo(negocio) };
        case 'ver_menu':
          return await this.enviarMenu(contexto);
        case 'hacer_pedido':
        case 'desconocido':
          return await this.procesarNuevoPedido(mensaje, contexto, contextoPedido);
        default:
          return await this.respuestaGeneral(mensaje, contexto);
      }

    } catch (error) {
      console.error('AgenteVentas error:', error);
      return { texto: 'Tuve un problema procesando tu solicitud. ¿Podrías repetirlo?' };
    }
  }

  static detectarIntencion(mensaje, contextoPedido) {
    const msg = mensaje.toLowerCase().trim();
    
    // Saludos
    if (/^(hola|buenos|buenas|hey|hi|que tal|qué tal)$/.test(msg)) {
      return { tipo: 'saludo', confidence: 0.9 };
    }
    
    // Confirmar respuesta simple (sí, ok, claro, etc)
    if (/^(sí|si|de acuerdo|confirmar|ok|claro|perfecto|esta bien|confirma|si quiero|si|yes|yep)$/i.test(msg)) {
      return { tipo: 'confirmar_simple', confidence: 0.9 };
    }
    
    // Ver menú
    if (/menu|catalogo|qué tienen|que tienen|ver productos|ver el menu/i.test(msg)) {
      return { tipo: 'ver_menu', confidence: 0.8 };
    }
    
    // Cancelar
    if (/^(cancelar|no|nah|olvídalo|olvidaló|chale)$/i.test(msg)) {
      return { tipo: 'cancelar', confidence: 0.9 };
    }
    
    // Dirección - responder pregunta de dirección
    if (contextoPedido?.estado === 'esperando_direccion') {
      if (msg.length > 5 && !/^(si|no|si|yes)$/i.test(msg)) {
        return { tipo: 'responder_direccion', confidence: 0.9 };
      }
    }
    
    // Hora - responder pregunta de hora
    if (contextoPedido?.estado === 'esperando_hora') {
      if (/para las|a las|a las \d+|a las \d+:\d+/i.test(msg) || /^\d{1,2}(:\d{2})?$/i.test(msg)) {
        return { tipo: 'responder_hora', confidence: 0.9 };
      }
    }
    
    // Productos - palabras clave
    if (/quiero|necesito|pedir|orden|un |una |dos |tres |para llevar/i.test(msg)) {
      return { tipo: 'hacer_pedido', confidence: 0.7 };
    }
    
    // Consultar precio
    if (/cuánto|cuanto|precio|cuesta/i.test(msg)) {
      return { tipo: 'consultar_precio', confidence: 0.8 };
    }
    
    return { tipo: 'desconocido', confidence: 0.3 };
  }

  static respuestaSaludo(negocio) {
    return {
      texto: `¡Hola! 👋\n\nBienvenido a *${negocio.nombre}* 🌹\n\n¿En qué puedo ayudarte?\n• Ver nuestro catálogo\n• Hacer un pedido\n• Consultar un pedido anterior`
    };
  }

  static async procesarConPedidoEnProgreso(mensaje, contexto, contextoPedido, intencion) {
    const msg = mensaje.toLowerCase().trim();
    const { negocio, cliente, conversacion } = contexto;
    
    // Confirmación simple
    if (intencion.tipo === 'confirmar_simple' || intencion.tipo === 'confirmar') {
      return await this.confirmarPedido(contexto, contextoPedido);
    }
    
    // Cancelar
    if (intencion.tipo === 'cancelar') {
      await this.limpiarContexto(conversacion.id, negocio.id);
      return { texto: 'OK, pedido cancelado. ¿En qué más puedo ayudarte?' };
    }
    
    // Respondent dirección
    if (intencion.tipo === 'responder_direccion' || contextoPedido.estado === 'esperando_direccion') {
      // Actualizar contexto con dirección
      const nuevoContexto = {
        ...contextoPedido,
        direccion: mensaje,
        estado: 'esperando_hora'
      };
      await this.guardarContextoPedido(conversacion.id, negocio.id, nuevoContexto);
      
      return {
        texto: `Perfecto 📍\n\n📍 *Dirección:* ${mensaje}\n\n⏰ ¿Para qué hora lo necesitas? (ej: 3pm, 5pm)`
      };
    }
    
    // Responder hora
    if (intencion.tipo === 'responder_hora' || contextoPedido.estado === 'esperando_hora') {
      // Extraer hora del mensaje
      const horaMatch = mensaje.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      let hora = '';
      if (horaMatch) {
        let h = parseInt(horaMatch[1]);
        const m = horaMatch[2] || '00';
        const ampm = horaMatch[3]?.toLowerCase();
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        hora = `${h.toString().padStart(2, '0')}:${m}`;
      } else {
        hora = mensaje;
      }
      
      const nuevoContexto = {
        ...contextoPedido,
        hora_entrega: hora,
        estado: 'confirmando'
      };
      await this.guardarContextoPedido(conversacion.id, negocio.id, nuevoContexto);
      
      // Generar mensaje de confirmación
      return this.generarConfirmacion(nuevoContexto, contexto);
    }
    
    // Si no entiende, preguntar de nuevo
    return {
      texto: 'Disculpa, no entendí. ¿Podrías confirmar el pedido replying "sí" o dar la información que falta?'
    };
  }

  static async procesarNuevoPedido(mensaje, contexto, contextoPrevio) {
    const { negocio, cliente, conversacion } = contexto;
    const msg = mensaje.toLowerCase();
    
    // Extraer productos
    const productos = await this.buscarProductos(mensaje, negocio.id);
    
    if (productos.length === 0) {
      return await this.enviarMenu(contexto);
    }
    
    // Crear contexto inicial
    const contextoPedido = {
      productos: productos,
      cantidad: 1,
      estado: 'esperando_direccion',
      mensaje_original: mensaje
    };
    
    await this.guardarContextoPedido(conversacion.id, negocio.id, contextoPedido);
    
    return {
      texto: this.generarConfirmacion(contextoPedido, contexto)
    };
  }

  static async buscarProductos(mensaje, negocioId) {
    const todosProductos = await Producto.list(negocioId, { activo: true });
    const msgLower = mensaje.toLowerCase();
    const encontrados = [];
    
    for (const p of todosProductos) {
      const nombreLower = p.nombre.toLowerCase();
      
      // Buscar coincidencias
      if (msgLower.includes(nombreLower) || 
          nombreLower.split(/[\s,]+/).some(word => word.length > 3 && msgLower.includes(word))) {
        encontrados.push({
          producto_id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          cantidad: 1
        });
      }
    }
    
    // Si no encontró nada específico, buscar por palabras clave comunes
    if (encontrados.length === 0) {
      if (/flor|ramo|arreglo/i.test(msgLower)) {
        // Buscar el producto más barato o el más común
        const productosFlor = todosProductos.filter(p => 
          p.categoria?.toLowerCase().includes('ramo') ||
          p.nombre.toLowerCase().includes('ramo')
        );
        if (productosFlor.length > 0) {
          encontrados.push({
            producto_id: productosFlor[0].id,
            nombre: productosFlor[0].nombre,
            precio: productosFlor[0].precio,
            cantidad: 1
          });
        }
      }
    }
    
    return encontrados;
  }

  static generarConfirmacion(contextoPedido, contexto) {
    const { negocio } = contexto;
    const productos = contextoPedido.productos;
    
    if (!productos || productos.length === 0) {
      return '¿Qué producto te gustaría pedir?';
    }
    
    let total = 0;
    let msg = '🌸 *Entendido!* Tengo esto:\n\n*Producto(s):*\n';
    
    for (const p of productos) {
      const subtotal = p.precio * (p.cantidad || 1);
      total += subtotal;
      msg += `• ${p.cantidad || 1}x ${p.nombre} - $${subtotal.toFixed(2)}\n`;
    }
    
    msg += `\n*Total: $${total.toFixed(2)}*\n\n`;
    
    if (contextoPedido.direccion) {
      msg += `📍 *Dirección:* ${contextoPedido.direccion}\n`;
    }
    
    if (contextoPedido.hora_entrega) {
      msg += `⏰ *Hora:* ${contextoPedido.hora_entrega}\n`;
    }
    
    // Según el estado, hacer la pregunta correcta
    switch (contextoPedido.estado) {
      case 'esperando_direccion':
        msg += '\n📍 ¿A qué dirección lo entregamos?';
        break;
      case 'esperando_hora':
        msg += '\n⏰ ¿Para qué hora lo necesitas?';
        break;
      case 'confirmando':
        msg += '\n✅ ¿Confirmas este pedido? (responde "sí" para confirmar)';
        break;
      default:
        msg += '\n📍 ¿A qué dirección lo entregamos?';
    }
    
    return msg;
  }

  static async confirmarPedido(contexto, contextoPedido) {
    const { negocio, cliente, conversacion } = contexto;
    
    if (!contextoPedido.productos?.length) {
      return { texto: 'No tienes ningún pedido en proceso. ¿Qué te gustaría pedir?' };
    }

    const items = contextoPedido.productos.map(p => ({
      producto_id: p.producto_id,
      nombre: p.nombre,
      precio: p.precio,
      cantidad: p.cantidad || 1,
      personalizacion: {}
    }));

    const total = items.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);

    const pedido = await Pedido.create(negocio.id, cliente.id, {
      productos: items,
      origen: 'whatsapp',
      metodo_pago: null,
      agregado_por: cliente.numero_whatsapp,
      direccion_entrega: contextoPedido.direccion,
      hora_entrega: contextoPedido.hora_entrega
    });

    await this.limpiarContexto(conversacion.id, negocio.id);
    await this.alertarDueno(negocio.id, pedido);

    return {
      texto: `✅ *¡Pedido #${pedido.numero_pedido} confirmado!*\n\nTu pedido está siendo preparado y te notifyaremos cuando esté listo para entrega.\n\n🌸 ¡Gracias por tu compra!`
    };
  }

  static async cargarContextoPedido(conversacionId, negocioId) {
    try {
      const db = require('../config/database');
      const result = await db.query(
        `SELECT metadata FROM conversaciones WHERE id = $1 AND negocio_id = $2`,
        [conversacionId, negocioId]
      );
      
      if (result.rows[0]?.metadata) {
        return result.rows[0].metadata;
      }
    } catch (e) {
      // Sin contexto
    }
    return null;
  }

  static async guardarContextoPedido(conversacionId, negocioId, contexto) {
    try {
      const db = require('../config/database');
      await db.query(
        `UPDATE conversaciones SET metadata = $3::jsonb WHERE id = $1 AND negocio_id = $2`,
        [conversacionId, negocioId, JSON.stringify(contexto)]
      );
    } catch (e) {
      console.error('Error guardando contexto:', e);
    }
  }

  static async limpiarContexto(conversacionId, negocioId) {
    await this.guardarContextoPedido(conversacionId, negocioId, null);
  }

  static async enviarMenu(contexto) {
    const { negocio } = contexto;
    const productos = await Producto.list(negocio.id, { activo: true });

    if (!productos.length) {
      return { texto: '📋Aún no tenemos productos disponibles. ¿Te gustaría que te contactemos cuando tengamos?' };
    }

    const porCategoria = {};
    for (const p of productos) {
      const cat = p.categoria || 'General';
      if (!porCategoria[cat]) porCategoria[cat] = [];
      porCategoria[cat].push(p);
    }

    let mensaje = `🌸 *${negocio.nombre}*\n\n*Catálogo:*\n\n`;
    
    for (const [categoria, items] of Object.entries(porCategoria)) {
      mensaje += `*${categoria}:*\n`;
      for (const p of items) {
        mensaje += `• ${p.nombre} - $${p.precio.toFixed(2)}\n`;
      }
      mensaje += '\n';
    }

    mensaje += '_¿Qué te gustaría pedir?_';
    return { texto: mensaje };
  }

  static async respuestaGeneral(mensaje, contexto) {
    const { negocio } = contexto;
    const msg = mensaje.toLowerCase();
    
    // ¿Más económico?
    if (/econ|más cheap|barato|precio bajo|cuánto|i want something cheaper/i.test(msg)) {
      const productos = await Producto.list(negocio.id, { activo: true });
      if (productos.length > 0) {
        const barato = productos.sort((a, b) => a.precio - b.precio)[0];
        return {
          texto: `Sí, tenemos opciones más económicas. El más barato es:\n\n*${barato.nombre}* - $${barato.precio.toFixed(2)}\n\n¿Te gustaría este?`
        };
      }
    }
    
    return {
      texto: `Gracias por tu mensaje. Para hacer un pedido, dime qué productos quieres (ej: "quiero un ramo de rosas")\n\nO escribe "menú" para ver nuestro catálogo.`
    };
  }

  static async alertarDueno(negocioId, pedido) {
    const negocio = await Negocio.findById(negocioId);
    if (!negocio?.whatsapp_dueno) return;

    let mensaje = `💰 *Nueva venta*\n\n`;
    mensaje += `Pedido: *${pedido.numero_pedido}*\n`;
    mensaje += `Total: *$${pedido.total.toFixed(2)}*\n`;
    mensaje += `\n_Ver en dashboard_`;

    await WhatsAppService.sendMessage(negocio.whatsapp_dueno, mensaje, negocioId);
  }
}

module.exports = AgenteVentas;
