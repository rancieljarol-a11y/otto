// OttO - Conversacion Model (Conversation)
// Per-tenant conversation tracking

const db = require('../config/database');

class Conversacion {
  // Create or get existing
  static async upsert(negocioId, clienteId) {
    const result = await db.query(
      `INSERT INTO conversaciones (negocio_id, cliente_id)
       VALUES ($1, $2)
       ON CONFLICT (negocio_id, cliente_id) 
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [negocioId, clienteId]
    );
    return result.rows[0];
  }

  // Find by cliente
  static async findByCliente(clienteId, negocioId) {
    const result = await db.query(
      `SELECT * FROM conversaciones 
       WHERE cliente_id = $1 AND negocio_id = $2`,
      [clienteId, negocioId]
    );
    return result.rows[0];
  }

  // Add message
  static async addMessage(id, negocioId, message) {
    const { role, content, timestamp } = message;
    
    const result = await db.query(
      `UPDATE conversaciones SET 
        mensajes = mensajes || $1::jsonb,
        ultimo_mensaje = $2,
        ultimo_mensaje_timestamp = NOW(),
        updated_at = NOW()
       WHERE id = $3 AND negocio_id = $4
       RETURNING *`,
      [{ role, content, timestamp: timestamp || new Date().toISOString() }, content, id, negocioId]
    );

    return result.rows[0];
  }

  // Get history
  static async getHistory(id, negocioId, limit = 20) {
    const result = await db.query(
      `SELECT mensajes FROM conversaciones 
       WHERE id = $1 AND negocio_id = $2`,
      [id, negocioId]
    );
    
    if (result.rows[0]?.mensajes) {
      return result.rows[0].mensajes.slice(-limit);
    }
    return [];
  }

  // Set human handoff
  static async requestHandoff(id, negocioId) {
    const result = await db.query(
      `UPDATE conversaciones SET 
        en_atencion_humana = true,
        handoff_solicitado_en = NOW(),
        updated_at = NOW()
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  // Release from human
  static async releaseFromHandoff(id, negocioId) {
    const result = await db.query(
      `UPDATE conversaciones SET 
        en_atencion_humana = false,
        updated_at = NOW()
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  // List active conversations
  static async getActivas(negocioId) {
    const result = await db.query(
      `SELECT c.*, cl.nombre as cliente_nombre, cl.numero_whatsapp as cliente_telefono
       FROM conversaciones c
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.negocio_id = $1 
         AND c.ultimo_mensaje_timestamp > NOW() - INTERVAL '24 hours'
       ORDER BY c.ultimo_mensaje_timestamp DESC`,
      [negocioId]
    );
    return result.rows;
  }

  // Get pending handoffs
  static async getPendientesHandoff(negocioId) {
    const result = await db.query(
      `SELECT c.*, cl.nombre as cliente_nombre, cl.numero_whatsapp as cliente_telefono
       FROM conversaciones c
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.negocio_id = $1 AND c.en_atencion_humana = true
       ORDER BY c.handoff_solicitado_en ASC`,
      [negocioId]
    );
    return result.rows;
  }

  // Clear messages (privacy)
  static async clearMessages(id, negocioId) {
    const result = await db.query(
      `UPDATE conversaciones SET 
        mensajes = '[]'::jsonb,
        updated_at = NOW()
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId]
    );
    return result.rows[0];
  }
}

module.exports = Conversacion;