// OttO - AI Service (Niveles 1-4)
// Pyramide: Reglas > NLP ligero > IA local > IA cloud

const config = require('../config');

class AIService {
  // NIVEL 1: Reglas puras (60% de mensajes)
  // Menús, confirmaciones, consultas DB, alertas
  static async nivel1Reglas(mensaje, contexto) {
    const { negocio, cliente, conversacion } = contexto;
    const msgLower = mensaje.toLowerCase().trim();

    // Menú / Catalogo
    if (this.esConsultaMenu(msgLower)) {
      return {
        nivel: 1,
        tipo: 'menu',
        respuesta: await this.generarMenuHTML(negocio)
      };
    }

    // Estado de pedido
    if (this.esConsultaPedido(msgLower)) {
      return {
        nivel: 1,
        tipo: 'consulta_pedido',
        respuesta: await this.consultarEstadoPedido(msgLower, negocio.id)
      };
    }

    // Horario
    if (this.esConsultaHorario(msgLower)) {
      return {
        nivel: 1,
        tipo: 'horario',
        respuesta: this.generarHorarioRespuesta(negocio)
      };
    }

    // Confirmar pedido
    if (this.esConfirmacion(msgLower)) {
      return {
        nivel: 1,
        tipo: 'confirmacion',
        respuesta: await this.procesarConfirmacion(mensaje, negocio.id)
      };
    }

    // Saludo
    if (this.esSaludo(msgLower)) {
      return {
        nivel: 1,
        tipo: 'saludo',
        respuesta: this.generarSaludo(negocio, cliente)
      };
    }

    // Despedida
    if (this.esDespedida(msgLower)) {
      return {
        nivel: 1,
        tipo: 'despedida',
        respuesta: '¡Gracias por contactarnos! Que tengas un excelente día. 👋'
      };
    }

    return null; // No match en nivel 1
  }

  // NIVEL 2: NLP ligero sin IA (25% de mensajes)
  // Palabras clave, patrones simples
  static async nivel2NLP(mensaje, contexto) {
    const msgLower = mensaje.toLowerCase();
    
    // Palabras clave comunes
    const patrones = {
      'reservar': 'reserva',
      'reserva': 'reserva',
      'reservación': 'reserva',
      'reservacion': 'reserva',
      'pedir': 'pedido',
      'ordenar': 'pedido',
      'comprar': 'pedido',
      'delivery': 'pedido',
      'para llevar': 'pedido',
      'envío': 'pedido',
      'envio': 'pedido',
      'domicilio': 'pedido',
      'ubicación': 'ubicacion',
      'ubicacion': 'ubicacion',
      'dirección': 'ubicacion',
      'direccion': 'ubicacion',
      'donde están': 'ubicacion',
      'contacto': 'contacto',
      'whatsapp': 'contacto',
      'teléfono': 'contacto',
      'telefono': 'contacto',
      'precio': 'precios',
      'cuánto': 'precios',
      'cuanto': 'precios',
      'cuesta': 'precios',
      'promocion': 'promocion',
      'promo': 'promocion',
      'oferta': 'promocion',
      'descuento': 'promocion',
    };

    for (const [palabra, tipo] of Object.entries(patrones)) {
      if (msgLower.includes(palabra)) {
        return {
          nivel: 2,
          tipo,
          intenciones: [tipo],
          mensaje_original: mensaje
        };
      }
    }

    // Detectar números de teléfono (posibles pedidos)
    const telefonoMatch = mensaje.match(/\+?[0-9]{9,15}/);
    if (telefonoMatch) {
      return {
        nivel: 2,
        tipo: 'posible_contacto',
        intentions: ['contacto'],
        mensaje_original: mensaje
      };
    }

    // Detectar cantidades (posible pedido)
    const cantidadMatch = mensaje.match(/(\d+)\s*(unidades?|piesas?|uds?|copas?|vasos?|botellas?)/i);
    if (cantidadMatch) {
      return {
        nivel: 2,
        tipo: 'posible_pedido',
        intentions: ['pedido'],
        cantidad_detectada: cantidadMatch[1],
        mensaje_original: mensaje
      };
    }

    return null; // No match en nivel 2
  }

