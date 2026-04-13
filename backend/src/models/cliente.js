// OttO - Cliente Model (Customer)
// Per-tenant customer isolation

const db = require('../config/database');

class Cliente {
  // Create or get existing (upsert by phone per negocio)
  static async upsert(negocioId, phone, data = {}) {
    const { nombre, email } = data;

    const result = await db.query(
      `INSERT INTO clientes (negocio_id, numero_whatsapp, nombre, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (negocio_id, numero_whatsapp) 
       DO UPDATE SET 
         nombre = COALESCE(EXCLUDED.nombre, clientes.nombre),
         email = COALESCE(EXCLUDED.email, clientes.email),
         ultima_conversacion = NOW()
       RETURNING *`,
      [negocioId, phone, nombre, email]
    );

    return result.rows[0];
  }

  // Find by ID
  static async findById(id, negocioId = null) {
    let query = 'SELECT * FROM clientes WHERE id = $1';
    const params = [id];

    if (negocioId) {
      query += ' AND negocio_id = $2';
      params.push(negocioId);
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }

  // Create
  static async create(negocioId, phone, data = {}) {
    const { nombre, email } = data;
    const result = await db.query(
      `INSERT INTO clientes (negocio_id, numero_whatsapp, nombre, email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [negocioId, phone, nombre || 'Sin nombre', email || null]
    );
    return result.rows[0];
  }

  // Find by phone (per negocio)
  static async findByPhone(phone, negocioId) {
    const result = await db.query(
      `SELECT * FROM clientes 
       WHERE numero_whatsapp = $1 AND negocio_id = $2`,
      [phone, negocioId]
    );
    return result.rows[0];
  }

  // Update
  static async update(id, negocioId, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['nombre', 'email', 'direcciones', 'fechas_especiales', 'etiquetas', 'bloqueado', 'deuda_activa'];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id, negocioId);
    const result = await db.query(
      `UPDATE clientes SET ${fields.join(', ')} 
       WHERE id = $${paramCount} AND negocio_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // List by negocio
  static async list(negocioId, filters = {}) {
    const { search, bloqueado, limit = 50, offset = 0 } = filters;
    
    let query = 'SELECT * FROM clientes WHERE negocio_id = $1';
    const params = [negocioId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      query += ` AND (nombre ILIKE $${paramCount} OR numero_whatsapp ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (bloqueado !== undefined) {
      paramCount++;
      query += ` AND bloqueado = $${paramCount}`;
      params.push(bloqueado);
    }

    query += ` ORDER BY ultima_conversacion DESC NULLS LAST LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  // Add deuda
  static async addDeuda(id, negocioId, monto) {
    const result = await db.query(
      `UPDATE clientes 
       SET deuda_activa = deuda_activa + $1, updated_at = NOW()
       WHERE id = $2 AND negocio_id = $3
       RETURNING *`,
      [monto, id, negocioId]
    );
    return result.rows[0];
  }

  // Pay deuda
  static async payDeuda(id, negocioId, monto) {
    const result = await db.query(
      `UPDATE clientes 
       SET deuda_activa = GREATEST(0, deuda_activa - $1), updated_at = NOW()
       WHERE id = $2 AND negocio_id = $3
       RETURNING *`,
      [monto, id, negocioId]
    );
    return result.rows[0];
  }

  // Bloquear
  static async block(id, negocioId) {
    const result = await db.query(
      `UPDATE clientes SET bloqueado = true, updated_at = NOW()
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  // Desbloquear
  static async unblock(id, negocioId) {
    const result = await db.query(
      `UPDATE clientes SET bloqueado = false, updated_at = NOW()
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  // Get stats
  static async getStats(negocioId) {
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_clientes,
        COUNT(*) FILTER (WHERE bloqueado = true) as clientes_bloqueados,
        COUNT(*) FILTER (WHERE deuda_activa > 0) as clientes_con_deuda,
        COALESCE(SUM(deuda_activa), 0) as total_deuda,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as clientes_nuevos_mes
       FROM clientes WHERE negocio_id = $1`,
      [negocioId]
    );
    return result.rows[0];
  }
}

module.exports = Cliente;