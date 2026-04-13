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
const query = async (text, params = [], tenantId = null) => {
  const start = Date.now();

  if (!tenantId) {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development') {
      console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_negocio_id', $1, true)`, [String(tenantId)]);
    const res = await client.query(text, params);
    await client.query('COMMIT');
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development') {
      console.log('Executed tenant query', { text: text.substring(0, 80), duration, rows: res.rowCount, tenantId });
    }
    return res;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Transaction helper
const transaction = async (callback, tenantId = null) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    if (tenantId) {
      await client.query(`SELECT set_config('app.current_negocio_id', $1, true)`, [String(tenantId)]);
    }
    
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