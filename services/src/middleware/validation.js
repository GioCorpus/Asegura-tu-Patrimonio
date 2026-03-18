const Joi = require('joi');

/**
 * Validation Middleware Factory
 * Creates middleware to validate request data against a schema
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        errors,
      });
    }

    // Replace the validated data
    req[property] = value;
    next();
  };
};

/**
 * Common Validation Schemas
 */
const schemas = {
  // UUID validation
  uuid: Joi.string().uuid({
    version: ['uuidv4', 'uuidv5'],
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
  }),

  // Create Permiso Schema
  createPermiso: Joi.object({
    vehicleId: Joi.string().uuid().required(),
    permitType: Joi.string()
      .valid('circulacion', 'temporal', 'remolque', 'motocicleta', 'especial')
      .required(),
    state: Joi.string().min(2).max(50).required(),
    municipality: Joi.string().min(2).max(100).optional(),
    expiryDate: Joi.date().iso().min('now').required(),
    vehicleVin: Joi.string().length(17).optional(),
    vehiclePlate: Joi.string().max(10).optional(),
    observations: Joi.string().max(500).optional(),
  }),

  // Update Permiso Schema
  updatePermiso: Joi.object({
    permitType: Joi.string()
      .valid('circulacion', 'temporal', 'remolque', 'motocicleta', 'especial'),
    status: Joi.string()
      .valid('pending', 'active', 'expired', 'cancelled', 'suspended', 'revoked'),
    expiryDate: Joi.date().iso(),
    state: Joi.string().min(2).max(50),
    municipality: Joi.string().min(2).max(100),
    observations: Joi.string().max(500),
  }),

  // Permiso filters
  permisoFilters: Joi.object({
    userId: Joi.string().uuid(),
    vehicleId: Joi.string().uuid(),
    status: Joi.string().valid('pending', 'active', 'expired', 'cancelled', 'suspended', 'revoked'),
    state: Joi.string(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Verify permit schema
  verifyPermit: Joi.object({
    folio: Joi.string(),
    permitNumber: Joi.string(),
    verificationCode: Joi.string(),
  }).or('folio', 'permitNumber', 'verificationCode'),

  // ID parameter
  idParam: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

module.exports = {
  validate,
  schemas,
};
