// OttO - Orquestador de Agentes
// Coordina todos los agentes según el flujo de mensajes

const AgenteRecepcionista = require('./recepcionista');
const AgenteVentas = require('./ventas-integrado');  // ← Usando agente integrado
const AgenteAdministrador = require('./administrador');
const AgenteAntispam = require('./antispam');
const WhatsAppService = require('../services/whatsapp');

class OrquestadorAgentes {
  // Procesar mensaje entrante de WhatsApp
  static async procesarMensaje(mensaje, numeroEntrante) {
    console.log(`\n📨 MENSAJE: "${mensaje.substring(0, 60)}..."`);
    console.log(`👤 De: ${numeroEntrante}`);

    try {
      // 1. PRIMERO: Verificar anti-spam (siempre corriendo)
      const puedeProcesar = await AgenteAntispam.puedeProcesar(numeroEntrante, null);
      if (!puedeProcesar) {
        console.log(`🚫 Mensaje bloqueado por anti-spam: ${numeroEntrante}`);
        return { bloqueado: true, razon: 'spam' };
      }

      // 2. SEGUNDO: Agente Recepcionista identifica negocio, rol, y procesa
      const resultadoRecepcionista = await AgenteRecepcionista.procesar(mensaje, numeroEntrante);
      
      if (!resultadoRecepcionista.negocio_id) {
        return { error: 'negocio_no_encontrado', ...resultadoRecepcionista };
      }

      const { negocio_id, cliente_id } = resultadoRecepcionista;

      // 3. Verificar spam para el negocio específico
      const spamCheck = await AgenteAntispam.verificar(mensaje, numeroEntrante, negocio_id);
      if (spamCheck.es_spam) {
        return { bloqueado: true, ...spamCheck };
      }

      // 4. Obtener contexto completo
      const Negocio = require('../models/negocio');
      const Cliente = require('../models/cliente');
      const Conversacion = require('../models/conversacion');

      const negocio = await Negocio.findById(negocio_id);
      const cliente = await Cliente.findById(cliente_id, negocio_id);
      const conversacion = await Conversacion.findByCliente(cliente_id, negocio_id);

      // 5. Determinar siguiente paso según resultado del recepcionista
      if (resultadoRecepcionista.debe_rutear) {
        // Si texto es null, no enviar respuesta, solo rutear
        if (resultadoRecepcionista.texto === null) {
          return await this.rutearAgente(
            resultadoRecepcionista.siguiente_agente,
            mensaje,  // Pasar el mensaje ORIGINAL del cliente
            { negocio, cliente, conversacion, rol: resultadoRecepcionista.rol },
            negocio_id  // Pasar negocio_id
          );
        }
        
        // Si hay texto, enviarlo Y luego rutear
        if (resultadoRecepcionista.texto) {
          await WhatsAppService.sendMessage(numeroEntrante, resultadoRecepcionista.texto, negocio_id);
        }
        
        return await this.rutearAgente(
          resultadoRecepcionista.siguiente_agente,
          mensaje,
          { negocio, cliente, conversacion, rol: resultadoRecepcionista.rol },
          negocio_id
        );
      }

      // 6. Si el recepcionista ya respondió, retornar
      if (resultadoRecepcionista.acciones?.some(a => a.tipo === 'respuesta_enviada')) {
        return { success: true, ...resultadoRecepcionista, negocio_id };
      }

      // 7. Por defecto, procesar con ventas
      return await this.rutearAgente('ventas', mensaje, {
        negocio,
        cliente,
        conversacion,
        rol: resultadoRecepcionista.rol
      }, negocio_id);

    } catch (error) {
      console.error('❌ Orquestador error:', error);
      return { error: error.message };
    }
  }

  // Rutear al agente adecuado
  static async rutearAgente(agente, mensaje, contexto, negocioId) {
    console.log(`\n→ INVOCANDO AGENTE: ${agente.toUpperCase()}`);

    let resultado;
    switch (agente) {
      case 'ventas':
        resultado = await AgenteVentas.procesar(mensaje, contexto);
        break;

      case 'administrador':
        resultado = await AgenteAdministrador.procesar(mensaje, contexto);
        break;

      case 'documentos':
        const AgenteDocumentos = require('./documentos');
        resultado = await AgenteDocumentos.procesar(mensaje, contexto);
        break;

      default:
        resultado = await AgenteRecepcionista.procesar(mensaje, contexto.negocio.whatsapp_dueno);
    }

    // Agregar negocio_id al resultado
    if (resultado && negocioId) {
      resultado.negocio_id = negocioId;
    }
    
    console.log(`✓ Agente ${agente} respondió: ${resultado?.texto?.substring(0, 50)}...`);
    console.log('─'.repeat(40));
    
    return resultado;
  }

  // Procesar comando directo del propietario
  static async procesarComando(comando, negocioId, rol) {
    if (!['dueño', 'supervisor'].includes(rol)) {
      return { error: 'Sin permisos' };
    }

    const Negocio = require('../models/negocio');
    const negocio = await Negocio.findById(negocioId);

    return await AgenteAdministrador.procesar(comando, {
      negocio,
      rol
    });
  }

  // Ejecutar agentes de background
  static async ejecutarBackground() {
    const cron = require('node-cron');

    // Agente de Memoria: diariamente a las 8am
    cron.schedule('0 8 * * *', async () => {
      console.log('⏰ Ejecutando AgenteMemoria...');
      const AgenteMemoria = require('./memoria');
      await AgenteMemoria.ejecutar();
    });

    // Agente de Cobros: diariamente a las 9am
    cron.schedule('0 9 * * *', async () => {
      console.log('⏰ Ejecutando AgenteCobros...');
      const AgenteCobros = require('./cobros');
      await AgenteCobros.ejecutar();
    });

    // Agente de Onboarding: diariamente a las 10am
    cron.schedule('0 10 * * *', async () => {
      console.log('⏰ Ejecutando AgenteOnboarding...');
      const AgenteOnboarding = require('./onboarding');
      await AgenteOnboarding.ejecutar();
    });

    console.log('✅ Agentes de background programados');
  }
}

module.exports = OrquestadorAgentes;