// OttO - AI Service (Niveles 1-4)
// Version completa SIN APIs externas
//later se puede agregar Ollama o DeepSeek

const db = require('../config/database');

class AIService {
  // MAIN: Procesar mensaje entrante
  static async procesarMensaje(mensaje, contexto) {
    const msgLower = mensaje.toLowerCase().trim();
    
    // Nivel 1: Reglas puras (优先)
    const respuestaN1 = await this.nivel1Reglas(msgLower, contexto);
    if (respuestaN1) return respuestaN1;

    // Nivel 2: Patrones simples
    const respuestaN2 = await this.nivel2NLP(msgLower, contexto);
    if (respuestaN2) return respuestaN2;

    // Nivel 3: Busqueda en productos
    const respuestaN3 = await this.nivel3Productos(msgLower, contexto);
    if (respuestaN3) return respuestaN3;

    // Nivel 4: No entiendo
    return {
      nivel: 4,
      tipo: 'no_entiendo',
      respuesta: this.generarNoEntiendo(contexto)
    };
  }

  // ============================================================================
  // NIVEL 1: Reglas puras (60% de mensajes)
  // ============================================================================
  static async nivel1Reglas(msgLower, contexto) {
    const { negocio, cliente } = contexto;

    // SALUDOS
    if (this.esSaludo(msgLower)) {
      return {
        nivel: 1,
        tipo: 'saludo',
        respuesta: this.generarSaludo(negocio, cliente)
      };
    }

    // CONSULTAS DE MENU
    if (this.esConsultaMenu(msgLower)) {
      return {
        nivel: 1,
        tipo: 'menu',
        respuesta: await this.generarMenu(negocio.id)
      };
    }

    // CONSULTAS DE PRECIOS
    if (this.esConsultaPrecio(msgLower)) {
      return {
        nivel: 1,
        tipo: 'precios',
        respuesta: await this.generarMenu(negocio.id)
      };
    }

    // ESTADO DE PEDIDO
    if (this.esConsultaPedido(msgLower)) {
      return {
        nivel: 1,
        tipo: 'estado_pedido',
        respuesta: await this.consultarEstadoPedido(msgLower, negocio.id)
      };
    }

    // HORARIO
    if (this.esConsultaHorario(msgLower)) {
      return {
        nivel: 1,
        tipo: 'horario',
        respuesta: this.generarHorario(negocio)
      };
    }

    // UBICACION
    if (this.esUbicacion(msgLower)) {
      return {
        nivel: 1,
        tipo: 'ubicacion',
        respuesta: this.generarUbicacion(negocio)
      };
    }

    // CONFIRMAR PEDIDO
    if (this.esConfirmacion(msgLower)) {
      return {
        nivel: 1,
        tipo: 'confirmacion',
        respuesta: '✅ Tu pedido ha sido confirmado. Te avisaremos cuando este listo para recoger o enviar. 🚀'
      };
    }

    // CANCELAR
    if (this.esCancelar(msgLower)) {
      return {
        nivel: 1,
        tipo: 'cancelar',
        respuesta: 'Entendido. Tu pedido ha sido cancelado. Si necesitas algo mas, escribenos. 👋'
      };
    }

    return null;
  }

  // ============================================================================
  // NIVEL 2: NLP ligero (25% de mensajes)
  // ============================================================================
  static async nivel2NLP(msgLower, contexto) {
    const { negocio } = contexto;

    const patrones = [
      { palabras: ['pedir', 'ordenar', 'comprar', 'quiero', 'necesito'], tipo: 'hacer_pedido' },
      { palabras: ['domicilio', 'delivery', 'envio', 'enviar', 'a casa'], tipo: 'domicilio' },
      { palabras: ['recoger', 'retiro', 'pasarlo a buscar', 'voy yo'], tipo: 'recoger' },
      { palabras: ['pagar', 'pago', 'transferencia', 'efectivo'], tipo: 'pago' },
      { palabras: ['gracias', 'thank'], tipo: 'agradecimiento' },
    ];

    for (const p of patrones) {
      if (p.palabras.some(pal => msgLower.includes(pal))) {
        return {
          nivel: 2,
          tipo: p.tipo,
          respuesta: this.generarRespuestaPorTipo(p.tipo, negocio)
        };
      }
    }

    return null;
  }

  // ============================================================================
  // NIVEL 3: Busqueda en productos
  // ============================================================================
  static async nivel3Productos(msgLower, contexto) {
    const { negocio } = contexto;
    
    try {
      const result = await db.query(
        `SELECT nombre, precio, descripcion FROM productos 
         WHERE negocio_id = $1 AND activo = true AND (
           LOWER(nombre) LIKE $2 OR LOWER(descripcion) LIKE $2
         ) LIMIT 5`,
        [negocio.id, `%${msgLower}%`]
      );

      if (result.rows.length > 0) {
        let respuesta = '📋 Estos son los productos que encontre:\n\n';
        for (const p of result.rows) {
          respuesta += `• ${p.nombre}: $${p.precio}\n`;
        }
        respuesta += '\n¿Queres pedir alguno? Solo decilo y te lo ago! 😊';
        
        return {
          nivel: 3,
          tipo: 'busqueda_productos',
          respuesta
        };
      }
    } catch (err) {
      console.error('Error buscando productos:', err);
    }

    return null;
  }

  // ============================================================================
  // DETECTORES DE PATRONES
  // ============================================================================
  static esSaludo(msg) {
    const saludos = ['hola', 'buenos', 'buenas', 'hello', 'hi', 'hey', 'que tal'];
    return saludos.some(s => msg.includes(s));
  }

  static esConsultaMenu(msg) {
    const menu = ['menu', 'catalogo', 'productos', 'tienen', 'que venden'];
    return menu.some(m => msg.includes(m));
  }

