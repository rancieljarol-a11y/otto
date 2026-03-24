// OttO - Factura Model

const db = require('../config/database');

class Factura {
  static async create(data) {
    const {
      numero_correlativo, pedido_id, negocio_id, cliente_id,
      subtotal, igv, total, fecha_vencimiento, metodo_pago
    } = data;

    const result = await db.query(
      `INSERT INTO facturas (
        numero_correlativo, pedido_id, negocio_id, cliente_id,
        subtotal, igv, total, fecha_emision, fecha_vencimiento, metodo_pago,
        tipo_documento, estado_pago
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'recibo', 'pendiente')
      RETURNING *`,
      [numero_correlativo, pedido_id, negocio_id, cliente_id,
       subtotal, igv, total, new Date(), fecha_vencimiento || new Date(Date.now() + 30*24*60*60*1000), metodo_pago]
    );

    return result.rows[0];
  }

  static async findById(id, negocioId) {
    const result = await db.query(
      `SELECT f.*, c.nombre as cliente_nombre, c.numero_whatsapp as cliente_telefono
       FROM facturas f
       LEFT JOIN clientes c ON f.cliente_id = c.id
       WHERE f.id = $1 AND f.negocio_id = $2`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  static async list(negocioId, filters = {}) {
    const { estado, cliente_id, desde, hasta, limit = 50, offset = 0 } = filters;
    
    let query = `SELECT f.*, c.nombre as cliente_nombre 
                FROM facturas f
                LEFT JOIN clientes c ON f.cliente_id = c.id
                WHERE f.negocio_id = $1`;
    const params = [negocioId];
    let paramCount = 1;

    if (estado) {
      paramCount++;
      query += ` AND f.estado_pago = $${paramCount}`;
      params.push(estado);
    }

    if (cliente_id) {
      paramCount++;
      query += ` AND f.cliente_id = $${paramCount}`;
      params.push(cliente_id);
    }

    if (desde) {
      paramCount++;
      query += ` AND f.fecha_emision >= $${paramCount}`;
      params.push(desde);
    }

    if (hasta) {
      paramCount++;
      query += ` AND f.fecha_emision <= $${paramCount}`;
      params.push(hasta);
    }

    query += ` ORDER BY f.fecha_emision DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async update(id, negocioId, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['estado_pago', 'fecha_pago', 'metodo_pago', 'stripe_payment_intent', 'url_pdf'];

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
      `UPDATE facturas SET ${fields.join(', ')} 
       WHERE id = $${paramCount} AND negocio_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async marcarPagada(id, negocioId, metodoPago) {
    return await this.update(id, negocioId, {
      estado_pago: 'pagada',
      fecha_pago: new Date(),
      metodo_pago: metodoPago
    });
  }

  static async getEstadisticas(negocioId, desde, hasta) {
    let query = `SELECT 
      COUNT(*) as total,
      SUM(total) as monto_total,
      COUNT(*) FILTER (WHERE estado_pago = 'pagada') as pagadas,
      COUNT(*) FILTER (WHERE estado_pago = 'pendiente') as pendientes,
      COUNT(*) FILTER (WHERE estado_pago = 'vencida') as vencidas
    FROM facturas WHERE negocio_id = $1`;
    const params = [negocioId];
    let paramCount = 1;

    if (desde) {
      paramCount++;
      query += ` AND fecha_emision >= $${paramCount}`;
      params.push(desde);
    }

    if (hasta) {
      paramCount++;
      query += ` AND fecha_emision <= $${paramCount}`;
      params.push(hasta);
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }
}

module.exports = Factura;