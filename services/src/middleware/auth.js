const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Authentication Middleware
 * Validates JWT tokens from API Gateway
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No authorization token provided',
      });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid authorization header format',
      });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.get('jwt.secret'));
      
      // Attach user info to request
      req.user = {
        id: decoded.sub || decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || [],
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'TOKEN_EXPIRED',
          message: 'Authorization token has expired',
        });
      }

      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid authorization token',
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Authentication failed',
    });
  }
};

/**
 * Authorization Middleware
 * Checks if user has required role/permissions
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Optional Authentication Middleware
 * Attaches user if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      
      try {
        const decoded = jwt.verify(token, config.get('jwt.secret'));
        req.user = {
          id: decoded.sub || decoded.userId,
          email: decoded.email,
          role: decoded.role || 'user',
          permissions: decoded.permissions || [],
        };
      } catch (jwtError) {
        // Token invalid, continue without user
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
