// OttO - Agente de Cobros
// BACKGROUND: Corre diariamente
// 100% automatización, cero IA

const Factura = require('../models/factura');
const Cliente = require('../models/cliente');
const Negocio = require('../models/negocio');
const WhatsAppService = require('../services/whatsapp');

class AgenteCobros {
  // Ejecutar recordatorios de facturas vencidas
  static async ejecutar() {
    console.log('💰 AgenteCobros: Iniciando...');
    
    const resultados = {
      negocios_procesados: 0,
      recordatorios_enviados: 0,
      facturas_vencidas: 0,
      errores: []
    };

    try {
      // Obtener todos los negocios activos
      const negocios = await Negocio.list({ estado: 'activo' });
      
      for (const negocio of negocios) {
        try {
          await this.procesarNegocio(negocio, resultados);
          resultados.negocios_procesados++;
        } catch (error) {
          resultados.errores.push({ negocio: negocio.id, error: error.message });
        }
      }

      console.log('💰 AgenteCobros: Completado', resultados);
      return resultados;

    } catch (error) {
      console.error('💰 AgenteCobros: Error fatal:', error);
      return resultados;
    }
  }

  // Procesar un negocio específico
  static async procesarNegocio(negocio, resultados) {
    const hoy = new Date();
    
    // Obtener facturas pendientes y vencidas
    const facturas = await Factura.list(negocio.id, { 
      estado: 'pendiente',
      limit: 100 
    });

    for (const factura of facturas) {
      const fechaVencimiento = new Date(factura.fecha_vencimiento);
      
      // Verificar si está vencida
      if (fechaVencimiento < hoy) {
        resultados.facturas_vencidas++;
        await this.enviarRecordatorioVencido(negocio, factura, resultados);
      }
      // Verificar si está por vencer (próximos 3 días)
      else if (this.diasEntre(hoy, fechaVencimiento) <= 3) {
        await this.enviarRecordatorioPorVencer(negocio, factura, resultados);
      }
    }
  }

  // Enviar recordatorio de factura vencida
  static async enviarRecordatorioVencido(negocio, factura, resultados) {
    const cliente = await Cliente.findById(factura.cliente_id, negocio.id);
    if (!cliente || !cliente.numero_whatsapp) return;

    // Determinar tono según configuración del negocio
    const tono = negocio.tono_cobros || 'formal';
    const mensaje = this.generarMensajeVencido(factura, tono);

    try {
      await WhatsAppService.sendMessage(cliente.numero_whatsapp, mensaje, negocio.id);
      resultados.recordatorios_enviados++;
      
      // Actualizar contador de recordatorios
      await Factura.update(factura.id, negocio.id, {
        recordatorios_enviados: (factura.recordatorios_enviados || 0) + 1
      });

      console.log(`💰 Recordatorio enviado a ${cliente.numero_whatsapp}: factura ${factura.numero_correlativo} vencida`);
    } catch (error) {
      console.error(`Error enviando recordatorio a ${cliente.numero_whatsapp}:`, error);
    }
  }

  // Enviar recordatorio de factura por vencer
  static async enviarRecordatorioPorVencer(negocio, factura, resultados) {
    const cliente = await Cliente.findById(factura.cliente_id, negocio.id);
    if (!cliente || !cliente.numero_whatsapp) return;

    const diasRestantes = this.diasEntre(new Date(), new Date(factura.fecha_vencimiento));
    const mensaje = this.generarMensajePorVencer(factura, diasRestantes);

    try {
      await WhatsAppService.sendMessage(cliente.numero_whatsapp, mensaje, negocio.id);
      resultados.recordatorios_enviados++;
    } catch (error) {
      console.error(`Error enviando recordatorio a ${cliente.numero_whatsapp}:`, error);
    }
  }

  // Generar mensaje para factura vencida
  static generarMensajeVencido(factura, tono) {
    const mensajes = {
      formal: `Estimado cliente,\n\nLe informamos que la factura *${factura.numero_correlativo}* por RD$${factura.total.toFixed(2)} se encuentra vencida.\n\nPor favor, regularice su pago a la brevedad.\n\nSaludos cordialmente,\n*${factura.negocio_nombre}*`,
      
      amigable: `Hola 👋\n\nTe recordamos que tienes una factura pendiente de *RD$${factura.total.toFixed(2)}* que ya venció.\n\n¿Podrías coordinar el pago? ¡Gracias! 🙏`,
      
      urgente: `⚠️ *Recordatorio importante*\n\nTu factura *${factura.numero_correlativo}* por RD$${factura.total.toFixed(2)} está vencida.\n\nPor favor, contactanos lo antes posible para regularizar.`
    };

    return mensajes[tono] || mensajes.amigable;
  }

  // Generar mensaje para factura por vencer
  static generarMensajePorVencer(factura, diasRestantes) {
    return `📢 *Recordatorio*\n\nTu factura *${factura.numero_correlativo}* vence en *${diasRestantes} días*.\n\nMonto: RD$${factura.total.toFixed(2)}\n\n¿Necesitas coordinar el pago?`;
  }

  // Calcular días entre dos fechas
  static diasEntre(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  }

  // Configurar tono de cobros del negocio
  static async configurarTono(negocioId, tono) {
    const db = require('../config/database');
    await db.query(
      `UPDATE negocios SET tono_cobros = $1 WHERE id = $2`,
      [tono, negocioId]
    );
  }
}

module.exports = AgenteCobros;