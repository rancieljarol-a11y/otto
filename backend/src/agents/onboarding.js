// OttO - Agente de Onboarding
// BACKGROUND: Corre solo los primeros 7 días de cada negocio nuevo
// Guía paso a paso, verifica completados, envía recordatorios

const Onboarding = require('../models/onboarding');
const Negocio = require('../models/negocio');
const WhatsAppService = require('../services/whatsapp');

class AgenteOnboarding {
  // Pasos del onboarding
  static PASOS = [
    {
      numero: 1,
      titulo: 'Bienvenido a OttO',
      descripcion: 'Gracias por registrarte. Te enviaremos una guía para configurar tu negocio.',
      completado: false
    },
    {
      numero: 2,
      titulo: 'Configura tu catálogo',
      descripcion: 'Agrega tus productos o servicios. Incluye fotos y precios.',
      completado: false
    },
    {
      numero: 3,
      titulo: 'Conecta WhatsApp',
      descripcion: 'Vincula tu número de WhatsApp Business para recibir pedidos.',
      completado: false
    },
    {
      numero: 4,
      titulo: 'Personaliza tu bot',
      descripcion: 'Define cómo quieres que el bot responda a tus clientes.',
      completado: false
    },
    {
      numero: 5,
      titulo: 'Agrega empleados',
      descripcion: 'Autoriza los números de tus empleados que atenderán por WhatsApp.',
      completado: false
    },
    {
      numero: 6,
      titulo: 'Configura métodos de pago',
      descripcion: 'Agrega tus cuentas bancarias, Yape, Plin u otros métodos de pago.',
      completado: false
    },
    {
      numero: 7,
      titulo: '¡Listo para vender!',
      descripcion: 'Tu negocio está listo. Comparte tu número de WhatsApp con tus clientes.',
      completado: false
    }
  ];

  // Ejecutar onboarding para negocios nuevos
  static async ejecutar() {
    console.log('🎓 AgenteOnboarding: Iniciando...');
    
    const resultados = {
      negocios_procesados: 0,
      recordatorios_enviados: 0,
      onbardings_completados: 0
    };

    try {
      // Obtener negocios con onboarding activo
      const db = require('../config/database');
      const result = await db.query(
        `SELECT o.*, n.nombre as negocio_nombre, n.whatsapp_dueno
         FROM onboarding_negocio o
         JOIN negocios n ON n.id = o.negocio_id
         WHERE o.completado = false 
           AND o.created_at > NOW() - INTERVAL '7 days'`
      );

      for (const onboarding of result.rows) {
        try {
          await this.procesarOnboarding(onboarding, resultados);
          resultados.negocios_procesados++;
        } catch (error) {
          console.error(`Error procesando onboarding ${onboarding.id}:`, error);
        }
      }

      console.log('🎓 AgenteOnboarding: Completado', resultados);
      return resultados;

    } catch (error) {
      console.error('🎓 AgenteOnboarding: Error fatal:', error);
      return resultados;
    }
  }

