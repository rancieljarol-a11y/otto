// OttO - Normalizador con Dataset de Entrenamiento
// Usa patrones del dataset para mejor detección

const nlp = require('compromise');
const DATASET = require('./dataset-entrenamiento');

// Crear regex patterns desde el dataset
const PATTERNS = {
  saludos: new RegExp(DATASET.saludos.map(s => s.toLowerCase()).join('|'), 'i'),
  catalogo: new RegExp(DATASET.catalogo.map(s => s.toLowerCase()).join('|'), 'i'),
  pedido: new RegExp(DATASET.pedido.map(s => s.toLowerCase()).join('|'), 'i'),
  productos: new RegExp(DATASET.productos.map(s => s.toLowerCase()).join('|'), 'i'),
  direcciones: new RegExp(DATASET.direcciones.map(s => s.toLowerCase()).join('|'), 'i'),
  horas: new RegExp(DATASET.horas.map(s => s.toLowerCase()).join('|'), 'i'),
  destinatarios: new RegExp(DATASET.destinatarios.map(s => s.toLowerCase()).join('|'), 'i'),
  confirmacion: new RegExp(DATASET.confirmacion.map(s => s.toLowerCase()).join('|'), 'i'),
  cancelacion: new RegExp(DATASET.cancelacion.map(s => s.toLowerCase()).join('|'), 'i')
};

class NormalizadorIntencion {
  constructor() {
    this.stats = { deLogica: 0, deIA: 0, intenciones: {} };
  }

  preprocess(mensaje) {
    let msg = mensaje.toLowerCase();
    // Solo correcciones específicas de errores ortográficos comunes
    msg = msg.replace(/quiro/gi, 'quiero')
             .replace(/kiero/gi, 'quiero')
             .replace(/ramoo/gi, 'ramo')
             .replace(/caxa/gi, 'caja')
             .replace(/arregloo/gi, 'arreglo')
             .replace(/flore/gi, 'flor')
             .replace(/rose/gi, 'rosa')
             .replace(/soros/gi, 'rosa');
    return msg;
  }

  extraerDatosCompletos(mensaje) {
    let msg = this.preprocess(mensaje);
    const datos = {};

    // Producto
    if (/ramo/i.test(msg)) datos.producto = 'Ramo de Rosas';
    else if (/caja/i.test(msg)) datos.producto = 'Caja de Flores';
    else if (/arreglo/i.test(msg)) datos.producto = 'Arreglo Floral';
    else if (/centro/i.test(msg)) datos.producto = 'Centro de Mesa';
    else if (/flor/i.test(msg)) datos.producto = 'Caja de Flores';
    else if (/detalle/i.test(msg)) datos.producto = 'Arreglo Floral';
    else if (/sorpresa/i.test(msg)) datos.producto = 'Arreglo Floral';

    // Cantidad
    const qtyMatch = msg.match(/(\d+)\s*(?:ramos?|cajas?|arreglos?|flores?)/i);
    if (qtyMatch) datos.cantidad = parseInt(qtyMatch[1]);

    // Dirección
    if (PATTERNS.direcciones.test(msg)) {
      const match = msg.match(/(calle|avenida|barrio|la sabina|el cercado|las acacias)[^\s,]*/i);
      if (match) datos.direccion = match[0];
    }

    // Hora
    if (PATTERNS.horas.test(msg)) {
      const match = msg.match(/(\d{1,2})\s*(?:pm|am)?/i);
      if (match) {
        let h = parseInt(match[1]);
        if (/pm|tarde/i.test(msg) && h < 12) h += 12;
        datos.hora = `${h.toString().padStart(2, '0')}:00`;
      }
    }

    // Destinatario
    if (PATTERNS.destinatarios.test(msg)) {
      const match = msg.match(/para\s+(\w+)/i);
      if (match && match[1].length > 2) datos.destinatario = match[1];
    }

    return datos;
  }

  detectarIntencion(mensaje, contextoPedido = null) {
    let msg = this.preprocess(mensaje);

    // Si hay contexto de pedido
    if (contextoPedido?.productos?.length > 0) {
      const estado = contextoPedido.estado;
      if (estado === 'esperando_direccion') return msg.length > 3 ? 'dar_direccion' : 'desconocido';
      if (estado === 'esperando_hora') return /^\d/.test(msg) ? 'dar_hora' : 'desconocido';
      if (estado === 'confirmando') return PATTERNS.confirmacion.test(msg) ? 'confirmar_pedido' : 'confirmar_pedido';
    }

    // Datos completos = pedido
    const datos = this.extraerDatosCompletos(mensaje);
    if (datos.producto && (datos.direccion || datos.hora)) return 'crear_pedido';

    // Detectar saludos - primero los más comunes
    if (/^hola$|^buenos?|^que tal$|^hey$|^holi$|^buen/i.test(msg) || 
        /buenos dias|buenas dias|buen dia|buen dia|q tal|que tal/i.test(msg)) {
      return 'saludar';
    }

    // Por categorías
    if (PATTERNS.catalogo.test(msg)) return 'ver_menu';
    if (/precio|cuánto|cuesta/i.test(msg)) return 'consultar_precio';
    if (PATTERNS.cancelacion.test(msg)) return 'cancelar';
    if (PATTERNS.pedido.test(msg)) return 'crear_pedido';
    if (PATTERNS.productos.test(msg)) return 'crear_pedido';
    if (PATTERNS.confirmacion.test(msg)) return 'confirmar_pedido';

    return 'desconocido';
  }

  normalizar(respuesta, origen, mensajeOriginal, contextoPedido = null) {
    if (origen === 'logica') this.stats.deLogica++;
    else this.stats.deIA++;

    const datos = this.extraerDatosCompletos(mensajeOriginal);

    if (typeof respuesta === 'string') {
      const intencion = this.detectarIntencion(mensajeOriginal, contextoPedido);
      return this.crearSalida(intencion, datos, origen);
    }

    if (respuesta.intencion && respuesta.datos) {
      respuesta.datos = { ...datos, ...respuesta.datos };
      return respuesta;
    }

    return this.desdeObjeto(respuesta, mensajeOriginal);
  }

  desdeObjeto(obj, mensajeOriginal) {
    const datos = this.extraerDatosCompletos(mensajeOriginal);
    return this.crearSalida(obj.intencion || 'desconocido', { ...datos, ...obj }, 'ia');
  }

  crearSalida(intencion, datos, origen) {
    this.stats.intenciones[intencion] = (this.stats.intenciones[intencion] || 0) + 1;
    return { intencion, datos, _metadata: { origen, timestamp: new Date().toISOString() } };
  }

  getStats() { return { ...this.stats }; }
}

module.exports = { NormalizadorIntencion };
