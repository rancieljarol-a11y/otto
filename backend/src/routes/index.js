// OttO - Routes
// API REST para el SaaS

const express = require('express');
const router = express.Router();

// Import models
const Negocio = require('../models/negocio');
const Cliente = require('../models/cliente');
const Producto = require('../models/producto');
const Pedido = require('../models/pedido');
const Gastos = require('../models/gastos');
const Factura = require('../models/factura');
const Conversacion = require('../models/conversacion');
const AIService = require('../services/ai');
const WhatsAppService = require('../services/whatsapp');
const OrquestadorAgentes = require('../agents');
const config = require('../config');

// Import middleware
const { authMiddleware, validate } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const { negocioCreateSchema, productoSchema, pedidoSchema, clienteSchema, gastoSchema } = require('../validation/schemas');

// ============================================================================
// HEALTH
// ============================================================================

router.get('/health', async (req, res) => {
  const db = require('../config/database');
  const dbHealthy = await db.healthCheck();
  
  res.json({
    status: 'ok',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// NEGOCIOS
// ============================================================================

// Create negocio (onboarding)
router.post('/api/negocios', validate(negocioCreateSchema), async (req, res) => {
  try {
    if (config.nodeEnv === 'production' && req.headers['x-onboarding-secret'] !== config.security.onboardingSecret) {
      return res.status(403).json({ error: 'Onboarding forbidden' });
    }

    const { nombre, whatsapp_dueno, tipo_negocio_id } = req.body;
    
    // Generate slug
    const slug = nombre.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
    
    const negocio = await Negocio.create({
      nombre,
      slug: `${slug}-${Date.now()}`,
      whatsapp_dueno,
      tipo_negocio_id,
      plan: 'founder'
    });

    // Create initial conversation for owner
    const cliente = await Cliente.upsert(negocio.id, whatsapp_dueno, { nombre: 'Dueño' });
    await Conversacion.upsert(negocio.id, cliente.id);

    res.status(201).json(negocio);
  } catch (error) {
    console.error('Error creating negocio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get my negocio
router.get('/api/negocios/me', authMiddleware, async (req, res) => {
  try {
    const negocio = await Negocio.findById(req.negocioId);
    if (!negocio) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(negocio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update negocio
router.put('/api/negocios/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const negocio = await Negocio.update(req.params.id, req.body);
    res.json(negocio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update negocio (me)
router.put('/api/negocios/me', authMiddleware, async (req, res) => {
  try {
    const negocio = await Negocio.update(req.negocioId, req.negocioId, req.body);
    res.json(negocio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List negocios (admin)
router.get('/api/negocios', authMiddleware, async (req, res) => {
  try {
    const negocios = await Negocio.list(req.query);
    res.json(negocios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CLIENTES
// ============================================================================

// List clientes
router.get('/api/clientes', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const clientes = await Cliente.list(req.negocioId, req.query);
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats
router.get('/api/clientes/stats', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const stats = await Cliente.getStats(req.negocioId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cliente
router.get('/api/clientes/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id, req.negocioId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cliente
router.put('/api/clientes/:id', authMiddleware, tenantMiddleware, validate(clienteSchema), async (req, res) => {
  try {
    const cliente = await Cliente.update(req.params.id, req.negocioId, req.body);
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block cliente
router.post('/api/clientes/:id/block', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const cliente = await Cliente.block(req.params.id, req.negocioId);
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create cliente
router.post('/api/clientes', authMiddleware, tenantMiddleware, validate(clienteSchema), async (req, res) => {
  try {
    const { nombre, email } = req.body;
    const cliente = await Cliente.create(req.negocioId, req.body.numero_whatsapp, { nombre, email });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GASTOS
// ============================================================================

// List gastos
router.get('/api/gastos', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0, desde, hasta, categoria } = req.query;
    const gastos = await Gastos.list(req.negocioId, { limit: parseInt(limit), offset: parseInt(offset), desde, hasta, categoria });
    res.json(gastos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create gasto
router.post('/api/gastos', authMiddleware, tenantMiddleware, validate(gastoSchema), async (req, res) => {
  try {
    const gasto = await Gastos.create(req.negocioId, req.body);
    res.json(gasto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get gastos stats
router.get('/api/gastos/stats', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const stats = await Gastos.getStats(req.negocioId, desde, hasta);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FACTURAS
// ============================================================================

// List facturas
router.get('/api/facturas', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const facturas = await Factura.list(req.negocioId, { limit: 50 });
    res.json(facturas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create factura
router.post('/api/facturas', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const factura = await Factura.createFromPedido(req.negocioId, req.body.pedido_id);
    res.json(factura);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PRODUCTOS
// ============================================================================

// List productos
router.get('/api/productos', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const productos = await Producto.list(req.negocioId, req.query);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create producto
router.post('/api/productos', authMiddleware, tenantMiddleware, validate(productoSchema), async (req, res) => {
  try {
    const producto = await Producto.create(req.negocioId, req.body);
    res.status(201).json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories
router.get('/api/productos/categorias', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const categorias = await Producto.getCategories(req.negocioId);
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock
router.get('/api/productos/low-stock', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const productos = await Producto.getLowStock(req.negocioId);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get producto
router.get('/api/productos/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id, req.negocioId);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update producto
router.put('/api/productos/:id', authMiddleware, tenantMiddleware, validate(productoSchema), async (req, res) => {
  try {
    const producto = await Producto.update(req.params.id, req.negocioId, req.body);
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete producto (soft)
router.delete('/api/productos/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const producto = await Producto.deactivate(req.params.id, req.negocioId);
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PEDIDOS
// ============================================================================

// List pedidos
router.get('/api/pedidos', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const pedidos = await Pedido.list(req.negocioId, req.query);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create pedido
router.post('/api/pedidos', authMiddleware, tenantMiddleware, validate(pedidoSchema), async (req, res) => {
  try {
    const { cliente_id, productos, personalizacion, notas_especiales, origen, metodo_pago } = req.body;
    
    const pedido = await Pedido.create(req.negocioId, cliente_id, {
      productos,
      personalizacion,
      notas_especiales,
      origen,
      metodo_pago,
      agregado_por: req.user?.email || 'sistema'
    });

    res.status(201).json(pedido);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats
router.get('/api/pedidos/stats', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const stats = await Pedido.getStats(req.negocioId, desde, hasta);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recent orders
router.get('/api/pedidos/recientes', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const pedidos = await Pedido.getRecientes(req.negocioId, parseInt(req.query.limit) || 10);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pending orders
router.get('/api/pedidos/pendientes', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const pedidos = await Pedido.getPendientes(req.negocioId);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pedido
router.get('/api/pedidos/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id, req.negocioId);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update pedido estado
router.patch('/api/pedidos/:id/estado', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { estado } = req.body;
    const pedido = await Pedido.updateEstado(req.params.id, req.negocioId, estado);
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel pedido
router.post('/api/pedidos/:id/cancel', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { motivo } = req.body;
    const pedido = await Pedido.cancel(req.params.id, req.negocioId, motivo);
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DASHBOARD
// ============================================================================

router.get('/api/dashboard/resumen', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const [pedidoStats, pedidosRecientes, clientesStats, productosLowStock] = await Promise.all([
      Pedido.getStats(req.negocioId),
      Pedido.getRecientes(req.negocioId, 5),
      Cliente.getStats(req.negocioId),
      Producto.getLowStock(req.negocioId),
    ]);

    res.json({
      stats: pedidoStats,
      recent_orders: pedidosRecientes,
      clients: clientesStats,
      low_stock: productosLowStock,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// WHATSAPP WEBHOOK
// ============================================================================

// Webhook verify
router.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'] || req.query.mode;
  const token = req.query['hub.verify_token'] || req.query.token;
  const challenge = req.query['hub.challenge'] || req.query.challenge;
  const verifyToken = config.whatsapp.webhookVerifyToken;

  if (WhatsAppService.verifyWebhook(mode, token, verifyToken)) {
    return res.status(200).send(challenge || 'OK');
  }

  return res.status(403).send('Forbidden');
});

// Test endpoint para obtener última respuesta
const ultimasRespuestas = {};

router.post('/webhook/whatsapp', async (req, res) => {
  try {
    const mensaje = await WhatsAppService.processWebhook(req.body);

    if (!mensaje) {
      return res.status(200).send('OK');
    }

    const numeroKey = mensaje.from;

    if (!mensaje.negocio_id) {
      console.warn('Webhook sin negocio_id resuelto para', mensaje.display_phone);
      return res.status(200).send('Negocio no resuelto');
    }

    const resultado = await OrquestadorAgentes.procesarMensaje(
      mensaje.contenido,
      mensaje.from,
      mensaje.negocio_id || null
    );

    if (resultado?.bloqueado) {
      console.log('Mensaje bloqueado:', resultado.razon);
      return res.status(200).send('Bloqueado');
    }

    // Guardar respuesta para el polling
    if (resultado?.texto) {
      ultimasRespuestas[numeroKey] = resultado.texto;
      
      await WhatsAppService.sendMessage(
        mensaje.from,
        resultado.texto,
        resultado.negocio_id
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Endpoint para obtener última respuesta (polling desde el chat)
router.get('/api/test/ultima_respuesta', async (req, res) => {
  const { numero } = req.query;
  res.json({ respuesta: ultimasRespuestas[numero] || null });
});

// ============================================================================
// CONVERSACIONES
// ============================================================================

// Get active conversations
router.get('/api/conversaciones', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const conversaciones = await Conversacion.getActivas(req.negocioId);
    res.json(conversaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending handoffs
router.get('/api/conversaciones/handoff', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const conversaciones = await Conversacion.getPendientesHandoff(req.negocioId);
    res.json(conversaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request handoff
router.post('/api/conversaciones/:id/handoff', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const conversacion = await Conversacion.requestHandoff(req.params.id, req.negocioId);
    res.json(conversacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Release from handoff
router.post('/api/conversaciones/:id/release', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const conversacion = await Conversacion.releaseFromHandoff(req.params.id, req.negocioId);
    res.json(conversacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SEND MESSAGE (Manual)
// ============================================================================

router.post('/api/whatsapp/send', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { to, message } = req.body;
    await WhatsAppService.sendMessage(to, message, req.negocioId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
// ============================================================================
// AUTH - Login simple
// ============================================================================

router.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Buscar negocio por email
    const result = await config.db.query(
      'SELECT id, nombre, email, password_hash FROM negocios WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const negocio = result.rows[0];
    
    // Verificar contraseña (simple comparison - en producción usar bcrypt)
    if (password !== 'demo123') {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar token simple
    const token = Buffer.from(`${negocio.id}:${Date.now()}`).toString('base64');
    
    res.json({
      token,
      negocio_id: negocio.id,
      nombre: negocio.nombre
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});
