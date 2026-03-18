const Permiso = require('../models/Permiso');
const PermisoVerification = require('../models/PermisoVerification');
const Redis = require('../database/redis');
const { NotFoundError, BadRequestError, ConflictError } = require('../middleware/errorHandler');

/**
 * Permiso Controller
 * Handles HTTP requests for vehicle permits
 */
class PermisoController {
  /**
   * GET /api/v1/permisos
   * Get all permisos with filters
   */
  static async findAll(req, res) {
    const { userId, vehicleId, status, state, page, limit } = req.query;
    
    const filters = {
      userId,
      vehicleId,
      status,
      state,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );

    const permisos = await Permiso.findAll(filters);
    
    res.json({
      success: true,
      data: permisos.map(p => p.toJSON()),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: permisos.length,
      },
    });
  }

  /**
   * GET /api/v1/permisos/my-permits
   * Get current user's permits
   */
  static async getMyPermits(req, res) {
    const userId = req.user.id;
    const { page, limit, status } = req.query;

    const filters = {
      userId,
      status,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    };

    const permisos = await Permiso.findAll(filters);

    res.json({
      success: true,
      data: permisos.map(p => p.toJSON()),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: permisos.length,
      },
    });
  }

  /**
   * GET /api/v1/permisos/:id
   * Get permiso by ID
   */
  static async findById(req, res) {
    const { id } = req.params;

    // Try cache first
    const cacheKey = `permiso:${id}`;
    const cached = await Redis.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const permiso = await Permiso.findById(id);

    if (!permiso) {
      throw new NotFoundError('Permit not found');
    }

    // Cache for 5 minutes
    await Redis.set(cacheKey, permiso.toJSON(), 300);

    res.json({
      success: true,
      data: permiso.toJSON(),
    });
  }

  /**
   * POST /api/v1/permisos
   * Create a new permiso
   */
  static async create(req, res) {
    const userId = req.user.id;
    const data = req.body;

    // Get vehicle info from vehicles service (would be an HTTP call in production)
    // For now, we'll use the data provided
    const permiso = new Permiso({
      ...data,
      userId,
      issuerId: userId,
      issuerName: req.user.email,
      status: 'pending',
      issueDate: new Date().toISOString().split('T')[0],
      validFrom: new Date().toISOString(),
      validUntil: new Date(data.expiryDate).toISOString(),
    });

    await permiso.save();

    res.status(201).json({
      success: true,
      message: 'Permit created successfully',
      data: permiso.toJSON(),
    });
  }

  /**
   * PUT /api/v1/permisos/:id
   * Update permiso
   */
  static async update(req, res) {
    const { id } = req.params;
    const data = req.body;

    const existingPermiso = await Permiso.findById(id);

    if (!existingPermiso) {
      throw new NotFoundError('Permit not found');
    }

    // Update only allowed fields
    const allowedFields = ['permitType', 'status', 'expiryDate', 'state', 'municipality', 'observations'];
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        existingPermiso[dbField] = data[field];
      }
    });

    if (data.expiryDate) {
      existingPermiso.validUntil = new Date(data.expiryDate).toISOString();
    }

    const updatedPermiso = await existingPermiso.update();

    // Invalidate cache
    await Redis.del(`permiso:${id}`);

    res.json({
      success: true,
      message: 'Permit updated successfully',
      data: updatedPermiso.toJSON(),
    });
  }

  /**
   * DELETE /api/v1/permisos/:id
   * Cancel permiso (admin only)
   */
  static async cancel(req, res) {
    const { id } = req.params;

    const permiso = await Permiso.findById(id);

    if (!permiso) {
      throw new NotFoundError('Permit not found');
    }

    permiso.status = 'cancelled';
    await permiso.update();

    // Invalidate cache
    await Redis.del(`permiso:${id}`);

    res.json({
      success: true,
      message: 'Permit cancelled successfully',
      data: permiso.toJSON(),
    });
  }

  /**
   * POST /api/v1/permisos/:id/activate
   * Activate permiso after payment
   */
  static async activate(req, res) {
    const { id } = req.params;
    const { paymentId } = req.body;

    const permiso = await Permiso.findById(id);

    if (!permiso) {
      throw new NotFoundError('Permit not found');
    }

    if (permiso.status !== 'pending') {
      throw new BadRequestError('Permit is not in pending status');
    }

    permiso.status = 'active';
    permiso.paymentId = paymentId;
    await permiso.update();

    // Invalidate cache
    await Redis.del(`permiso:${id}`);

    res.json({
      success: true,
      message: 'Permit activated successfully',
      data: permiso.toJSON(),
    });
  }

  /**
   * GET /api/v1/permisos/verify/:code
   * Public verification of permit
   */
  static async verifyPublic(req, res) {
    const { code } = req.params;
    const { folio, permitNumber, verificationCode } = req.query;
    
    // Use code from params or query
    const searchCode = code || folio || permitNumber || verificationCode;

    let permiso;
    
    if (searchCode.includes('-')) {
      // It's likely a folio or permit number
      permiso = await Permiso.findByFolio(searchCode) || 
                await Permiso.findByPermitNumber(searchCode);
    } else {
      // Try verification code
      const verification = await PermisoVerification.findByCode(searchCode);
      if (verification) {
        permiso = await Permiso.findById(verification.permisoId);
      }
    }

    if (!permiso) {
      throw new NotFoundError('Permit not found');
    }

    const isValid = permiso.isValid();

    // Create verification record
    const verification = new PermisoVerification({
      permisoId: permiso.id,
      verificationCode: searchCode,
      verificationType: 'public',
      isValid,
      ipAddress: req.ip,
      verificationLocation: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    });
    await verification.save();

    res.json({
      success: true,
      data: {
        valid: isValid,
        permit: {
          folio: permiso.folio,
          permitNumber: permiso.permitNumber,
          status: permiso.status,
          vehiclePlate: permiso.vehiclePlate,
          expiryDate: permiso.expiryDate,
        },
        verification: {
          code: verification.verificationCode,
          timestamp: verification.createdAt,
        },
      },
    });
  }

  /**
   * POST /api/v1/permisos/:id/verify
   * Create verification record
   */
  static async createVerification(req, res) {
    const { id } = req.params;
    const { location } = req.body;

    const permiso = await Permiso.findById(id);

    if (!permiso) {
      throw new NotFoundError('Permit not found');
    }

    const verification = new PermisoVerification({
      permisoId: id,
      verifiedBy: req.user.id,
      verifierName: req.user.email,
      verificationType: 'manual',
      isValid: permiso.isValid(),
      verificationLocation: location,
      ipAddress: req.ip,
    });

    await verification.save();

    res.status(201).json({
      success: true,
      message: 'Verification created successfully',
      data: verification.toJSON(),
    });
  }

  /**
   * GET /api/v1/permisos/:id/verifications
   * Get verification history
   */
  static async getVerifications(req, res) {
    const { id } = req.params;

    const permiso = await Permiso.findById(id);

    if (!permiso) {
      throw new NotFoundError('Permit not found');
    }

    const verifications = await PermisoVerification.findByPermisoId(id);

    res.json({
      success: true,
      data: verifications.map(v => v.toJSON()),
    });
  }

  /**
   * POST /api/v1/permisos/:id/renew
   * Renew an expired permiso
   */
  static async renew(req, res) {
    const { id } = req.params;
    const { expiryDate } = req.body;

    const existingPermiso = await Permiso.findById(id);

    if (!existingPermiso) {
      throw new NotFoundError('Permit not found');
    }

    if (existingPermiso.status !== 'expired' && existingPermiso.status !== 'active') {
      throw new BadRequestError('Only active or expired permits can be renewed');
    }

    // Create new permit based on existing one
    const newPermiso = new Permiso({
      vehicleId: existingPermiso.vehicleId,
      userId: existingPermiso.userId,
      permitType: existingPermiso.permitType,
      state: existingPermiso.state,
      municipality: existingPermiso.municipality,
      vehicleVin: existingPermiso.vehicleVin,
      vehiclePlate: existingPermiso.vehiclePlate,
      vehicleMake: existingPermiso.vehicleMake,
      vehicleModel: existingPermiso.vehicleModel,
      vehicleYear: existingPermiso.vehicleYear,
      expiryDate: expiryDate,
      issuerId: req.user.id,
      issuerName: req.user.email,
      status: 'pending',
      issueDate: new Date().toISOString().split('T')[0],
      validFrom: new Date().toISOString(),
      validUntil: new Date(expiryDate).toISOString(),
    });

    await newPermiso.save();

    res.status(201).json({
      success: true,
      message: 'Permit renewed successfully',
      data: newPermiso.toJSON(),
    });
  }
}

module.exports = PermisoController;
