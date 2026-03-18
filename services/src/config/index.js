const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

/**
 * Configuration Loader
 * Loads configuration from config.yaml and environment variables
 */
class Config {
  constructor() {
    this.config = {};
    this.load();
  }

  load() {
    // Load config.yaml
    const configPath = path.join(__dirname, '..', 'config.yaml');
    
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.parse(configFile);
    } catch (error) {
      console.error('Failed to load config.yaml:', error.message);
      this.config = {};
    }

    // Override with environment variables
    this.applyEnvOverrides();
  }

  applyEnvOverrides() {
    // Database overrides
    if (process.env.DB_HOST) this.config.database.host = process.env.DB_HOST;
    if (process.env.DB_PORT) this.config.database.port = parseInt(process.env.DB_PORT, 10);
    if (process.env.DB_USER) this.config.database.username = process.env.DB_USER;
    if (process.env.DB_PASSWORD) this.config.database.password = process.env.DB_PASSWORD;
    if (process.env.DB_NAME) this.config.database.name = process.env.DB_NAME;

    // Redis overrides
    if (process.env.REDIS_HOST) this.config.redis.host = process.env.REDIS_HOST;
    if (process.env.REDIS_PORT) this.config.redis.port = parseInt(process.env.REDIS_PORT, 10);
    if (process.env.REDIS_PASSWORD) this.config.redis.password = process.env.REDIS_PASSWORD;

    // JWT overrides
    if (process.env.JWT_SECRET) this.config.jwt.secret = process.env.JWT_SECRET;
    if (process.env.JWT_EXPIRY) this.config.jwt.expiresIn = process.env.JWT_EXPIRY;
    if (process.env.REFRESH_TOKEN_EXPIRY) this.config.jwt.refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRY;

    // App overrides
    if (process.env.NODE_ENV) this.config.app.env = process.env.NODE_ENV;
    if (process.env.PORT) this.config.app.port = parseInt(process.env.PORT, 10);

    // External services overrides
    if (process.env.VEHICLES_SERVICE_URL) this.config.external.vehicles.url = process.env.VEHICLES_SERVICE_URL;
    if (process.env.DOCUMENTS_SERVICE_URL) this.config.external.documents.url = process.env.DOCUMENTS_SERVICE_URL;
  }

  get(key) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[k];
    }
    
    return value;
  }

  getDatabaseUrl() {
    const { host, port, username, password, name } = this.config.database;
    return `postgresql://${username}:${password}@${host}:${port}/${name}`;
  }

  getRedisUrl() {
    const { host, port, password } = this.config.redis;
    if (password) {
      return `redis://:${password}@${host}:${port}`;
    }
    return `redis://${host}:${port}`;
  }
}

module.exports = new Config();
