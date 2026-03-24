// OttO - Agente de Memoria
// BACKGROUND: Corre diariamente
// 100% automatización programada, cero IA

const Cliente = require('../models/cliente');
const Negocio = require('../models/negocio');
const WhatsAppService = require('../services/whatsapp');

class AgenteMemoria {
  // Ejecutar recordatorios diarios
  static async ejecutar() {
    console.log('🤖 AgenteMemoria: Iniciando...');
    
    const resultados = {
      negocios_procesados: 0,
      recordatorios_enviados: 0,
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

      console.log('🤖 AgenteMemoria: Completado', resultados);
      return resultados;

    } catch (error) {
      console.error('🤖 AgenteMemoria: Error fatal:', error);
      return resultados;
    }
  }

  // Procesar un negocio específico
  static async procesarNegocio(negocio, resultados) {
    const clientes = await Cliente.list(negocio.id, { limit: 100 });
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    for (const cliente of clientes) {
      // Verificar fechas especiales
      const fechas = cliente.fechas_especiales || [];
      
      for (const fecha of fechas) {
        if (!fecha.activa) continue;

        const fechaProxima = this.parsearFecha(fecha.fecha);
        if (!fechaProxima) continue;

        // Check if it's tomorrow (recordatorio anticipado)
        if (this.esElMismoDia(fechaProxima, manana)) {
          await this.enviarRecordatorio(negocio, cliente, fecha, resultados);
        }
      }
    }
  }

  // Enviar recordatorio personalizado
  static async enviarRecordatorio(negocio, cliente, fecha, resultados) {
    const tipoMensajes = {
      'cumpleaños': [
        '🎂 ¡Feliz cumpleaños! 🎂\n\nTe desean en *${negocio.nombre}*. ¿Te gustaría venir a celebrar con nosotros?',
        '🥳 ¡Felices años! 🎈\n\nEn *${negocio.nombre}* queremos celebrarte. ¿Te esperamos?',
        '🎉 ¡Felicidades en tu día!\n\nDe parte de *${negocio.nombre}*, te wishingamos un año más de vida. ¡Celebremos!'
      ],
      'aniversario': [
        '💐 ¡Feliz aniversario!\n\nEn *${negocio.nombre}* celebramos tu lealtad. ¿Te gustaría venir a festejar?',
        '🎊 ¡Felicidades!\n\nGracias por ser parte de nuestra familia. ¿Te esperamos?'
      ],
      'fecha_especial': [
        '🌟 Te recordamos que mañana es una fecha especial para ti.\n\n*${negocio.nombre}* te desea lo mejor. ¿Te conmemoro visitarnos?'
      ]
    };

    const mensajes = tipoMensajes[fecha.tipo] || tipoMensajes['fecha_especial'];
    const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)]
      .replace('${negocio.nombre}', negocio.nombre);

    try {
      await WhatsAppService.sendMessage(cliente.numero_whatsapp, mensaje, negocio.id);
      resultados.recordatorios_enviados++;
      
      // Log
      console.log(`🤖 Recordatorio enviado a ${cliente.numero_whatsapp}: ${fecha.tipo}`);
    } catch (error) {
      console.error(`Error enviando recordatorio a ${cliente.numero_whatsapp}:`, error);
    }
  }

  // Parsear fecha string a Date
  static parsearFecha(fechaStr) {
    try {
      if (typeof fechaStr === 'string') {
        // Formato: YYYY-MM-DD
        const [anio, mes, dia] = fechaStr.split('-').map(Number);
        return new Date(anio, mes - 1, dia);
      }
      return new Date(fechaStr);
    } catch {
      return null;
    }
  }

  // Verificar si dos fechas son el mismo día
  static esElMismoDia(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Agregar fecha especial a cliente (API)
  static async agregarFechaEspecial(negocioId, clienteId, tipo, fecha) {
    const cliente = await Cliente.findById(clienteId, negocioId);
    const fechas = cliente?.fechas_especiales || [];
    
    fechas.push({
      tipo, // cumpleños, aniversario, fecha_especial
      fecha,
      activa: true,
      creada_en: new Date().toISOString()
    });

    await Cliente.update(clienteId, negocioId, { fechas_especiales: fechas });
  }
}

module.exports = AgenteMemoria;