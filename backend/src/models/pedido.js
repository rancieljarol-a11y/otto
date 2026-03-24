// OttO - Pedido Model (Order)
// Per-tenant order management

const db = require('../config/database');

class Pedido {
  // Create new order
  static async create(negocioId, clienteId, data) {
    const {
      productos, personalizacion, notas_especiales, origen, metodo_pago, agregado_por
    } = data;

    // Calculate totals
    let subtotal = 0;
    for (const p of productos) {
      subtotal += (p.precio * p.cantidad);
    }
    
    // Total sin impuestos (República Dominicana)
    // El ITBIS es opcional - el negocio puede activarlo manualmente si lo requiere
    const total = subtotal;

    // Generate order number
    const negocio = await db.query(
      `SELECT nombre FROM negocios WHERE id = $1`,
      [negocioId]
    );
    const prefix = negocio.rows[0]?.nombre?.substring(0, 3).toUpperCase() || 'ORD';
    
    const seqResult = await db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 4 FOR 6) AS INTEGER)), 0) + 1 as next
       FROM pedidos WHERE negocio_id = $1`,
      [negocioId]
    );
    const numero_pedido = `${prefix}${String(seqResult.rows[0].next).padStart(6, '0')}`;

    const result = await db.query(
      `INSERT INTO pedidos (
        numero_pedido, negocio_id, cliente_id, productos, personalizacion,
        subtotal, igv, total, notas_especiales, origen, metodo_pago, agregado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [numero_pedido, negocioId, clienteId, productos, personalizacion,
       subtotal, 0, total, notas_especiales, origen || 'whatsapp', metodo_pago, agregado_por]
    );

    // Update client's last interaction
    if (clienteId) {
      await db.query(
        `UPDATE clientes SET ultima_conversacion = NOW(), mensajes_ultimo_minuto = 0
         WHERE id = $1`,
        [clienteId]
      );
    }

    return result.rows[0];
  }

  // Find by ID
  static async findById(id, negocioId) {
    const result = await db.query(
      `SELECT p.*, c.nombre as cliente_nombre, c.numero_whatsapp as cliente_telefono
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE p.id = $1 AND p.negocio_id = $2`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  // Find by numero
  static async findByNumero(numero, negocioId) {
    const result = await db.query(
      `SELECT p.*, c.nombre as cliente_nombre, c.numero_whatsapp as cliente_telefono
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE p.numero_pedido = $1 AND p.negocio_id = $2`,
      [numero, negocioId]
    );
    return result.rows[0];
  }

  // List by negocio
  static async list(negocioId, filters = {}) {
    const { estado, cliente_id, desde, hasta, limit = 50, offset = 0 } = filters;
    
    let query = `SELECT p.*, c.nombre as cliente_nombre, c.numero_whatsapp as cliente_telefono
                 FROM pedidos p
                 LEFT JOIN clientes c ON p.cliente_id = c.id
                 WHERE p.negocio_id = $1`;
    const params = [negocioId];
    let paramCount = 1;

    if (estado) {
      paramCount++;
      query += ` AND p.estado = $${paramCount}`;
      params.push(estado);
    }

    if (cliente_id) {
      paramCount++;
      query += ` AND p.cliente_id = $${paramCount}`;
      params.push(cliente_id);
    }

    if (desde) {
      paramCount++;
      query += ` AND p.fecha_pedido >= $${paramCount}`;
      params.push(desde);
    }

    if (hasta) {
      paramCount++;
      query += ` AND p.fecha_pedido <= $${paramCount}`;
      params.push(hasta);
    }

    query += ` ORDER BY p.fecha_pedido DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  // Update estado
  static async updateEstado(id, negocioId, estado) {
    const updateFields = [];
    const params = [estado, id, negocioId];
    let paramCount = 3;

    switch (estado) {
      case 'confirmado':
        updateFields.push('fecha_confirmacion = NOW()');
        break;
      case 'en_preparacion':
        updateFields.push('fecha_preparacion = NOW()');
        break;
      case 'entregado':
        updateFields.push('fecha_entrega = NOW()');
        break;
      case 'cancelado':
        updateFields.push('fecha_cancelacion = NOW()');
        break;
    }

    const result = await db.query(
      `UPDATE pedidos SET 
        estado = $1, ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $2 AND negocio_id = $3
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // Get stats
  static async getStats(negocioId, desde, hasta) {
    let dateFilter = '';
    const params = [negocioId];
    let paramCount = 1;

    if (desde && hasta) {
      dateFilter = ` AND fecha_pedido >= $${paramCount + 1} AND fecha_pedido <= $${paramCount + 2}`;
      params.push(desde, hasta);
    }

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_pedidos,
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'confirmado') as confirmados,
        COUNT(*) FILTER (WHERE estado = 'en_preparacion') as en_preparacion,
        COUNT(*) FILTER (WHERE estado = 'entregado') as entregados,
        COUNT(*) FILTER (WHERE estado = 'cancelado') as cancelados,
        SUM(total) as ventas_totales,
        AVG(total) as promedio_pedido
       FROM pedidos 
       WHERE negocio_id = $1${dateFilter}`,
      params
    );
    return result.rows[0];
  }

  // Get recent orders for real-time dashboard
  static async getRecientes(negocioId, limit = 10) {
    const result = await db.query(
      `SELECT p.*, c.nombre as cliente_nombre
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE p.negocio_id = $1
       ORDER BY p.fecha_pedido DESC
       LIMIT $2`,
      [negocioId, limit]
    );
    return result.rows;
  }

  // Get orders needing attention
  static async getPendientes(negocioId) {
    const result = await db.query(
      `SELECT p.*, c.nombre as cliente_nombre, c.numero_whatsapp as cliente_telefono
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE p.negocio_id = $1 AND p.estado IN ('pendiente', 'confirmado', 'en_preparacion')
       ORDER BY p.fecha_pedido ASC`,
      [negocioId]
    );
    return result.rows;
  }

  // Send reminder
  static async sendReminder(id, negocioId) {
    const result = await db.query(
      `UPDATE pedidos SET recordatorio_enviado = true
       WHERE id = $1 AND negocio_id = $2 AND recordatorio_enviado = false
       RETURNING *`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  // Cancel order
  static async cancel(id, negocioId, motivo) {
    const result = await db.query(
      `UPDATE pedidos SET 
        estado = 'cancelado',
        fecha_cancelacion = NOW(),
        metadata = metadata || $1::jsonb,
        updated_at = NOW()
       WHERE id = $2 AND negocio_id = $3
       RETURNING *`,
      [{ cancellation_reason: motivo }, id, negocioId]
    );
    return result.rows[0];
  }

  // Get daily sales
  static async getVentasDiarias(negocioId, fecha) {
    const result = await db.query(
      `SELECT 
        DATE(fecha_pedido) as dia,
        COUNT(*) as pedidos,
        SUM(total) as total
       FROM pedidos 
       WHERE negocio_id = $1 
         AND DATE(fecha_pedido) = $2
         AND estado NOT IN ('cancelado')
       GROUP BY DATE(fecha_pedido)`,
      [negocioId, fecha]
    );
    return result.rows[0];
  }

  // Get sales by product
  static async getVentasPorProducto(negocioId, desde, hasta) {
    const result = await db.query(
      `SELECT 
        p.nombre,
        p.productos->>'cantidad' as cantidad_vendida,
        p.total as total_vendido
       FROM pedidos p
       WHERE p.negocio_id = $1 
         AND p.fecha_pedido BETWEEN $2 AND $3
         AND p.estado NOT IN ('cancelado')
       ORDER BY p.total DESC
       LIMIT 20`,
      [negocioId, desde, hasta]
    );
    return result.rows;
  }
}

module.exports = Pedido;