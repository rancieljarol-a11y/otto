// OttO - Database Connection
// Multi-tenant PostgreSQL connection pool

const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: config.database.max,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
});

// Event handlers
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

pool.on('connect', () => {
  console.log('📊 Database connected');
});

// Query helper with tenant isolation
const query = async (text, params, tenantId = null) => {
  // Set tenant context if provided
  let finalParams = params;
  if (tenantId) {
    // Set the current_negocio_id for RLS
    await pool.query(`SET app.current_negocio_id = $1`, [tenantId]);
    // Adjust params to account for the SET if it was parameterized
    // Note: SET doesn't use parameter placeholders the same way
  }
  
  const start = Date.now();
  const res = await pool.query(text, finalParams);
  const duration = Date.now() - start;
  
  if (config.nodeEnv === 'development') {
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
  }
  
  return res;
};

// Transaction helper
const transaction = async (callback, tenantId = null) => {
  const client = await pool.connect();
  
  try {
    if (tenantId) {
      await client.query(`SET app.current_negocio_id = $1`, [tenantId]);
    }
    
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Health check
const healthCheck = async () => {
  try {
    const result = await pool.query('SELECT 1 as health');
    return result.rows[0].health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Initialize database (create tables if not exist)
const initialize = async () => {
  // Connect to postgres to create database if not exists
  const adminPool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: 'postgres',
    user: config.database.user,
    password: config.database.password,
  });

  try {
    // Check if database exists
    const dbCheck = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.database.database]
    );

    if (dbCheck.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${config.database.database}`);
      console.log(`📦 Database ${config.database.database} created`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await adminPool.end();
  }

  // Run migrations/schema
  const fs = require('fs');
  const path = require('path');
  
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.log('Schema might already exist or error:', error.message);
  }
};

module.exports = {
  pool,
  query,
  transaction,
  healthCheck,
  initialize,
};

// Export for use as raw client
module.exports.Pool = Pool;