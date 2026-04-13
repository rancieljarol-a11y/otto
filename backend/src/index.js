// OttO - Main Server
// Express server for the SaaS platform

const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const { errorHandler } = require('./middleware/auth');
const db = require('./config/database');
const path = require('path');

const app = express();

// Middleware
const allowedOrigins = config.security.corsOrigins;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.nodeEnv === 'development') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS blocked'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-dev-token', 'x-negocio-id', 'x-onboarding-secret']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivo HTML de chat de prueba
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'chat.html'));
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  res.json({
    status: 'ok',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use(routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

// Start server
const start = async () => {
  try {
    if (config.nodeEnv === 'production' && !config.jwt.secret) {
      throw new Error('JWT_SECRET es obligatorio en producción');
    }

    // Initialize database
    await db.initialize();
    console.log('✅ Database initialized');
    
    // Start listening
    app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   🚀 OttO Server Running                      ║
║                                               ║
║   Port: ${config.port}                            ║
║   Environment: ${config.nodeEnv}                    ║
║   Database: ${config.database.database}                 ║
║                                               ║
╚═══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

module.exports = app;