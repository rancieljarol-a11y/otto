// OttO - Agente Anti-spam
// BACKGROUND: Corre en paralelo siempre
// 100% reglas, cero IA
// Detecta patrones anómalos, bloquea números sospechosos, alerta al dueño

const db = require('../config/database');

class AgenteAntispam {
  // Verificar si un mensaje es spam
  static async verificar(mensaje, numero, negocioId) {
    const resultado = {
      es_spam: false,
      puntuacion: 0,
      razones: [],
      accion: 'permitir'
    };

    // 1. Patrones de spam conocidos
    const patronesSpam = this.detectarPatrones(mensaje);
    if (patronesSpam.encontrado) {
      resultado.puntuacion += patronesSpam.puntuacion;
      resultado.razones.push(patronesSpam.razon);
    }

    // 2. Verificar historial del número
    const historial = await this.obtenerHistorial(numero, negocioId);
    
    // Rate limiting: demasiados mensajes en poco tiempo
    if (historial.mensajes_ultima_hora > 20) {
      resultado.puntuacion += 30;
      resultado.razones.push('tasa_mensajes_excesiva');
    }

    // 3. Verificar si el número está en lista de bloqueados
    const bloqueado = await this.estaBloqueado(numero, negocioId);
    if (bloqueado) {
      resultado.es_spam = true;
      resultado.accion = 'bloqueado';
      return resultado;
    }

    // 4. Detectar comportamiento anómalo
    const anomalias = this.detectarAnomalias(mensaje, historial);
    if (anomalias.encontrada) {
      resultado.puntuacion += anomalias.puntuacion;
      resultado.razones.push(...anomalias.razones);
    }

    // 5. Determinar acción final
    if (resultado.puntuacion >= 50) {
      resultado.es_spam = true;
      resultado.accion = resultado.puntuacion >= 80 ? 'bloqueado' : 'pendiente';
      
      // Si es spam confirmado, bloquear
      if (resultado.accion === 'bloqueado') {
        await this.bloquearNumero(numero, negocioId, resultado.razones.join(', '));
        
        // Alertar al dueño
        await this.alertarDueno(negocioId, numero, resultado);
      }
    }

    return resultado;
  }

  // Detectar patrones de spam conocidos
  static detectarPatrones(mensaje) {
    const patrones = [
      { regex: /ganaste.*premio/i, puntuacion: 40, razon: 'patron_premio' },
      { regex: /click.*aqu.*gratis/i, puntuacion: 40, razon: 'patron_phishing' },
      { regex: /gratis.*dinero/i, puntuacion: 35, razon: 'patron_estafa' },
      { regex: /inversión.*doble/i, puntuacion: 35, razon: 'patron_estructura' },
      { regex: /crypto|bitcoin|ethereum/i, puntuacion: 25, razon: 'patron_crypto' },
      { regex: /sexo.*gratis|contacto.*mujeres/i, puntuacion: 40, razon: 'patron_adulto' },
      { regex: /.{200,}/, puntuacion: 20, razon: 'mensaje_muy_largo' },
      { regex: /(.)\1{4,}/, puntuacion: 15, razon: 'caracteres_repetidos' }, // "aaaaaa"
      { regex: /[A-Z]{10,}/, puntuacion: 10, razon: 'mayusculas_excesivas' },
      { regex: /\$.{1,5}[0-9]{3,}/, puntuacion: 20, razon: 'patron_money_spam' }, // $1000, $5000
      { regex: /w{3,}\.[a-z]+\.[a-z]{2,}/i, puntuacion: 20, razon: 'patron_url_sospechosa' },
      { regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, puntuacion: 15, razon: 'email_en_mensaje' }
    ];

    for (const patron of patrones) {
      if (patron.regex.test(mensaje)) {
        return { encontrado: true, puntuacion: patron.puntuacion, razon: patron.razon };
      }
    }

    return { encontrado: false, puntuacion: 0 };
  }

