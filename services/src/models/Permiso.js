const { v4: uuidv4 } = require('uuid');
const Database = require('../database/postgres');

/**
 * Permiso Model
 * Represents a vehicle permit
 */
class Permiso {
  constructor(data = {}) {
    this.id = data.id || null;
    this.folio = data.folio || null;
    this.vehicleId = data.vehicle_id || data.vehicleId || null;
    this.userId = data.user_id || data.userId || null;
    this.permitType = data.permit_type || data.permitType || null;
    this.permitNumber = data.permit_number || data.permitNumber || null;
    this.issueDate = data.issue_date || data.issueDate || null;
    this.expiryDate = data.expiry_date || data.expiryDate || null;
    this.validFrom = data.valid_from || data.validFrom || null;
    this.validUntil = data.valid_until || data.validUntil || null;
    this.status = data.status || 'pending';
    this.state = data.state || null;
    this.municipality = data.municipality || null;
    this.vehicleVin = data.vehicle_vin || data.vehicleVin || null;
    this.vehiclePlate = data.vehicle_plate || data.vehiclePlate || null;
    this.vehicleMake = data.vehicle_make || data.vehicleMake || null;
    this.vehicleModel = data.vehicle_model || data.vehicleModel || null;
    this.vehicleYear = data.vehicle_year || data.vehicleYear || null;
    this.paymentId = data.payment_id || data.paymentId || null;
    this.amount = data.amount || 0;
    this.currency = data.currency || 'MXN';
    this.documentId = data.document_id || data.documentId || null;
    this.observations = data.observations || null;
    this.issuerId = data.issuer_id || data.issuerId || null;
    this.issuerName = data.issuer_name || data.issuerName || null;
    this.createdAt = data.created_at || data.createdAt || null;
    this.updatedAt = data.updated_at || data.updatedAt || null;
  }

  /**
   * Generate a unique folio
   */
  static generateFolio() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PV-${timestamp}-${random}`;
  }

  /**
   * Find all permisos with filters
   */
  static async findAll(filters = {}) {
    const { userId, vehicleId, status, state, page = 1, limit = 20 } = filters;
    
    let query = 'SELECT * FROM permisos_vehiculares WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (vehicleId) {
      query += ` AND vehicle_id = $${paramIndex++}`;
      params.push(vehicleId);
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (state) {
      query += ` AND state = $${paramIndex++}`;
      params.push(state);
    }

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, (page - 1) * limit);

    const result = await Database.query(query, params);
    return result.rows.map(row => new Permiso(row));
  }

  /**
   * Find permiso by ID
   */
  static async findById(id) {
    const result = await Database.query(
      'SELECT * FROM permisos_vehiculares WHERE id = $1',
      [id]
    );
    return result.rows[0] ? new Permiso(result.rows[0]) : null;
  }

  /**
   * Find permiso by folio
   */
  static async findByFolio(folio) {
    const result = await Database.query(
      'SELECT * FROM permisos_vehiculares WHERE folio = $1',
      [folio]
    );
    return result.rows[0] ? new Permiso(result.rows[0]) : null;
  }

  /**
   * Find permiso by permit number
   */
  static async findByPermitNumber(permitNumber) {
    const result = await Database.query(
      'SELECT * FROM permisos_vehiculares WHERE permit_number = $1',
      [permitNumber]
    );
    return result.rows[0] ? new Permiso(result.rows[0]) : null;
  }

  /**
   * Find permiso by vehicle plate
   */
  static async findByVehiclePlate(plate) {
    const result = await Database.query(
      'SELECT * FROM permisos_vehiculares WHERE vehicle_plate = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [plate, 'active']
    );
    return result.rows[0] ? new Permiso(result.rows[0]) : null;
  }

  /**
   * Create a new permiso
   */
  async save() {
    const query = `
      INSERT INTO permisos_vehiculares (
        folio, vehicle_id, user_id, permit_type, permit_number,
        issue_date, expiry_date, valid_from, valid_until, status,
        state, municipality, vehicle_vin, vehicle_plate, vehicle_make,
        vehicle_model, vehicle_year, payment_id, amount, currency,
        document_id, observations, issuer_id, issuer_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;

    const params = [
      this.folio || Permiso.generateFolio(),
      this.vehicleId,
      this.userId,
      this.permitType,
      this.permitNumber,
      this.issueDate,
      this.expiryDate,
      this.validFrom,
      this.validUntil,
      this.status,
      this.state,
      this.municipality,
      this.vehicleVin,
      this.vehiclePlate,
      this.vehicleMake,
      this.vehicleModel,
      this.vehicleYear,
      this.paymentId,
      this.amount,
      this.currency,
      this.documentId,
      this.observations,
      this.issuerId,
      this.issuerName,
    ];

    const result = await Database.query(query, params);
    const savedPermiso = new Permiso(result.rows[0]);
    Object.assign(this, savedPermiso);
    return this;
  }

