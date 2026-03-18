const { Pool } = require('pg');
const config = require('../config');

let pool = null;

/**
 * PostgreSQL Database Connection Manager
 */
class Database {
  /**
   * Get or create database pool
   */
  static getPool() {
    if (!pool) {
      const poolConfig = config.get('database.pool') || {};
      
      pool = new Pool({
        host: config.get('database.host'),
        port: config.get('database.port'),
        user: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        min: poolConfig.min || 2,
        max: poolConfig.max || 10,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: 5000,
      });

      // Handle pool errors
      pool.on('error', (err) => {
        console.error('Unexpected database pool error:', err);
      });
    }

    return pool;
  }

  /**
   * Execute a query
   */
  static async query(text, params) {
    const client = await this.getPool().connect();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      if (config.get('app.env') === 'development') {
        console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
      }
      
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a transaction
   */
  static async transaction(callback) {
    const client = await this.getPool().connect();
    try {
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
  }

  /**
   * Check database connection
   */
  static async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as now, version() as version');
      return {
        status: 'healthy',
        database: 'up',
        timestamp: result.rows[0].now,
        version: result.rows[0].version,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'down',
        error: error.message,
      };
    }
  }

  /**
   * Close pool connection
   */
  static async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
}

module.exports = Database;
