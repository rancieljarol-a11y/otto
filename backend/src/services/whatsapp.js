// OttO - WhatsApp Service
// 360dialog integration

const config = require('../config');
const db = require('../config/database');

class WhatsAppService {
  // Send message via 360dialog
  static async sendMessage(to, message, negocioId) {
    // En desarrollo, simular el envío
    if (config.nodeEnv === 'development') {
      console.log(`📤 Envío simulado a ${to}: ${message.substring(0, 100)}...`);
      console.log(`   (negocioId: ${negocioId})`);
      return { success: true, modo: 'development' };
    }

    const negocio = await db.query(
      `SELECT whatsapp_negocio FROM negocios WHERE id = $1`,
      [negocioId]
    );
    
    const from = negocio.rows[0]?.whatsapp_negocio;
    if (!from) throw new Error('Negocio sin WhatsApp configurado');

    try {
      const response = await fetch(`${config.whatsapp.apiUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'D360-API-Key': config.whatsapp.apiKey
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          from: from.replace('+', ''),
          type: 'text',
          text: { body: message }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('WhatsApp API error:', data);
        throw new Error(data.error?.message || 'Failed to send message');
      }

      // Log the message
      await this.logMessage(negocioId, to, message, 'sent');

      return data;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw error;
    }
  }

  // Send template message
  static async sendTemplate(to, templateName, params, negocioId) {
    const negocio = await db.query(
      `SELECT whatsapp_negocio FROM negocios WHERE id = $1`,
      [negocioId]
    );
    
    const from = negocio.rows[0]?.whatsapp_negocio;

    try {
      const response = await fetch(`${config.whatsapp.apiUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'D360-API-Key': config.whatsapp.apiKey
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          from: from.replace('+', ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'es_PE' },
            components: params?.length ? [{
              type: 'body',
              parameters: params.map(p => ({ type: 'text', text: p }))
            }] : []
          }
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('WhatsApp template error:', error);
      throw error;
    }
  }

  // Send interactive buttons
  static async sendButtons(to, body, buttons, negocioId) {
    const negocio = await db.query(
      `SELECT whatsapp_negocio FROM negocios WHERE id = $1`,
      [negocioId]
    );
    
    const from = negocio.rows[0]?.whatsapp_negocio;

    try {
      const response = await fetch(`${config.whatsapp.apiUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'D360-API-Key': config.whatsapp.apiKey
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          from: from.replace('+', ''),
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: body },
            action: {
              buttons: buttons.map((btn, i) => ({
                id: `btn_${i}`,
                title: btn
              }))
            }
          }
        })
      });

      return await response.json();
    } catch (error) {
      console.error('WhatsApp buttons error:', error);
      throw error;
    }
  }

  // Send list message
  static async sendList(to, body, sections, negocioId) {
    const negocio = await db.query(
      `SELECT whatsapp_negocio FROM negocios WHERE id = $1`,
      [negocioId]
    );
    
    const from = negocio.rows[0]?.whatsapp_negocio;

    try {
      const response = await fetch(`${config.whatsapp.apiUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'D360-API-Key': config.whatsapp.apiKey
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          from: from.replace('+', ''),
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: body },
            action: {
              button: 'Ver opciones',
              sections: sections.map(section => ({
                title: section.title,
                rows: section.rows.map((row, i) => ({
                  id: `row_${section.title}_${i}`,
                  title: row.title,
                  description: row.description || ''
                }))
              }))
            }
          }
        })
      });

      return await response.json();
    } catch (error) {
      console.error('WhatsApp list error:', error);
      throw error;
    }
  }

  // Process incoming webhook
  static async processWebhook(payload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return null;

    const messages = value.messages?.[0];
    if (!messages) return null;

    const from = messages.from;
    const tipo = messages.type;

    let contenido = '';

    if (tipo === 'text') {
      contenido = messages.text?.body;
    } else if (tipo === 'image') {
      contenido = messages.image?.caption || '[Imagen]';
    } else if (tipo === 'audio') {
      contenido = '[Audio - usar Whisper]';
    } else if (tipo === 'document') {
      contenido = `[Documento: ${messages.document?.filename || 'archivo'}]`;
    }

    const displayPhone = value.metadata?.display_phone_number || value.metadata?.phone_number_id;
    let negocioId = null;

    if (displayPhone) {
      const negocio = await db.query(
        `SELECT id FROM negocios WHERE whatsapp_negocio = $1 OR whatsapp_dueno = $1 LIMIT 1`,
        [displayPhone]
      );
      negocioId = negocio.rows[0]?.id || null;
    }

    return {
      from,
      tipo,
      contenido,
      timestamp: messages.timestamp,
      id: messages.id,
      negocio_id: negocioId,
      display_phone: displayPhone,
      metadata: value
    };
  }

  // Log message
  static async logMessage(negocioId, to, content, direction) {
    await db.query(
      `INSERT INTO logs_actividad (negocio_id, accion, entidad_tipo, detalles)
       VALUES ($1, $2, 'whatsapp', $3)`,
      [negocioId, direction, { to, content, timestamp: new Date().toISOString() }]
    );
  }

  // Verify webhook
  static verifyWebhook(mode, token, verifyToken) {
    if (mode === 'subscribe' && token === verifyToken) {
      return true;
    }
    return false;
  }
}

module.exports = WhatsAppService;