const { createClient } = require('redis');
const config = require('../config');

let client = null;

/**
 * Redis Cache Manager
 */
class Redis {
  /**
   * Get or create Redis client
   */
  static getClient() {
    if (!client) {
      client = createClient({
        url: config.getRedisUrl(),
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      client.on('connect', () => {
        console.log('Redis connected');
      });

      client.on('disconnect', () => {
        console.log('Redis disconnected');
      });
    }

    return client;
  }

  /**
   * Connect to Redis
   */
  static async connect() {
    const redisClient = this.getClient();
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return redisClient;
  }

  /**
   * Set cache value
   */
  static async set(key, value, ttlSeconds = 3600) {
    const redisClient = this.getClient();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setEx(key, ttlSeconds, serialized);
  }

  /**
   * Get cache value
   */
  static async get(key) {
    const redisClient = this.getClient();
    const value = await redisClient.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Delete cache value
   */
  static async del(key) {
    const redisClient = this.getClient();
    await redisClient.del(key);
  }

  /**
   * Check if key exists
   */
  static async exists(key) {
    const redisClient = this.getClient();
    return await redisClient.exists(key);
  }

  /**
   * Check Redis connection
   */
  static async healthCheck() {
    try {
      const redisClient = this.getClient();
      if (!redisClient.isOpen) {
        return {
          status: 'unhealthy',
          redis: 'down',
          error: 'Redis not connected',
        };
      }
      
      await redisClient.ping();
      return {
        status: 'healthy',
        redis: 'up',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        redis: 'down',
        error: error.message,
      };
    }
  }

  /**
   * Close Redis connection
   */
  static async close() {
    if (client && client.isOpen) {
      await client.quit();
      client = null;
    }
  }
}

module.exports = Redis;
