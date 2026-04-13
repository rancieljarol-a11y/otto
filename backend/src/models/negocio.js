// OttO - Negocio Model (Business/Tenant)
// Multi-tenant core

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Negocio {
  // Create new business
  static async create(data) {
    const { 
      nombre, slug, tipo_negocio_id, whatsapp_dueno, whatsapp_negocio,
      personalidad_bot, plantilla_factura, plan, zona_horaria, idioma
    } = data;

    const result = await db.query(
      `INSERT INTO negocios (
        nombre, slug, tipo_negocio_id, whatsapp_dueno, whatsapp_negocio,
        personalidad_bot, plantilla_factura, plan, zona_horaria, idioma
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [nombre, slug, tipo_negocio_id, whatsapp_dueno, whatsapp_negocio,
       personalidad_bot, plantilla_factura, plan || 'founder', zona_horaria || 'America/Lima', idioma || 'es']
    );

    return result.rows[0];
  }

  // Find by ID
  static async findById(id) {
    const result = await db.query(
      `SELECT n.*, t.nombre as tipo_negocio_nombre 
       FROM negocios n 
       LEFT JOIN tipos_negocio t ON n.tipo_negocio_id = t.id 
       WHERE n.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Find by slug
  static async findBySlug(slug) {
    const result = await db.query(
      `SELECT * FROM negocios WHERE slug = $1`,
      [slug]
    );
    return result.rows[0];
  }

  // Find by WhatsApp number
  static async findByWhatsApp(phone) {
    const result = await db.query(
      `SELECT * FROM negocios 
       WHERE whatsapp_negocio = $1 OR whatsapp_dueno = $1`,
      [phone]
    );
    return result.rows[0];
  }

  // Update
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'nombre', 'logo', 'tipo_negocio_id', 'modulos_activos',
      'whatsapp_negocio', 'personalidad_bot', 'plantilla_factura',
      'estado', 'horario_atencion', 'mensaje_fuera_horario',
      'acepta_pedidos_fuera_horario', 'zona_horaria', 'idioma'
    ];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await db.query(
      `UPDATE negocios SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // List all (admin only)
  static async list(filters = {}) {
    const { estado, plan, limit = 50, offset = 0 } = filters;
    
    let query = 'SELECT n.*, t.nombre as tipo_negocio_nombre FROM negocios n LEFT JOIN tipos_negocio t ON n.tipo_negocio_id = t.id WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (estado) {
      query += ` AND n.estado = $${paramCount}`;
      params.push(estado);
      paramCount++;
    }

    if (plan) {
      query += ` AND n.plan = $${paramCount}`;
      params.push(plan);
      paramCount++;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  // Get active subscription
  static async getActiveSubscription(negocioId) {
    const result = await db.query(
      `SELECT * FROM suscripciones_otto 
       WHERE negocio_id = $1 AND estado = 'activa' 
       ORDER BY created_at DESC LIMIT 1`,
      [negocioId]
    );
    return result.rows[0];
  }

  // Check if business can accept orders (pausa logic)
  static async canAcceptOrders(negocioId) {
    const negocio = await this.findById(negocioId);
    if (!negocio) return false;
    if (negocio.estado !== 'activo') return false;

    // Check pausas used
    const currentYear = new Date().getFullYear();
    // This would need proper date comparison
    
    return true;
  }

  // Desactivar (soft delete - nunca borrar)
  static async deactivate(id, motivo) {
    const result = await db.query(
      `UPDATE negocios SET 
        estado = 'suspendido',
        metadata = metadata || $1::jsonb,
        updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [{ suspended_at: new Date().toISOString(), suspension_reason: motivo }, id]
    );
    return result.rows[0];
  }

  // Get números autorizados
  static async getNumerosAutorizados(negocioId) {
    const result = await db.query(
      `SELECT * FROM numeros_autorizados 
       WHERE negocio_id = $1 AND activo = true`,
      [negocioId]
    );
    return result.rows;
  }

  // Add authorized number
  static async addNumeroAutorizado(negocioId, numero, nombre, rol = 'empleado') {
    const result = await db.query(
      `INSERT INTO numeros_autorizados (negocio_id, numero_whatsapp, nombre, rol)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (negocio_id, numero_whatsapp) 
       DO UPDATE SET activo = true, nombre = $3, rol = $4
       RETURNING *`,
      [negocioId, numero, nombre, rol]
    );
    return result.rows[0];
  }
}

module.exports = Negocio;