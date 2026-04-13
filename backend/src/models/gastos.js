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

    paramCount++;
    query += ` ORDER BY fecha DESC LIMIT $${paramCount}`;
    params.push(limit);

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  static async getStats(negocioId, desde, hasta) {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString().split('T')[0];
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString().split('T')[0];

    const [totalResult, mesActual, mesAnterior] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(monto), 0) as total FROM gastos_negocio WHERE negocio_id = $1`, [negocioId]),
      db.query(`SELECT COALESCE(SUM(monto), 0) as total FROM gastos_negocio WHERE negocio_id = $1 AND fecha >= $2`, [negocioId, inicioMes]),
      db.query(`SELECT COALESCE(SUM(monto), 0) as total FROM gastos_negocio WHERE negocio_id = $1 AND fecha >= $2 AND fecha <= $3`, [negocioId, inicioMesAnterior, finMesAnterior]),
    ]);

    return {
      total: parseFloat(totalResult.rows[0].total),
      mes_actual: parseFloat(mesActual.rows[0].total),
      mes_anterior: parseFloat(mesAnterior.rows[0].total),
    };
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
