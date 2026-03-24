// OttO - PDF Service (Versión Profesional)
// Genera recibos y cotizaciones PDF con diseño profesional

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const config = {
  outputDir: process.env.PDF_OUTPUT_DIR || '/tmp/otto-pdfs'
};

if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

class PDFService {

  /**
   * Generar recibo PDF profesional
   */
  static async generarRecibo(pedido, negocio, cliente) {
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50,
      info: {
        Title: `Recibo ${pedido.numero_pedido}`,
        Author: 'OttO',
        Subject: 'Recibo de Pago'
      }
    });
    
    const filename = `recibo_${pedido.numero_pedido}_${Date.now()}.pdf`;
    const filepath = path.join(config.outputDir, filename);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    // Colores profesionales
    const PRIMARY = '#1E3A5F';      // Azul oscuro profesional
    const SECONDARY = '#64748B';    // Gris
    const ACCENT = '#0EA5E9';       // Azul brillante
    const TEXT = '#1F2937';         // Negro suave
    const LIGHT = '#F8FAFC';         // Fondo muy claro
    const BORDER = '#E2E8F0';        // Borde claro
    
    // === ENCABEZADO ===
    // Fondo del encabezado
    doc.rect(0, 0, 595, 120).fill(PRIMARY);
    
    // Logo (si existe) o diseño alternativo
    if (negocio.logo) {
      try {
        doc.image(negocio.logo, 50, 30, { width: 50 });
      } catch (e) {
        // Si no carga el logo, usar iniciales
        doc.fontSize(28).fillColor('#FFFFFF').text(negocio.nombre.substring(0, 2).toUpperCase(), 50, 40);
      }
    }
    
    // Nombre del negocio
    doc.fontSize(24).fillColor('#FFFFFF').text(negocio.nombre, 50, 45, { align: 'center' });
    
    // Información del negocio
    doc.fontSize(10).fillColor('#CBD5E1').text('WhatsApp: ' + (negocio.whatsapp_negocio || 'N/A'), 50, 75, { align: 'center' });
    if (negocio.direccion) {
      doc.text(negocio.direccion, 50, 88, { align: 'center' });
    }
    
    // === TÍTULO DEL DOCUMENTO ===
    doc.moveDown(2);
    doc.fontSize(14).fillColor(ACCENT).text('RECIBO DE PAGO', { align: 'center' });
    doc.moveDown(0.5);
    
    // Línea decorativa
    doc.strokeColor(ACCENT).lineWidth(2).moveTo(200, doc.y).lineTo(395, doc.y).stroke();
    doc.moveDown(1.5);
    
    // === INFORMACIÓN DEL RECIBO ===
    // Fecha y número
    const fecha = new Date(pedido.fecha_pedido || new Date()).toLocaleDateString('es-DO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    
    doc.fontSize(10).fillColor(TEXT);
    doc.text('Fecha: ' + fecha, 50);
    doc.text('Recibo #: ' + pedido.numero_pedido, 350, doc.y - 14, { align: 'right' });
    doc.moveDown(1);
    
    // === DATOS DEL CLIENTE ===
    doc.rect(50, doc.y, 495, 60).fillAndStroke(LIGHT, BORDER);
    doc.moveDown(0.5);
    
    doc.fontSize(11).fillColor(PRIMARY).text('DATOS DEL CLIENTE', 60);
    doc.moveDown(0.3);
    
    doc.fontSize(10).fillColor(TEXT);
    doc.text('Cliente: ' + (cliente?.nombre || 'Cliente General'), 60);
    doc.text('Teléfono: ' + (cliente?.numero_whatsapp || 'N/A'), 300);
    doc.moveDown(1);
    
    // === TABLA DE PRODUCTOS ===
    // Encabezado de tabla
    const tableTop = doc.y;
    doc.rect(50, tableTop, 495, 25).fill(PRIMARY);
    
    doc.fontSize(10).fillColor('#FFFFFF').text('CANT.', 55, tableTop + 7);
    doc.text('DESCRIPCIÓN', 100, tableTop + 7);
    doc.text('P.UNIT.', 380, tableTop + 7, { width: 70, align: 'right' });
    doc.text('IMPORTE', 460, tableTop + 7, { width: 75, align: 'right' });
    
    doc.moveDown(1.5);
    
    // Productos
    const productos = typeof pedido.productos === 'string' 
      ? JSON.parse(pedido.productos) 
      : pedido.productos;
    
    let y = tableTop + 30;
    let subtotal = 0;
    
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      const cantidad = p.cantidad || 1;
      const precio = parseFloat(p.precio || 0);
      const importe = precio * cantidad;
      subtotal += importe;
      
      // Alternar colores de fila
      if (i % 2 === 0) {
        doc.rect(50, y, 495, 18).fill(LIGHT);
      }
      
      doc.fontSize(10).fillColor(TEXT);
      doc.text(cantidad.toString(), 55, y + 4);
      doc.text((p.nombre || 'Producto').substring(0, 35), 100, y + 4);
      doc.text('RD$ ' + precio.toFixed(2), 380, y + 4, { width: 70, align: 'right' });
      doc.text('RD$ ' + importe.toFixed(2), 460, y + 4, { width: 75, align: 'right' });
      
      y += 18;
    }
    
    // Línea final de tabla
    doc.strokeColor(BORDER).lineWidth(1).moveTo(50, y).lineTo(545, y).stroke();
    doc.moveDown(1);
    
    // === TOTALES ===
    const total = parseFloat(pedido.total || subtotal);
    const startX = 350;
    
    doc.fontSize(10).fillColor(SECONDARY).text('Subtotal:', startX, doc.y);
    doc.text('RD$ ' + subtotal.toFixed(2), 460, doc.y - 14, { width: 75, align: 'right' });
    doc.moveDown(0.8);
    
    // Línea separadora
    doc.strokeColor(PRIMARY).lineWidth(1).moveTo(startX, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(0.5);
    
    // TOTAL DESTACADO
    doc.fontSize(14).fillColor(PRIMARY).text('TOTAL A PAGAR:', startX, doc.y);
    doc.fontSize(16).fillColor(ACCENT).text('RD$ ' + total.toFixed(2), 380, doc.y - 3, { width: 100, align: 'right' });
    doc.moveDown(1.5);
    
    // === MÉTODO DE PAGO ===
    if (pedido.metodo_pago) {
      doc.rect(50, doc.y, 495, 35).fillAndStroke(LIGHT, BORDER);
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor(PRIMARY).text('Método de pago: ', 60, doc.y);
      doc.fillColor(TEXT).text(pedido.metodo_pago.toUpperCase());
      doc.moveDown(1.5);
    }
    
    // === PIE DE PÁGINA ===
    const footerY = 700;
    
    // Línea decorativa
    doc.strokeColor(BORDER).lineWidth(2).moveTo(50, footerY).lineTo(545, footerY);
    doc.moveDown(0.5);
    
    doc.fontSize(9).fillColor(SECONDARY);
    doc.text('¡Gracias por su preferencia!', { align: 'center' });
    doc.text('Este documento es un comprobante de pago válido', { align: 'center' });
    doc.text('Generado por OttO - www.otto.app', { align: 'center' });
    
    // Finalizar
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve({ filepath, filename }));
      stream.on('error', reject);
    });
  }

  /**
   * Generar cotización PDF profesional
   */
  static async generarCotizacion(cotizacion, negocio, cliente) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `cotizacion_${cotizacion.numero}_${Date.now()}.pdf`;
    const filepath = path.join(config.outputDir, filename);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    const PRIMARY = '#1E3A5F';
    const SECONDARY = '#64748B';
    const ACCENT = '#0EA5E9';
    const TEXT = '#1F2937';
    const LIGHT = '#F8FAFC';
    const BORDER = '#E2E8F0';
    
    // === ENCABEZADO ===
    doc.rect(0, 0, 595, 100).fill(PRIMARY);
    doc.fontSize(22).fillColor('#FFFFFF').text(negocio.nombre, 50, 35, { align: 'center' });
    doc.fontSize(10).fillColor('#CBD5E1').text('COTIZACIÓN', 50, 60, { align: 'center' });
    
    doc.moveDown(2);
    
    // Info cotización
    const fecha = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fontSize(10).fillColor(TEXT);
    doc.text('Fecha: ' + fecha, 50);
    doc.text('Cotización #: ' + cotizacion.numero, 350, doc.y - 14, { align: 'right' });
    doc.text('Válida hasta: ' + cotizacion.validez + ' días', 350, doc.y - 14, { align: 'right' });
    doc.moveDown(1);
    
    // Cliente
    doc.rect(50, doc.y, 495, 50).fillAndStroke(LIGHT, BORDER);
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(PRIMARY).text('CLIENTE:', 60, doc.y);
    doc.fontSize(10).fillColor(TEXT);
    doc.text('Nombre: ' + (cliente?.nombre || 'Cliente'), 60, doc.y + 15);
    doc.text('Teléfono: ' + (cliente?.telefono || 'N/A'), 300, doc.y + 15);
    doc.moveDown(2);
    
    // Tabla productos
    const tableTop = doc.y;
    doc.rect(50, tableTop, 495, 25).fill(PRIMARY);
    doc.fontSize(10).fillColor('#FFFFFF').text('CANT.', 55, tableTop + 7);
    doc.text('DESCRIPCIÓN', 100, tableTop + 7);
    doc.text('P.UNIT.', 380, tableTop + 7, { width: 70, align: 'right' });
    doc.text('IMPORTE', 460, tableTop + 7, { width: 75, align: 'right' });
    doc.moveDown(1.5);
    
    let y = tableTop + 30;
    let subtotal = 0;
    
    for (let i = 0; i < cotizacion.productos.length; i++) {
      const p = cotizacion.productos[i];
      const importe = p.precio * p.cantidad;
      subtotal += importe;
      
      if (i % 2 === 0) doc.rect(50, y, 495, 18).fill(LIGHT);
      
      doc.fontSize(10).fillColor(TEXT);
      doc.text(p.cantidad.toString(), 55, y + 4);
      doc.text(p.nombre.substring(0, 35), 100, y + 4);
      doc.text('RD$ ' + p.precio.toFixed(2), 380, y + 4, { width: 70, align: 'right' });
      doc.text('RD$ ' + importe.toFixed(2), 460, y + 4, { width: 75, align: 'right' });
      y += 18;
    }
    
    doc.moveDown(1);
    doc.strokeColor(BORDER).lineWidth(1).moveTo(50, y).lineTo(545, y).stroke();
    doc.moveDown(1);
    
    // Total
    const total = subtotal;
    doc.fontSize(14).fillColor(PRIMARY).text('TOTAL:', 350, doc.y);
    doc.fontSize(16).fillColor(ACCENT).text('RD$ ' + total.toFixed(2), 400, doc.y - 3, { width: 100, align: 'right' });
    doc.moveDown(2);
    
    // Footer
    doc.fontSize(9).fillColor(SECONDARY);
    doc.text('Esta cotización tiene validez de ' + cotizacion.validez + ' días', { align: 'center' });
    doc.text('Para confirmar, responda "confirmar" a esta cotización', { align: 'center' });
    doc.text('Generado por OttO - www.otto.app', { align: 'center' });
    
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve({ filepath, filename }));
      stream.on('error', reject);
    });
  }
}

module.exports = PDFService;