  // NIVEL 3: IA local (12% de mensajes)
  // Llama/Mistral para mensajes ambiguos
  static async nivel3IALocal(mensaje, contexto) {
    if (!config.localAI.enabled) return null;

    try {
      const prompt = this.construirPrompt(mensaje, contexto);
      
      const response = await fetch(config.localAI.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.localAI.model,
          prompt,
          stream: false,
        })
      });

      const data = await response.json();
      
      return {
        nivel: 3,
        tipo: 'ia_local',
        respuesta: data.response,
        modelo: config.localAI.model
      };
    } catch (error) {
      console.error('IA local error:', error);
      return null;
    }
  }

  // NIVEL 4: IA potente (3% de mensajes)
  // Claude/GPT como último recurso
  static async nivel4IAAvanzada(mensaje, contexto) {
    if (!config.cloudAI.apiKey) return null;

    try {
      if (config.cloudAI.provider === 'anthropic') {
        return await this.procesarClaude(mensaje, contexto);
      } else {
        return await this.procesarOpenAI(mensaje, contexto);
      }
    } catch (error) {
      console.error('IA cloud error:', error);
      return null;
    }
  }

  // Procesar mensaje completo (pirámide de decisión)
  static async procesar(mensaje, contexto) {
    // Intentar nivel 1: Reglas
    let resultado = await this.nivel1Reglas(mensaje, contexto);
    if (resultado) return resultado;

    // Intentar nivel 2: NLP ligero
    resultado = await this.nivel2NLP(mensaje, contexto);
    if (resultado) return resultado;

    // Intentar nivel 3: IA local
    resultado = await this.nivel3IALocal(mensaje, contexto);
    if (resultado) return resultado;

    // Intentar nivel 4: IA cloud
    resultado = await this.nivel4IAAvanzada(mensaje, contexto);
    if (resultado) return resultado;

    // Fallback: mensaje de no entendido
    return {
      nivel: 0,
      tipo: 'no_entendido',
      respuesta: 'No entendí tu mensaje. ¿Podrías ser más específico? Por ejemplo:\n- *Quiero ver el menú*\n- *Quiero hacer un pedido*\n- *Quiero hacer una reserva*'
    };
  }

  // ========== HELPERS ==========

  static esConsultaMenu(msg) {
    const patrones = ['menú', 'menu', 'carta', 'productos', 'ver', 'catalogo', 'catálogo'];
    return patrones.some(p => msg.includes(p));
  }

  static esConsultaPedido(msg) {
    const patrones = ['pedido', 'mi orden', 'mi pedido', 'estado', 'progreso', 'ya está', 'ya esta'];
    return patrones.some(p => msg.includes(p));
  }

  static esConsultaHorario(msg) {
    const patrones = ['horario', 'abierto', 'cerrado', 'hora', 'atencion', 'atención'];
    return patrones.some(p => msg.includes(p));
  }

  static esConfirmacion(msg) {
    return msg === 'si' || msg === 'sí' || msg === 'si, ok' || msg === 'confirmo' || msg === 'confirmar';
  }

  static esSaludo(msg) {
    const saludos = ['hola', 'buenos', 'buenas', 'hey', 'hi', 'hello', 'que tal', 'qué tal', 'buen dia', 'buen día'];
    return saludos.some(s => msg.startsWith(s));
  }

  static esDespedida(msg) {
    const despedidas = ['gracias', 'chao', 'adios', 'adiós', 'nos vemos', 'hasta luego', 'bye'];
    return despedidas.some(d => msg.includes(d));
  }

  static async generarMenuHTML(negocio) {
    const Producto = require('../models/producto');
    const productos = await Producto.list(negocio.id, { activo: true });
    
    if (!productos.length) {
      return '¡Hola! Aún no tenemos productos disponibles. Contáctanos directamente para hacer tu pedido.';
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
        const precio = p.precio.toFixed(2);
        mensaje += `• ${p.nombre} - RD$.${precio}`;
        if (p.descripcion) mensaje += `\n  ${p.descripcion}`;
        mensaje += '\n';
      }
      mensaje += '\n';
    }

    mensaje += '\n_¿Qué te gustaría pedir?_';
    return mensaje;
  }

  static async consultarEstadoPedido(mensaje, negocioId) {
    const Pedido = require('../models/pedido');
    
    // Extraer número de pedido del mensaje
    const match = mensaje.match(/[A-Z]{3}[0-9]{6}/i);
    if (match) {
      const pedido = await Pedido.findByNumero(match[0].toUpperCase(), negocioId);
      if (pedido) {
        const estadosEmoji = {
          'nuevo': '🆕',
          'confirmado': '✅',
          'preparando': '👨‍🍳',
          'listo': '📦',
          'entregado': '🎉',
          'cancelado': '❌'
        };
        return `Tu pedido *${pedido.numero_pedido}* está: ${estadosEmoji[pedido.estado]} *${pedido.estado.toUpperCase()}*`;
      }
    }

    return 'Para consultar tu pedido, por favor dime el número de pedido (ej: ORD000001)';
  }

  static generarHorarioRespuesta(negocio) {
    const horario = negocio.horario_atencion || {};
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const diasEsp = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    let mensaje = '🕐 *Horario de atención:*\n\n';
    
    for (let i = 0; i < dias.length; i++) {
      const h = horario[dias[i]];
      if (h?.activo) {
        mensaje += `${diasEsp[i]}: ${h.inicio} - ${h.fin}\n`;
      } else {
        mensaje += `${diasEsp[i]}: Cerrado\n`;
      }
    }

    return mensaje;
  }

  static async generarSaludo(negocio, cliente) {
    const nombre = cliente?.nombre || 'cliente';
    return `¡Hola ${nombre}! 👋\n\nBienvenido a *${negocio.nombre}*\n\n¿En qué puedo ayudarte hoy?`;
  }

  static async procesarConfirmacion(mensaje, negocioId) {
    return 'Entendido. Tu pedido ha sido confirmado. Te notifyaremos cuando esté listo. 👍';
  }

  static construirPrompt(mensaje, contexto) {
    const { negocio, cliente, conversacion } = contexto;
    
    return `Eres el asistente de WhatsApp de ${negocio.nombre}.
Tu personalidad: ${negocio.personalidad_bot || 'Amable y servicial'}

Cliente: ${cliente?.nombre || 'Nuevo cliente'}
Historial reciente: ${conversacion?.ultimo_mensaje || 'Sin historial'}

Cliente dice: "${mensaje}"

Responde de manera natural y concisa. Si no entiendes, pide claridad.`;
  }

  static async procesarClaude(mensaje, contexto) {
    const prompt = this.construirPrompt(mensaje, contexto);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.cloudAI.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.cloudAI.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    
    return {
      nivel: 4,
      tipo: 'ia_cloud',
      respuesta: data.content?.[0]?.text || 'No pude generar una respuesta',
      modelo: config.cloudAI.model
    };
  }

  static async procesarOpenAI(mensaje, contexto) {
    const prompt = this.construirPrompt(mensaje, contexto);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.cloudAI.apiKey}`
      },
      body: JSON.stringify({
        model: config.cloudAI.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300
      })
    });

    const data = await response.json();
    
    return {
      nivel: 4,
      tipo: 'ia_cloud',
      respuesta: data.choices?.[0]?.message?.content || 'No pude generar una respuesta',
      modelo: config.cloudAI.model
    };
  }
}

module.exports = AIService;