// OttO - Sistema Híbrido de Procesamiento
// Lógica primero, IA solo para casos complejos

// ============================================================
// PASO 1: Detector de Complejidad
// ============================================================

class DetectorComplejidad {
  // Palabras clave conocidas (flujos simples)
  static PALABRAS_CLAVE = {
    pedidos: ['quiero', 'necesito', 'pedir', 'orden', 'un ', 'una ', 'para llevar', 'delivery'],
    productos: ['ramo', 'rosa', 'flor', 'caja', 'centro', 'arreglo', 'girasol', 'lirio', 'clavel'],
    consultas: ['precio', 'cuánto', 'cuanto', 'cuesta', 'tienen', 'hay'],
    menu: ['menú', 'menu', 'catalogo', 'catálogo', 'qué tienen', 'que tienen'],
    confirmacion: ['sí', 'si', 'ok', 'confirmar', 'de acuerdo', 'claro', 'perfecto'],
    cancelacion: ['cancelar', 'no', 'nah', 'olvida']
  };

  static esMensajeSimple(texto, contextoPedido = null) {
    const msg = texto.toLowerCase().trim();
    const palabras = msg.split(/\s+/);
    
    // Mensajes muy cortos siempre son simples
    if (palabras.length < 4) return true;
    
    // Mensajes muy largos son complejos
    if (palabras.length > 20) return false;
    
    // Si hay contexto de pedido en progreso, la mayoría de respuestas son simples
    if (contextoPedido?.productos?.length > 0) {
      // Si está esperando dirección y el usuario responde algo largo (más de 30 chars)
      if (contextoPedido.estado === 'esperando_direccion' && msg.length > 30) return false;
      // Si está esperando hora y el usuario responde algo que no parece hora
      if (contextoPedido.estado === 'esperando_hora' && msg.length > 20) return false;
      return true;
    }
    
    // Verificar si contiene palabras clave conocidas
    for (const [categoria, palabrasClave] of Object.entries(this.PALABRAS_CLAVE)) {
      if (palabrasClave.some(p => msg.includes(p))) {
        return true;
      }
    }
    
    // Mensajes que siguen patrones simples conocidos
    const patronesSimples = [
      /^\d+\s+\w+/,                    // "2 rosas"
      /^un\s+\w+/,                      // "un ramo"
      /^una\s+\w+/,                     // "una caja"
      /^[a-záéíóúñ]+\s+\d+\s*$/i,      // "rosa 2"
      /^(hola|buenos|buenas|gracias)$/i, // saludos
      /^\d{1,2}(:\d{2})?\s*(am|pm)?$/i  // "3pm", "15:00"
    ];
    
    for (const patron of patronesSimples) {
      if (patron.test(msg)) return true;
    }
    
    // Si contiene muchas preposiciones/conectores, es complejo
    const conectores = msg.match(/que|y|pero|porque|cuando|donde|quien|cual/g) || [];
    if (conectores.length > 2) return false;
    
    // Si no coincide con ningún patrón conocido, es complejo
    return false;
  }

  static getTipoMensaje(texto) {
    const msg = texto.toLowerCase();
    
    if (/hola|buenos|buenas|hey|hi|que tal/i.test(msg)) return 'saludo';
    if (/menu|catalogo|qué tienen|que tienen/i.test(msg)) return 'menu';
    if (/precio|cuánto|cuanto|cuesta/i.test(msg)) return 'consulta_precio';
    if (/mis pedidos|estado|donde está/i.test(msg)) return 'consulta_pedido';
    if (/quiero|necesito|pedir|un |una /i.test(msg)) return 'pedido';
    
    return 'desconocido';
  }
}

// ============================================================
// PAS0 2: Enrutador Principal
// ============================================================

class EnrutadorMensajes {
  constructor() {
    this.stats = {
      mensajesLogica: 0,
      mensajesIA: 0
    };
  }

  async procesar(mensaje, contexto) {
    const { conversacion } = contexto;
    
    // Cargar contexto del pedido si existe
    const contextoPedido = await this.cargarContexto(conversacion.id, contexto.negocio.id);
    
    // Detectar complejidad
    const esSimple = DetectorComplejidad.esMensajeSimple(mensaje, contextoPedido);
    
    if (esSimple) {
      this.stats.mensajesLogica++;
      return await this.procesarConLogica(mensaje, contexto, contextoPedido);
    } else {
      this.stats.mensajesIA++;
      return await this.procesarConIA(mensaje, contexto, contextoPedido);
    }
  }

