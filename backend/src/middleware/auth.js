// OttO - Middleware
// Auth and tenant isolation

const jwt = require('jsonwebtoken');
const config = require('../config');

// Auth middleware (Clerk integration would go here)
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    // For development, allow a dev token
    if (config.nodeEnv === 'development' && req.headers['x-dev-token']) {
      req.user = { id: 'dev-user', email: 'dev@otto.app' };
      req.negocioId = req.headers['x-negocio-id'];
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    
    // Get negocio from Clerk metadata or JWT
    req.negocioId = decoded.negocio_id || req.headers['x-negocio-id'];
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Tenant middleware - ensures tenant isolation
const tenantMiddleware = async (req, res, next) => {
  if (!req.negocioId) {
    return res.status(400).json({ error: 'Negocio ID required' });
  }
  
  // Store tenant ID in request for use in queries
  req.tenantId = req.negocioId;
  
  next();
};

// Rate limiting
const rateLimit = (options = {}) => {
  const { windowMs = 60000, max = 100 } = options;
  
  const store = new Map();
  
  return (req, res, next) => {
    const key = req.negocioId || req.ip;
    const now = Date.now();
    
    if (!store.has(key)) {
      store.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    
    const window = store.get(key);
    
    if (now > window.reset) {
      store.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    
    if (window.count >= max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    window.count++;
    next();
  };
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const details = error.details.map(d => d.message);
      return res.status(400).json({ error: 'Validation failed', details });
    }
    
    next();
  };
};

// Error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  const status = err.status || 500;
  const message = config.nodeEnv === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(status).json({ error: message, ...(config.nodeEnv !== 'production' && { stack: err.stack }) });
};

module.exports = {
  authMiddleware,
  tenantMiddleware,
  rateLimit,
  validate,
  errorHandler
};