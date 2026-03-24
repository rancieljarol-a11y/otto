// OttO - Tenant Middleware
// Ensure tenant isolation

const tenantMiddleware = async (req, res, next) => {
  if (!req.negocioId) {
    return res.status(400).json({ error: 'Negocio ID required' });
  }
  
  req.tenantId = req.negocioId;
  
  next();
};

module.exports = { tenantMiddleware };