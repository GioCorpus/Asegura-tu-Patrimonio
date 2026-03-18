require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { logger, notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const Database = require('./database/postgres');
const Redis = require('./database/redis');

// Import routes
const permisosRoutes = require('./routes/permisos');

/**
 * Create Express Application
 */
const app = express();

/**
 * Security Middleware
 */
app.use(helmet());

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: config.get('security.cors.origin') || '*',
  credentials: config.get('security.cors.credentials') || true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

/**
 * Request Logging
 */
if (config.get('app.env') === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/**
 * Rate Limiting
 */
const limiter = rateLimit({
  windowMs: config.get('rateLimit.windowMs') || 15 * 60 * 1000,
  max: config.get('rateLimit.max') || 100,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later.',
  },
});
app.use('/api', limiter);

/**
 * Body Parsing
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Health Check Endpoint
 */
app.get('/health', async (req, res) => {
  const dbHealth = await Database.healthCheck();
  const redisHealth = await Redis.healthCheck();

  const isHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    service: config.get('app.name'),
    version: config.get('app.version'),
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealth.database,
      redis: redisHealth.redis,
    },
  });
});

/**
 * API Info Endpoint
 */
app.get('/api', (req, res) => {
  res.json({
    service: config.get('app.name'),
    version: config.get('app.version'),
    description: 'Vehicle Permits Microservice',
    endpoints: {
      health: 'GET /health',
      permisos: 'GET /api/v1/permisos',
      verify: 'GET /api/v1/permisos/verify/:code',
    },
  });
});

/**
 * API Routes
 */
const apiPrefix = config.get('app.apiPrefix') || '/api/v1';
app.use(`${apiPrefix}/permisos`, permisosRoutes);

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Start Server
 */
const PORT = config.get('app.port') || 3004;

const startServer = async () => {
  try {
    // Test database connection
    await Database.query('SELECT 1');
    logger.info('Database connected successfully');

    // Test Redis connection
    await Redis.connect();
    logger.info('Redis connected successfully');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`${config.get('app.name')} v${config.get('app.version')} running on port ${PORT}`);
      logger.info(`Environment: ${config.get('app.env')}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await Database.close();
  await Redis.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await Database.close();
  await Redis.close();
  process.exit(0);
});

// Export for testing
module.exports = app;

// Start server if run directly
if (require.main === module) {
  startServer();
}