  /**
   * Update existing permiso
   */
  async update() {
    if (!this.id) {
      throw new Error('Cannot update permiso without ID');
    }

    const query = `
      UPDATE permisos_vehiculares SET
        permit_type = $1,
        permit_number = $2,
        issue_date = $3,
        expiry_date = $4,
        valid_from = $5,
        valid_until = $6,
        status = $7,
        state = $8,
        municipality = $9,
        vehicle_vin = $10,
        vehicle_plate = $11,
        vehicle_make = $12,
        vehicle_model = $13,
        vehicle_year = $14,
        payment_id = $15,
        amount = $16,
        currency = $17,
        document_id = $18,
        observations = $19,
        updated_at = NOW()
      WHERE id = $20
      RETURNING *
    `;

    const params = [
      this.permitType,
      this.permitNumber,
      this.issueDate,
      this.expiryDate,
      this.validFrom,
      this.validUntil,
      this.status,
      this.state,
      this.municipality,
      this.vehicleVin,
      this.vehiclePlate,
      this.vehicleMake,
      this.vehicleModel,
      this.vehicleYear,
      this.paymentId,
      this.amount,
      this.currency,
      this.documentId,
      this.observations,
      this.id,
    ];

    const result = await Database.query(query, params);
    return result.rows[0] ? new Permiso(result.rows[0]) : null;
  }

  /**
   * Delete permiso
   */
  async delete() {
    if (!this.id) {
      throw new Error('Cannot delete permiso without ID');
    }

    await Database.query('DELETE FROM permisos_vehiculares WHERE id = $1', [this.id]);
    return true;
  }

  /**
   * Check if permit is valid (active and not expired)
   */
  isValid() {
    return this.status === 'active' && new Date(this.expiryDate) > new Date();
  }

  /**
   * Check if permit is expiring soon (within 30 days)
   */
  isExpiringSoon() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return this.status === 'active' && 
           new Date(this.expiryDate) <= thirtyDaysFromNow && 
           new Date(this.expiryDate) > new Date();
  }

  /**
   * Convert to JSON for API response
   */
  toJSON() {
    return {
      id: this.id,
      folio: this.folio,
      vehicleId: this.vehicleId,
      userId: this.userId,
      permitType: this.permitType,
      permitNumber: this.permitNumber,
      issueDate: this.issueDate,
      expiryDate: this.expiryDate,
      validFrom: this.validFrom,
      validUntil: this.validUntil,
      status: this.status,
      state: this.state,
      municipality: this.municipality,
      vehicle: {
        vin: this.vehicleVin,
        plate: this.vehiclePlate,
        make: this.vehicleMake,
        model: this.vehicleModel,
        year: this.vehicleYear,
      },
      paymentId: this.paymentId,
      amount: this.amount,
      currency: this.currency,
      documentId: this.documentId,
      observations: this.observations,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Permiso;
