// OttO - Gastos Model

const db = require('../config/database');

class Gastos {
  static async create(negocioId, data) {
    const { tipo, descripcion, monto, categoria, fecha, periodicidad } = data;

    const result = await db.query(
      `INSERT INTO gastos_negocio (negocio_id, tipo, descripcion, monto, categoria, fecha, periodicidad)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [negocioId, tipo, descripcion, monto, categoria, fecha || new Date(), periodicidad]
    );

    return result.rows[0];
  }

  static async list(negocioId, filters = {}) {
    const { tipo, desde, hasta, limit = 50, offset = 0 } = filters;
    
    let query = 'SELECT * FROM gastos_negocio WHERE negocio_id = $1';
    const params = [negocioId];
    let paramCount = 1;

    if (tipo) {
      paramCount++;
      query += ` AND tipo = $${paramCount}`;
      params.push(tipo);
    }

    if (desde) {
      paramCount++;
      query += ` AND fecha >= $${paramCount}`;
      params.push(desde);
    }

    if (hasta) {
      paramCount++;
      query += ` AND fecha <= $${paramCount}`;
      params.push(hasta);
    }

    query += ` ORDER BY fecha DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async getTotal(negocioId, desde, hasta) {
    let query = 'SELECT SUM(monto) as total FROM gastos_negocio WHERE negocio_id = $1';
    const params = [negocioId];
    let paramCount = 1;

    if (desde) {
      paramCount++;
      query += ` AND fecha >= $${paramCount}`;
      params.push(desde);
    }

    if (hasta) {
      paramCount++;
      query += ` AND fecha <= $${paramCount}`;
      params.push(hasta);
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async update(id, negocioId, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['descripcion', 'monto', 'categoria', 'periodicidad', 'activo'];

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
      `UPDATE gastos_negocio SET ${fields.join(', ')} 
       WHERE id = $${paramCount} AND negocio_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }
}

module.exports = Gastos;