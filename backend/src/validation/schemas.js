const Joi = require('joi');

const negocioCreateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(255).required(),
  whatsapp_dueno: Joi.string().trim().min(7).max(30).required(),
  tipo_negocio_id: Joi.string().uuid().required(),
  whatsapp_negocio: Joi.string().trim().min(7).max(30).optional().allow('', null),
  plan: Joi.string().valid('founder', 'basic', 'pro', 'enterprise').optional(),
});

const productoSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(255).required(),
  descripcion: Joi.string().allow('', null).optional(),
  precio: Joi.number().min(0).required(),
  categoria: Joi.string().trim().max(100).optional().allow('', null),
  sku: Joi.string().trim().max(100).optional().allow('', null),
  stock_actual: Joi.number().integer().min(0).optional(),
  stock_minimo: Joi.number().integer().min(0).optional(),
  activo: Joi.boolean().optional(),
  metadata: Joi.object().optional(),
});

const pedidoProductoSchema = Joi.object({
  producto_id: Joi.string().uuid().optional(),
  nombre: Joi.string().trim().min(1).required(),
  precio: Joi.number().min(0).required(),
  cantidad: Joi.number().integer().min(1).required(),
  personalizacion: Joi.object().optional(),
});

const pedidoSchema = Joi.object({
  cliente_id: Joi.string().uuid().allow(null).required(),
  productos: Joi.array().items(pedidoProductoSchema).min(1).required(),
  personalizacion: Joi.object().optional(),
  notas_especiales: Joi.string().allow('', null).optional(),
  origen: Joi.string().valid('whatsapp', 'manual', 'web', 'telefono').optional(),
  metodo_pago: Joi.string().max(50).allow('', null).optional(),
});

const clienteSchema = Joi.object({
  numero_whatsapp: Joi.string().trim().min(7).max(30).optional(),
  nombre: Joi.string().trim().min(1).max(255).optional(),
  email: Joi.string().email().optional().allow('', null),
});

const gastoSchema = Joi.object({
  descripcion: Joi.string().trim().min(2).max(255).required(),
  monto: Joi.number().min(0).required(),
  fecha: Joi.date().optional(),
  categoria: Joi.string().trim().max(100).optional().allow('', null),
  periodicidad: Joi.string().valid('mensual', 'semanal', 'anual').optional().allow('', null),
  tipo: Joi.string().valid('fijo', 'variable', 'mensual').optional(),
});

module.exports = {
  negocioCreateSchema,
  productoSchema,
  pedidoSchema,
  clienteSchema,
  gastoSchema,
};