  // Procesar un onboarding específico
  static async procesarOnboarding(onboarding, resultados) {
    const pasoActual = onboarding.paso_actual;
    const dia = Math.ceil((Date.now() - new Date(onboarding.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    // Verificar si debe enviar mensaje según el día
    if (this.debeEnviarMensaje(pasoActual, dia)) {
      await this.enviarMensajeDelPaso(onboarding, pasoActual, dia, resultados);
    }
  }

  // Determinar si debe enviar mensaje hoy
  static debeEnviarMensaje(pasoActual, dia) {
    // Enviar mensajes en días específicos: 1, 2, 3, 5, 7
    return [1, 2, 3, 5, 7].includes(dia);
  }

  // Enviar mensaje del paso actual
  static async enviarMensajeDelPaso(onboarding, pasoActual, dia, resultados) {
    const paso = this.PASOS[pasoActual - 1];
    const mensaje = this.generarMensajePaso(paso, pasoActual, dia);

    try {
      await WhatsAppService.sendMessage(onboarding.whatsapp_dueno, mensaje, onboarding.negocio_id);
      resultados.recordatorios_enviados++;
      console.log(`🎓 Mensaje enviado a ${onboarding.whatsapp_dueno}: paso ${pasoActual}`);
    } catch (error) {
      console.error('Error enviando mensaje de onboarding:', error);
    }
  }

  // Generar mensaje según el paso y día
  static generarMensajePaso(paso, pasoActual, dia) {
    const mensajes = {
      1: `🎉 *¡Bienvenido a OttO!*\n\nGracias por registrarte. En los próximos 7 días te guiaremos para configurar tu negocio.\n\n*Paso 1 de 7:* ${paso.titulo}\n${paso.descripcion}\n\n_Escribe "onboarding" cuando completes cada paso._`,
      
      2: `📦 *Onboarding - Día 2*\n\nVamos a configurar tu catálogo.\n\n*Paso 2:* ${paso.titulo}\n${paso.descripcion}\n\n_Ejemplo de cómo agregar un producto:_\n\`agregar producto | Hamburguesa Clásica | 25.00 | Comidas | Con queso y jamón\``,
      
      3: `📱 *Onboarding - Día 3*\n\nConecta tu WhatsApp.\n\n*Paso 3:* ${paso.titulo}\n${paso.descripcion}\n\n_Para configurar, ve a Configuración > WhatsApp en tu dashboard._`,
      
      5: `⚙️ *Onboarding - Día 5*\n\nCasi terminas la configuración.\n\n*Paso ${pasoActual}:* ${paso.titulo}\n${paso.descripcion}`,
      
      7: `🚀 *Onboarding - Día 7*\n\n¡Último día de configuración!\n\n*Paso ${pasoActual}:* ${ paso.titulo}\n${ paso.descripcion}\n\n_¿Ya completaste todos los pasos? Responde "onboarding completado" para verificar._`
    };

    return mensajes[dia] || `📋 *Onboarding - Paso ${pasoActual}*\n\n*${paso.titulo}*\n${ paso.descripcion}`;
  }

  // Marcar paso como completado
  static async completarPaso(negocioId, paso) {
    const db = require('../config/database');
    
    // Obtener onboarding actual
    const result = await db.query(
      `SELECT * FROM onboarding_negocio WHERE negocio_id = $1`,
      [negocioId]
    );

    if (result.rows.length === 0) return null;

    const onboarding = result.rows[0];
    const pasosCompletados = onboarding.pasos_completados || [];
    
    if (!pasosCompletados.includes(paso)) {
      pasosCompletados.push(paso);
    }

    const nuevoPaso = Math.min(paso + 1, 7);
    const completado = nuevoPaso > 7;

    await db.query(
      `UPDATE onboarding_negocio 
       SET paso_actual = $1, pasos_completados = $2, completado = $3, 
           fecha_completado = $4
       WHERE negocio_id = $5`,
      [nuevoPaso, pasosCompletados, completado, completado ? new Date() : null, negocioId]
    );

    // Si completó todos los pasos, enviar mensaje de celebración
    if (completado) {
      await this.enviarMensajeCompletado(negocioId);
    }

    return { paso: nuevoPaso, completado };
  }

  // Enviar mensaje de completado
  static async enviarMensajeCompletado(negocioId) {
    const negocio = await Negocio.findById(negocioId);
    
    const mensaje = `🎊 *¡Felicidades! 🎊*\n\nTu negocio *${negocio.nombre}* está completamente configurado y listo para recibir pedidos.\n\n*Lo que tienes:*\n✅ Catálogo de productos\n✅ Bot automático en WhatsApp\n✅ Panel de control\n✅ Registro de clientes y pedidos\n\n*Próximos pasos:*\n📱 Comparte tu número de WhatsApp con tus clientes\n📊 Revisa tu dashboard para ver pedidos\n💰 Configura tus métodos de pago\n\n_¡Éxito con tu negocio!_ 🚀`;

    await WhatsAppService.sendMessage(negocio.whatsapp_dueno, mensaje, negocioId);
  }

  // Obtener estado actual del onboarding
  static async getEstado(negocioId) {
    const result = await require('../config/database').query(
      `SELECT * FROM onboarding_negocio WHERE negocio_id = $1`,
      [negocioId]
    );

    if (result.rows.length === 0) return null;

    const onboarding = result.rows[0];
    return {
      paso_actual: onboarding.paso_actual,
      pasos_completados: onboarding.pasos_completados || [],
      completado: onboarding.completado,
      dias_transcurridos: Math.ceil((Date.now() - new Date(onboarding.created_at).getTime()) / (1000 * 60 * 60 * 24))
    };
  }

  // Crear onboarding para un nuevo negocio
  static async crear(negocioId) {
    const db = require('../config/database');
    
    await db.query(
      `INSERT INTO onboarding_negocio (negocio_id, paso_actual, pasos_completados, completado)
       VALUES ($1, 1, '[]', false)`,
      [negocioId]
    );

    // Enviar mensaje de bienvenida
    const negocio = await Negocio.findById(negocioId);
    await WhatsAppService.sendMessage(
      negocio.whatsapp_dueno,
      this.PASOS[0].descripcion,
      negocioId
    );
  }
}

module.exports = AgenteOnboarding;