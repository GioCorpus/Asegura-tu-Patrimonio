const express = require('express');
const router = express.Router();
const PermisoController = require('../controllers/PermisoController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Permisos Routes
 * /api/v1/permisos
 */

// Public routes

/**
 * GET /api/v1/permisos/verify/:code
 * Verify a permit by folio, permit number, or verification code
 */
router.get(
  '/verify/:code',
  asyncHandler(PermisoController.verifyPublic)
);

/**
 * GET /api/v1/permisos/verify
 * Verify a permit using query parameters
 */
router.get(
  '/verify',
  validate(schemas.verifyPermit, 'query'),
  asyncHandler(PermisoController.verifyPublic)
);

// Protected routes - require authentication

/**
 * GET /api/v1/permisos
 * Get all permisos with filters
 * Query params: userId, vehicleId, status, state, page, limit
 */
router.get(
  '/',
  authenticate,
  validate(schemas.permisoFilters, 'query'),
  asyncHandler(PermisoController.findAll)
);

/**
 * GET /api/v1/permisos/my-permits
 * Get current user's permits
 */
router.get(
  '/my-permits',
  authenticate,
  asyncHandler(PermisoController.getMyPermits)
);

/**
 * GET /api/v1/permisos/:id
 * Get permiso by ID
 */
router.get(
  '/:id',
  authenticate,
  validate(schemas.idParam, 'params'),
  asyncHandler(PermisoController.findById)
);

/**
 * POST /api/v1/permisos
 * Create a new permiso
 */
router.post(
  '/',
  authenticate,
  validate(schemas.createPermiso),
  asyncHandler(PermisoController.create)
);

/**
 * PUT /api/v1/permisos/:id
 * Update permiso
 */
router.put(
  '/:id',
  authenticate,
  validate(schemas.idParam, 'params'),
  validate(schemas.updatePermiso),
  asyncHandler(PermisoController.update)
);

/**
 * DELETE /api/v1/permisos/:id
 * Delete permiso (soft delete by changing status to cancelled)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(schemas.idParam, 'params'),
  asyncHandler(PermisoController.cancel)
);

/**
 * POST /api/v1/permisos/:id/activate
 * Activate a permiso (after payment)
 */
router.post(
  '/:id/activate',
  authenticate,
  validate(schemas.idParam, 'params'),
  asyncHandler(PermisoController.activate)
);

/**
 * POST /api/v1/permisos/:id/verify
 * Create a verification record for a permiso
 */
router.post(
  '/:id/verify',
  authenticate,
  validate(schemas.idParam, 'params'),
  asyncHandler(PermisoController.createVerification)
);

/**
 * GET /api/v1/permisos/:id/verifications
 * Get verification history for a permiso
 */
router.get(
  '/:id/verifications',
  authenticate,
  validate(schemas.idParam, 'params'),
  asyncHandler(PermisoController.getVerifications)
);

/**
 * POST /api/v1/permisos/:id/renew
 * Renew an expired permiso
 */
router.post(
  '/:id/renew',
  authenticate,
  validate(schemas.idParam, 'params'),
  asyncHandler(PermisoController.renew)
);

module.exports = router;
