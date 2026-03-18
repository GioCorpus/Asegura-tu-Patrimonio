const { v4: uuidv4 } = require('uuid');
const Database = require('../database/postgres');

/**
 * PermisoVerification Model
 * Represents a permit verification record for audit trail
 */
class PermisoVerification {
  constructor(data = {}) {
    this.id = data.id || null;
    this.permisoId = data.permiso_id || data.permisoId || null;
    this.verifiedBy = data.verified_by || data.verifiedBy || null;
    this.verifierName = data.verifier_name || data.verifierName || null;
    this.verificationType = data.verification_type || data.verificationType || 'system';
    this.isValid = data.is_valid || data.isValid || false;
    this.verificationCode = data.verification_code || data.verificationCode || null;
    this.verificationUrl = data.verification_url || data.verificationUrl || null;
    this.verificationLocation = data.verification_location || data.verificationLocation || null;
    this.ipAddress = data.ip_address || data.ipAddress || null;
    this.notes = data.notes || null;
    this.createdAt = data.created_at || data.createdAt || null;
  }

  /**
   * Generate a unique verification code
   */
  static generateVerificationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Format as XXXX-XXXX-XXXX
    return code.match(/.{1,4}/g).join('-');
  }

  /**
   * Create verification code URL
   */
  static generateVerificationUrl(permisoId, code) {
    return `${process.env.VERIFICATION_BASE_URL || 'https://asegura.gob.mx/verificar'}/${permisoId}/${code}`;
  }

  /**
   * Find all verifications for a permiso
   */
  static async findByPermisoId(permisoId) {
    const result = await Database.query(
      'SELECT * FROM permiso_verifications WHERE permiso_id = $1 ORDER BY created_at DESC',
      [permisoId]
    );
    return result.rows.map(row => new PermisoVerification(row));
  }

  /**
   * Find verification by code
   */
  static async findByCode(verificationCode) {
    const result = await Database.query(
      'SELECT * FROM permiso_verifications WHERE verification_code = $1',
      [verificationCode]
    );
    return result.rows[0] ? new PermisoVerification(result.rows[0]) : null;
  }

  /**
   * Create a new verification record
   */
  async save() {
    // Generate verification code if not provided
    if (!this.verificationCode) {
      this.verificationCode = PermisoVerification.generateVerificationCode();
    }

    // Generate verification URL
    if (this.permisoId && !this.verificationUrl) {
      this.verificationUrl = PermisoVerification.generateVerificationUrl(this.permisoId, this.verificationCode);
    }

    const query = `
      INSERT INTO permiso_verifications (
        permiso_id, verified_by, verifier_name, verification_type,
        is_valid, verification_code, verification_url,
        verification_location, ip_address, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const params = [
      this.permisoId,
      this.verifiedBy,
      this.verifierName,
      this.verificationType,
      this.isValid,
      this.verificationCode,
      this.verificationUrl,
      this.verificationLocation,
      this.ipAddress,
      this.notes,
    ];

    const result = await Database.query(query, params);
    const savedVerification = new PermisoVerification(result.rows[0]);
    Object.assign(this, savedVerification);
    return this;
  }

  /**
   * Convert to JSON for API response
   */
  toJSON() {
    return {
      id: this.id,
      permisoId: this.permisoId,
      verifiedBy: this.verifiedBy,
      verifierName: this.verifierName,
      verificationType: this.verificationType,
      isValid: this.isValid,
      verificationCode: this.verificationCode,
      verificationUrl: this.verificationUrl,
      verificationLocation: this.verificationLocation,
      createdAt: this.createdAt,
    };
  }
}

module.exports = PermisoVerification;