  static esConsultaPrecio(msg) {
    const precio = ['precio', 'cuesta', 'cuanto', 'vale'];
    return precio.some(p => msg.includes(p));
  }

  static esConsultaPedido(msg) {
    const pedido = ['mi pedido', 'estado', 'ya esta', 'listo'];
    return pedido.some(p => msg.includes(p));
  }

  static esConsultaHorario(msg) {
    return msg.includes('horario') || msg.includes('abren') || msg.includes('hora');
  }

  static esUbicacion(msg) {
    return msg.includes('donde') || msg.includes('ubicacion') || msg.includes('direccion');
  }

  static esConfirmacion(msg) {
    return msg.includes('si') || msg.includes('ok') || msg.includes('confirmo');
  }

  static esCancelar(msg) {
    return msg.includes('cancelar') || msg.includes('no quiero');
  }

  // ============================================================================
  // GENERADORES DE RESPUESTAS
  // ============================================================================
  static generarSaludo(negocio, cliente) {
    const nombre = cliente?.nombre || 'amigo';
    return `¡Hola ${nombre}! 👋\n\nBienvenido a *${negocio.nombre}* 🎉\n\n¿En que puedo ayudarte hoy?\n\nPuedo mostrarte nuestro 📋 *menu*, ayudarte con un 🛒 *pedido*, o responder tus preguntas.`;
  }

  static async generarMenu(negocioId) {
    try {
      const result = await db.query(
        `SELECT nombre, precio, descripcion, categoria FROM productos 
         WHERE negocio_id = $1 AND activo = true ORDER BY categoria, nombre LIMIT 20`,
        [negocioId]
      );

      if (result.rows.length === 0) {
        return '😕Aún no tenemos productos en el catalogo. ¡Pronto los tendremos!';
      }

      let mensaje = '📋 *MENU* 📋\n\n';
      let categoriaActual = '';
      
      for (const p of result.rows) {
        if (p.categoria !== categoriaActual) {
          categoriaActual = p.categoria;
          mensaje += `\n🏷️ *${this.capitalize(categoriaActual)}*\n`;
        }
        mensaje += `• ${p.nombre}: $${p.precio}\n`;
      }

      mensaje += '\n💬 ¿Queres pedir algo? Solo decilo y te lo ago!';
      
      return mensaje;
    } catch (err) {
      console.error('Error generando menu:', err);
      return '😕Tuve un problema cargando el menu.';
    }
  }

  static generarHorario(negocio) {
    const hora = negocio.horario_apertura || '9:00 AM';
    const horaCierra = negocio.horario_cierre || '9:00 PM';
    return `🕐 *Horarios* 🕐\n\n*${negocio.nombre}*\n📍 ${hora} a ${horaCierra}\n\n¿Necesitas algo mas?`;
  }

  static generarUbicacion(negocio) {
    let respuesta = '📍 *Ubicacion* 📍\n\n';
    respuesta += `*${negocio.nombre}*\n`;
    if (negocio.direccion) respuesta += `📌 ${negocio.direccion}\n`;
    if (negocio.ciudad) respuesta += `🏙️ ${negocio.ciudad}\n`;
    return respuesta + '\n¿Necesitas mas ayuda?';
  }

  static async consultarEstadoPedido(msg, negocioId) {
    try {
      const result = await db.query(
        `SELECT id, estado, created_at FROM pedidos 
         WHERE negocio_id = $1 ORDER BY created_at DESC LIMIT 3`,
        [negocioId]
      );

      if (result.rows.length === 0) {
        return '😕No tenes pedidos recientes. ¿Queres hacer uno nuevo?';
      }

      let mensaje = '📦 *Tus pedidos recientes:*\n\n';
      for (const p of result.rows) {
        const estado = this.getEmojiEstado(p.estado);
        mensaje += `${estado} *${p.estado}*\n`;
      }
      return mensaje;
    } catch (err) {
      return '😕No pude consultar tus pedidos.';
    }
  }

  static generarRespuestaPorTipo(tipo, negocio) {
    const respuestas = {
      'hacer_pedido': `🛒 ¡Perfecto! Decime que productos queres y cuanto.\n\nTambien podes ver nuestro 📋 *menu* primero.`,
      'domicilio': `🚚 ¡Perfecto!Tenemos delivery.\n\n📍 Indicanos tu direccion y te cotizamos el envio.\n\n¿Que productos queres?`,
      'recoger': `🏃 ¡Perfecto!Podes pasar a recoger.\n\n⏱️ Tiempo estimado: 15-25 minutos.\n\n¿Que productos queres?`,
      'pago': `💳 *Medios de pago aceptados:*\n\n• Efectivo\n• Transferencia\n\n¿Tenes alguna preferencia?`,
      'agradecimiento': `😊 ¡De nada! Estamos para ayudarte.\n\n¿Necesitas algo mas?`,
    };
    return respuestas[tipo] || '¡Entendido! ¿En que mas puedo ayudarte?';
  }

  static generarNoEntiendo(contexto) {
    return `😕 No entendi bien. ¿Podrias repetirlo?\n\n*Te puedo ayudar con:*\n• 📋 Ver nuestro menu\n• 🛒 Hacer un pedido\n• 📦 Consultar estado\n\n¿Qué necesitas?`;
  }

  static getEmojiEstado(estado) {
    const estados = { 'pendiente': '⏳', 'confirmado': '✅', 'preparando': '👨‍🍳', 'listo': '🎉', 'entregado': '📦', 'cancelado': '❌' };
    return estados[estado?.toLowerCase()] || '📦';
  }

  static capitalize(texto) {
    return texto?.charAt(0).toUpperCase() + texto?.slice(1) || '';
  }
}

module.exports = AIService;