  // Obtener historial de mensajes del número
  static async obtenerHistorial(numero, negocioId) {
    const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
    
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_mensajes,
        COUNT(*) FILTER (WHERE c.created_at > $1) as mensajes_ultima_hora,
        COUNT(*) FILTER (WHERE jsonb_array_length(c.mensajes) > 5) as mensajes_largos
       FROM conversaciones c
       JOIN clientes cl ON c.cliente_id = cl.id
       WHERE cl.numero_whatsapp = $2 AND c.negocio_id = $3`,
      [unaHoraAtras, numero, negocioId]
    );

    return {
      mensajes_totales: parseInt(result.rows[0].total_mensajes || 0),
      mensajes_ultima_hora: parseInt(result.rows[0].mensajes_ultima_hora || 0),
      mensajes_largos: parseInt(result.rows[0].mensajes_largos || 0)
    };
  }

  // Verificar si el número está bloqueado
  static async estaBloqueado(numero, negocioId) {
    const result = await db.query(
      `SELECT bloqueado FROM clientes 
       WHERE numero_whatsapp = $1 AND negocio_id = $2`,
      [numero, negocioId]
    );

    return result.rows.length > 0 && result.rows[0].bloqueado;
  }

  // Detectar comportamiento anómalo
  static detectarAnomalias(mensaje, historial) {
    const anomalias = [];
    let puntuacion = 0;

    // Muchos mensajes largos
    if (historial.mensajes_largos > 5 && historial.mensajes_ultima_hora > 10) {
      puntuacion += 25;
      anomalias.push('patron_mensajes_largos');
    }

    // Mensaje con solo números o solo símbolos
    if (/^[0-9\s+-]+$/.test(mensaje) && mensaje.length > 15) {
      puntuacion += 15;
      anomalias.push('solo_numeros');
    }

    // Mensaje con muchos enlaces
    const enlaces = mensaje.match(/https?:\/\/[^\s]+/g);
    if (enlaces && enlaces.length > 2) {
      puntuacion += 20;
      anomalias.push('muchos_enlaces');
    }

    // Mensaje con emojis en exceso
    const emojis = mensaje.match(/[\u{1F600}-\u{1F64F}]/gu);
    if (emojis && emojis.length > 10) {
      puntuacion += 10;
      anomalias.push('emojis_excesivos');
    }

    return {
      encontrada: puntuacion > 0,
      puntuacion,
      razones: anomalias
    };
  }

  // Bloquear número
  static async bloquearNumero(numero, negocioId, razon) {
    await db.query(
      `UPDATE clientes SET bloqueado = true 
       WHERE numero_whatsapp = $1 AND negocio_id = $2`,
      [numero, negocioId]
    );

    // Registrar en log de spam
    await db.query(
      `INSERT INTO logs_actividad (negocio_id, accion, detalles)
       VALUES ($1, 'spam_bloqueado', $2)`,
      [negocioId, { numero, razon, timestamp: new Date().toISOString() }]
    );

    console.log(`🚫 Número bloqueado por spam: ${numero} - ${razon}`);
  }

  // Alertar al dueño
  static async alertarDueno(negocioId, numero, resultado) {
    const Negocio = require('../models/negocio');
    const WhatsAppService = require('../services/whatsapp');
    
    const negocio = await Negocio.findById(negocioId);
    if (!negocio?.whatsapp_dueno) return;

    const mensaje = `⚠️ *Alerta de seguridad*\n\n`;
    mensaje += `Se ha detectado y bloqueado un número sospechoso:\n`;
    mensaje += `• Número: ${numero}\n`;
    mensaje += `• Puntuación spam: ${resultado.puntuacion}\n`;
    mensaje += `• Razón: ${resultado.razones.join(', ')}\n\n`;
    mensaje += `_Ver detalles en tu panel de control_`;

    try {
      await WhatsAppService.sendMessage(negocio.whatsapp_dueno, mensaje, negocioId);
    } catch (error) {
      console.error('Error alertando al dueño:', error);
    }
  }

  // Desbloquear número (para el owner)
  static async desbloquear(numero, negocioId) {
    await db.query(
      `UPDATE clientes SET bloqueado = false 
       WHERE numero_whatsapp = $1 AND negocio_id = $2`,
      [numero, negocioId]
    );

    // Registrar desbloquear
    await db.query(
      `INSERT INTO logs_actividad (negocio_id, accion, detalles)
       VALUES ($1, 'spam_desbloqueado', $2)`,
      [negocioId, { numero, timestamp: new Date().toISOString() }]
    );
  }

  // Obtener lista de números bloqueados
  static async getBloqueados(negocioId) {
    const result = await db.query(
      `SELECT numero_whatsapp, updated_at 
       FROM clientes 
       WHERE negocio_id = $1 AND bloqueado = true
       ORDER BY updated_at DESC`,
      [negocioId]
    );

    return result.rows;
  }

  // Verificar si un mensaje debe procesarse (no está bloqueado)
  static async puedeProcesar(numero, negocioId) {
    const bloqueado = await this.estaBloqueado(numero, negocioId);
    return !bloqueado;
  }
}

module.exports = AgenteAntispam;