// OttO - Producto Model (Product/Catalog)
// Per-tenant product management

const db = require('../config/database');

class Producto {
  // Create
  static async create(negocioId, data) {
    const {
      nombre, descripcion, precio, foto, categoria,
      stock_actual, stock_minimo, tiene_visualizador, capas_visualizador,
      posicion, metadata
    } = data;

    const result = await db.query(
      `INSERT INTO productos (
        negocio_id, nombre, descripcion, precio, foto, categoria,
        stock_actual, stock_minimo, tiene_visualizador, capas_visualizador,
        posicion, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [negocioId, nombre, descripcion, precio, foto, categoria,
       stock_actual || 0, stock_minimo || 0, tiene_visualizador || false,
       capas_visualizador || [], posicion || 0, metadata || {}]
    );

    return result.rows[0];
  }

  // Find by ID
  static async findById(id, negocioId) {
    const result = await db.query(
      `SELECT p.*, 
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', op.id,
          'tipo', op.tipo,
          'nombre', op.nombre,
          'precio_adicional', op.precio_adicional,
          'foto_capa', op.foto_capa,
          'posicion', op.posicion,
          'activo', op.activo
        )) FILTER (WHERE op.id IS NOT NULL), '[]') as personalizaciones
       FROM productos p
       LEFT JOIN opciones_personalizacion op ON op.producto_id = p.id AND op.activo = true
       WHERE p.id = $1 AND p.negocio_id = $2
       GROUP BY p.id`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  // List by negocio
  static async list(negocioId, filters = {}) {
    const { categoria, activo, search, limit = 50, offset = 0 } = filters;
    
    let query = `SELECT * FROM productos WHERE negocio_id = $1`;
    const params = [negocioId];
    let paramCount = 1;

    if (categoria) {
      paramCount++;
      query += ` AND categoria = $${paramCount}`;
      params.push(categoria);
    }

    if (activo !== undefined) {
      paramCount++;
      query += ` AND activo = $${paramCount}`;
      params.push(activo);
    }

    if (search) {
      paramCount++;
      query += ` AND (nombre ILIKE $${paramCount} OR descripcion ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY posicion ASC, nombre ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  // Get categories
  static async getCategories(negocioId) {
    const result = await db.query(
      `SELECT DISTINCT categoria FROM productos 
       WHERE negocio_id = $1 AND categoria IS NOT NULL AND activo = true
       ORDER BY categoria`,
      [negocioId]
    );
    return result.rows.map(r => r.categoria);
  }

  // Update
  static async update(id, negocioId, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'nombre', 'descripcion', 'precio', 'foto', 'categoria',
      'stock_actual', 'stock_minimo', 'tiene_visualizador', 'capas_visualizador',
      'posicion', 'activo', 'metadata'
    ];

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
      `UPDATE productos SET ${fields.join(', ')} 
       WHERE id = $${paramCount} AND negocio_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // Update stock
  static async updateStock(id, negocioId, cantidad) {
    const result = await db.query(
      `UPDATE productos 
       SET stock_actual = stock_actual + $1, updated_at = NOW()
       WHERE id = $2 AND negocio_id = $3
       RETURNING *`,
      [cantidad, id, negocioId]
    );
    return result.rows[0];
  }

  // Check stock
  static async checkStock(id, negocioId) {
    const result = await db.query(
      `SELECT id, nombre, stock_actual, stock_minimo,
        CASE WHEN stock_actual <= stock_minimo THEN true ELSE false END as bajo_stock
       FROM productos 
       WHERE id = $1 AND negocio_id = $2`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  // Get products with low stock
  static async getLowStock(negocioId) {
    const result = await db.query(
      `SELECT id, nombre, stock_actual, stock_minimo
       FROM productos 
       WHERE negocio_id = $1 AND stock_actual <= stock_minimo AND activo = true
       ORDER BY (stock_actual - stock_minimo) ASC`,
      [negocioId]
    );
    return result.rows;
  }

  // Delete (soft delete)
  static async deactivate(id, negocioId) {
    const result = await db.query(
      `UPDATE productos SET activo = false, updated_at = NOW()
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId]
    );
    return result.rows[0];
  }

  // Add personalizacion
  static async addPersonalizacion(productoId, negocioId, data) {
    const { tipo, nombre, precio_adicional, foto_capa, posicion } = data;

    const result = await db.query(
      `INSERT INTO opciones_personalizacion (
        negocio_id, producto_id, tipo, nombre, precio_adicional, foto_capa, posicion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [negocioId, productoId, tipo, nombre, precio_adicional || 0, foto_capa, posicion || 0]
    );

    return result.rows[0];
  }

  // Get personalizaciones
  static async getPersonalizaciones(productoId, negocioId) {
    const result = await db.query(
      `SELECT * FROM opciones_personalizacion 
       WHERE producto_id = $1 AND negocio_id = $2 AND activo = true
       ORDER BY tipo, posicion`,
      [productoId, negocioId]
    );
    return result.rows;
  }
}

module.exports = Producto;