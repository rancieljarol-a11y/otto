// OttO - Agente de Documentos
// Genera recibos, cotizaciones PDF
// Plantillas fijas, IA solo para facturas complejas

const Pedido = require('../models/pedido');
const Factura = require('../models/factura');
const Negocio = require('../models/negocio');
const WhatsAppService = require('../services/whatsapp');

class AgenteDocumentos {
  // Generar recibo simple
  static async generarRecibo(pedidoId, negocioId) {
    const pedido = await Pedido.findById(pedidoId, negocioId);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    const negocio = await Negocio.findById(negocioId);
    
    // Generar número correlativo
    const numeroRecibo = await this.generarNumeroRecibo(negocioId);

    // Construir contenido del recibo
    const contenido = this.construirRecibo(negocio, pedido, numeroRecibo);

    return {
      numero: numeroRecibo,
      contenido,
      pedido_id: pedidoId
    };
  }

  // Generar número correlativo de recibo
  static async generarNumeroRecibo(negocioId) {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT COUNT(*) as total FROM facturas 
       WHERE negocio_id = $1 AND tipo_documento = 'recibo'`,
      [negocioId]
    );
    
    const correlativo = parseInt(result.rows[0].total) + 1;
    return `R-${String(correlativo).padStart(6, '0')}`;
  }

  // Construir texto del recibo
  static construirRecibo(negocio, pedido, numero) {
    const fecha = new Date(pedido.fecha_pedido).toLocaleDateString('es-PE');
    
    let texto = `╔═══════════════════════════════╗\n`;
    texto += `║     ${negocio.nombre.toUpperCase().padEnd(28)}║\n`;
    texto += `╚═══════════════════════════════╝\n\n`;
    texto += `📄 *RECIBO*: ${numero}\n`;
    texto += `📅 Fecha: ${fecha}\n`;
    texto += `👤 Cliente: ${pedido.cliente_nombre || 'Cliente'}\n`;
    texto += `📱 Tel: ${pedido.cliente_telefono || 'N/A'}\n\n`;
    texto += `─────────────────────────────────\n`;
    texto += `*DETALLE DEL PEDIDO*\n`;
    texto += `─────────────────────────────────\n\n`;

    const productos = pedido.productos || [];
    for (const p of productos) {
      const nombre = p.nombre.substring(0, 25);
      const cantidad = p.cantidad;
      const precio = p.precio;
      const subtotal = cantidad * precio;
      
      texto += `${cantidad}x ${nombre}\n`;
      texto += `   S/.${precio.toFixed(2)} c/u  S/.${subtotal.toFixed(2)}\n`;
    }

    texto += `\n─────────────────────────────────\n`;
    texto += `Subtotal:    S/.${pedido.subtotal.toFixed(2)}\n`;
    texto += `IGV (18%):   S/.${pedido.igv.toFixed(2)}\n`;
    texto += `─────────────────────────────\n`;
    texto += `*TOTAL:      S/.${pedido.total.toFixed(2)}*\n`;
    texto += `═══════════════════════════════\n\n`;
    
    if (negocio.direccion) {
      texto += `📍 ${negocio.direccion}\n`;
    }
    if (negocio.whatsapp_negocio) {
      texto += `📱 ${negocio.whatsapp_negocio}\n`;
    }
    
    texto += `\n¡Gracias por su preferencia! 🙏`;
    
    return texto;
  }

  // Generar cotización
  static async generarCotizacion(productos, negocioId, datosCliente) {
    const negocio = await Negocio.findById(negocioId);
    
    // Calcular total
    let subtotal = 0;
    for (const p of productos) {
      subtotal += (p.precio * p.cantidad);
    }
    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    const numero = await this.generarNumeroCotizacion(negocioId);
    const validez = 7; // días

    let texto = `╔═══════════════════════════════════╗\n`;
    texto += `║       COTIZACIÓN                 ║\n`;
    texto += `╚═══════════════════════════════════╝\n\n`;
    texto += `📄 *COTIZACIÓN*: ${numero}\n`;
    texto += `📅 Fecha: ${new Date().toLocaleDateString('es-PE')}\n`;
    texto += `⏰ Validez: ${validez} días\n\n`;
    texto += `👤 *Cliente*: ${datosCliente.nombre || 'Cliente'}\n`;
    texto += `📱 Tel: ${datosCliente.telefono || 'N/A'}\n\n`;
    texto += `─────────────────────────────────────\n`;
    texto += `*PRODUCTOS*\n`;
    texto += `─────────────────────────────────────\n\n`;

    for (const p of productos) {
      texto += `${p.cantidad}x ${p.nombre}\n`;
      texto += `   S/.${p.precio.toFixed(2)} c/u  S/.${(p.cantidad * p.precio).toFixed(2)}\n`;
    }

    texto += `\n─────────────────────────────────────\n`;
    texto += `Subtotal:    S/.${subtotal.toFixed(2)}\n`;
    texto += `IGV (18%):   S/.${igv.toFixed(2)}\n`;
    texto += `─────────────────────────────────────\n`;
    texto += `*TOTAL:      S/.${total.toFixed(2)}*\n`;
    texto += `═══════════════════════════════════════\n\n`;
    
    texto += `_Esta cotización tiene validez de ${validez} días_\n`;
    texto += `_Para confirmar, responde "confirmar"_`;

    return { numero, contenido: texto, total };
  }

  // Generar número correlativo de cotización
  static async generarNumeroCotizacion(negocioId) {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT COUNT(*) as total FROM facturas 
       WHERE negocio_id = $1 AND tipo_documento = 'cotizacion'`,
      [negocioId]
    );
    
    const correlativo = parseInt(result.rows[0].total) + 1;
    return `COT-${String(correlativo).padStart(6, '0')}`;
  }

  // Enviar documento por WhatsApp
  static async enviarDocumento(numero, documento, negocioId, tipo = 'recibo') {
    const mensaje = documento.contenido;
    await WhatsAppService.sendMessage(numero, mensaje, negocioId);
    
    console.log(`📄 Documento ${tipo} ${documento.numero} enviado a ${numero}`);
  }

  // Generar factura electrónica (placeholder para Sunat)
  static async generarFactura(pedidoId, negocioId) {
    const pedido = await Pedido.findById(pedidoId, negocioId);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    const negocio = await Negocio.findById(negocioId);
    const numeroFactura = await this.generarNumeroFactura(negocioId);

    // Crear registro de factura
    const factura = await Factura.create({
      numero_correlativo: numeroFactura,
      pedido_id: pedidoId,
      negocio_id: negocioId,
      cliente_id: pedido.cliente_id,
      subtotal: pedido.subtotal,
      igv: pedido.igv,
      total: pedido.total,
      fecha_emision: new Date(),
      fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      estado_pago: 'pendiente'
    });

    return {
      factura_id: factura.id,
      numero: numeroFactura,
      total: pedido.total
    };
  }

  // Generar número de factura
  static async generarNumeroFactura(negocioId) {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT COUNT(*) as total FROM facturas 
       WHERE negocio_id = $1 AND tipo_documento = 'factura'`,
      [negocioId]
    );
    
    const correlativo = parseInt(result.rows[0].total) + 1;
    return `F-${String(correlativo).padStart(8, '0')}`;
  }
}

module.exports = AgenteDocumentos;