// OttO - Costos de Productos Model

const db = require('../config/database');

class Costos {
  static async upsert(negocioId, data) {
    const { producto_id, componente, costo_unitario, cantidad_uso } = data;

    const result = await db.query(
      `INSERT INTO costos_productos (negocio_id, producto_id, componente, costo_unitario, cantidad_uso)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (negocio_id, producto_id, componente) 
       DO UPDATE SET costo_unitario = $4, cantidad_uso = $5, fecha_actualizacion = NOW()
       RETURNING *`,
      [negocioId, producto_id, componente, costo_unitario, cantidad_uso || 1]
    );

    return result.rows[0];
  }

  static async list(negocioId, productoId = null) {
    let query = 'SELECT * FROM costos_productos WHERE negocio_id = $1';
    const params = [negocioId];

    if (productoId) {
      query += ' AND producto_id = $2';
      params.push(productoId);
    }

    query += ' ORDER BY producto_id, componente';

    const result = await db.query(query, params);
    return result.rows;
  }

  static async getCostoTotal(negocioId, productoId) {
    const result = await db.query(
      `SELECT SUM(costo_unitario * cantidad_uso) as costo_total
       FROM costos_productos
       WHERE negocio_id = $1 AND producto_id = $2`,
      [negocioId, productoId]
    );

    return parseFloat(result.rows[0].costo_total || 0);
  }

  static async delete(id, negocioId) {
    await db.query(
      'DELETE FROM costos_productos WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
  }
}

module.exports = Costos;