  // ============================================================
  // Procesamiento con Lógica (70-80% de los casos)
  // ============================================================
  
  async procesarConLogica(mensaje, contexto, contextoPedido) {
    const AgenteVentas = require('./ventas');
    return await AgenteVentas.procesar(mensaje, contexto, contextoPedido);
  }

  // ============================================================
  // Procesamiento con IA (20-30% de los casos)
  // ============================================================
  
  async procesarConIA(mensaje, contexto, contextoPedido) {
    // La IA solo devuelve estructura, NO respuestas
    const interpretacion = await this.interpretarConIA(mensaje, contexto, contextoPedido);
    
    // El sistema maneja la respuesta
    return await this.generarRespuesta(interpretacion, contexto, contextoPedido);
  }

  async interpretarConIA(mensaje, contexto, contextoPedido) {
    // Prompt simple para que la IA solo interprete, no responda
    const prompt = `Eres un interprete de pedidos. Analiza el mensaje del usuario y devuelve SOLO un JSON con esta estructura:

{
  "intencion": "crear_pedido | consulta | saludar | otro",
  "producto": "nombre del producto o null",
  "direccion": "dirección mencionada o null",
  "hora": "hora de entrega o null", 
  "destinatario": "nombre de quien recibe o null",
  "faltantes": ["direccion", "hora", "producto"]
}

Ejemplos:
- "quiero un ramo de rosas para la calle principal" → {"intencion": "crear_pedido", "producto": "ramo de rosas", "direccion": "calle principal", "hora": null, "destinatario": null, "faltantes": ["hora"]}
- "tienen precios?" → {"intencion": "consulta", "producto": null, "direccion": null, "hora": null, "destinatario": null, "faltantes": []}

Mensaje del usuario: "${mensaje}"

Responde SOLO con el JSON, sin texto adicional:`;

    try {
      // Intentar usar IA local primero
      const { default: config } = require('../config');
      
      if (config.localAi?.enabled) {
        const response = await fetch(`${config.localAi.url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.localAi.model,
            prompt: prompt,
            stream: false
          })
        });
        
        const data = await response.json();
        return JSON.parse(data.response || '{}');
      }
    } catch (e) {
      console.log('IA local no disponible, cayendo a lógica');
    }
    
    // Fallback: usar lógica
    return this.interpretarConLogica(mensaje, contextoPedido);
  }

  interpretarConLogica(mensaje, contextoPedido) {
    const msg = mensaje.toLowerCase();
    
    // Detectar intención básica
    let intencion = 'otro';
    if (/hola|buenos|buenas/i.test(msg)) intencion = 'saludar';
    else if (/precio|cuánto|cuanto|cuesta/i.test(msg)) intencion = 'consulta';
    else if (/quiero|necesito|pedir/i.test(msg)) intencion = 'crear_pedido';
    
    // Extraer producto
    let producto = null;
    if (/ramo/i.test(msg)) producto = 'ramo de rosas';
    else if (/caja/i.test(msg)) producto = 'caja de flores';
    else if (/arreglo/i.test(msg)) producto = 'arreglo floral';
    else if (/centro/i.test(msg)) producto = 'centro de mesa';
    
    // Extraer dirección
    let direccion = null;
    const dirMatch = msg.match(/para(?: la)? calle (.+?)(?=\s*a las|\s*para|$)/i);
    if (dirMatch) direccion = dirMatch[1];
    
    // Extraer hora
    let hora = null;
    const horaMatch = msg.match(/(\d{1,2})\s*(?:pm|am)/i);
    if (horaMatch) {
      let h = parseInt(horaMatch[1]);
      if (/pm/i.test(msg) && h < 12) h += 12;
      hora = `${h}:00`;
    }
    
    // Extraer destinatario
    let destinatario = null;
    const destMatch = msg.match(/para\s+(\w+)/i);
    if (destMatch && !/para las/i.test(msg)) {
      destinatario = destMatch[1];
    }
    
    // Determinar faltantes
    const faltantes = [];
    if (!producto) faltantes.push('producto');
    if (!direccion && contextoPedido?.estado !== 'confirmando') faltantes.push('direccion');
    if (!hora && contextoPedido?.estado !== 'confirmando') faltantes.push('hora');
    
    return { intencion, producto, direccion, hora, destinatario, faltantes };
  }

  async generarRespuesta(interpretacion, contexto, contextoPedido) {
    const { negocio, cliente, conversacion } = contexto;
    const Producto = require('../models/producto');
    
    // Manejar según intención
    if (interpretacion.intencion === 'saludar') {
      return {
        texto: `¡Hola! 👋\n\nBienvenido a *${negocio.nombre}* 🌹\n\n¿En qué puedo ayudarte?\n• Ver catálogo\n• Hacer pedido`
      };
    }
    
    if (interpretacion.intencion === 'consulta') {
      const productos = await Producto.list(negocio.id, { activo: true });
      let msg = `📋 *Catálogo:*\n\n`;
      for (const p of productos.slice(0, 5)) {
        msg += `• ${p.nombre} - $${p.precio}\n`;
      }
      return { texto: msg };
    }
    
    if (interpretacion.intencion === 'crear_pedido') {
      // Buscar producto en BD
      let productos = [];
      if (interpretacion.producto) {
        const todos = await Producto.list(negocio.id, { activo: true });
        productos = todos.filter(p => 
          p.nombre.toLowerCase().includes(interpretacion.producto.toLowerCase())
        );
      }
      
      if (productos.length === 0) {
        return { texto: '¿Qué producto te gustaría pedir? Escribe "menú" para ver opciones.' };
      }
      
      // Crear contexto
      const nuevoContexto = {
        productos: [{
          producto_id: productos[0].id,
          nombre: productos[0].nombre,
          precio: parseFloat(productos[0].precio),
          cantidad: 1
        }],
        direccion: interpretacion.direccion,
        hora_entrega: interpretacion.hora,
        destinatario: interpretacion.destinatario,
        estado: this.determinarEstado(interpretacion)
      };
      
      await this.guardarContexto(conversacion.id, negocio.id, nuevoContexto);
      
      return this.generarConfirmacion(nuevoContexto);
    }
    
    // Si no se entiende, pedir más info
    return { texto: '¿Podrías ser más específico? Ejemplo: "quiero un ramo de rosas para la calle principal a las 3pm"' };
  }

  determinarEstado(interpretacion) {
    if (interpretacion.direccion && interpretacion.hora) return 'confirmando';
    if (interpretacion.direccion) return 'esperando_hora';
    return 'esperando_direccion';
  }

  generarConfirmacion(contexto) {
    const p = contexto.productos[0];
    let msg = `🌸 *Entendido!*\n\n`;
    msg += `• ${p.cantidad}x ${p.nombre} - $${p.precio}\n`;
    msg += `\n*Total: $${p.precio}*\n\n`;
    
    if (contexto.direccion) {
      msg += `📍 *Dirección:* ${contexto.direccion}\n`;
    }
    if (contexto.hora_entrega) {
      msg += `⏰ *Hora:* ${contexto.hora_entrega}\n`;
    }
    
    if (!contexto.direccion) {
      msg += `\n📍 ¿A dónde lo entregamos?`;
    } else if (!contexto.hora_entrega) {
      msg += `\n⏰ ¿Para qué hora?`;
    } else {
      msg += `\n✅ ¿Confirmas el pedido?`;
    }
    
    return { texto: msg };
  }

  // ============================================================
  // Utilidades
  // ============================================================

  async cargarContexto(conversacionId, negocioId) {
    try {
      const db = require('../config/database');
      const result = await db.query(
        `SELECT metadata FROM conversaciones WHERE id = $1 AND negocio_id = $2`,
        [conversacionId, negocioId]
      );
      return result.rows[0]?.metadata || null;
    } catch (e) {
      return null;
    }
  }

  async guardarContexto(conversacionId, negocioId, contexto) {
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

  getStats() {
    const total = this.stats.mensajesLogica + this.stats.mensajesIA;
    const porcentajeIA = total > 0 ? Math.round((this.stats.mensajesIA / total) * 100) : 0;
    
    return {
      logica: this.stats.mensajesLogica,
      ia: this.stats.mensajesIA,
      total,
      porcentajeIA
    };
  }
}

module.exports = { DetectorComplejidad, EnrutadorMensajes };
