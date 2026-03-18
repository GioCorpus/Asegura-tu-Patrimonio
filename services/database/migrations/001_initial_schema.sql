-- Migration: 001_initial_schema.sql
-- Description: Create initial schema for vehicle permits service
-- Created at: 2026-03-18

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PERMISO VEHICULAR (Vehicle Permit) Table
-- ============================================
CREATE TABLE permisos_vehiculares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folio VARCHAR(20) NOT NULL UNIQUE,
    vehicle_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Permit Details
    permit_type VARCHAR(50) NOT NULL, -- 'circulacion', 'temporal', 'remolque', etc.
    permit_number VARCHAR(30),
    
    -- Validity
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired', 'cancelled', 'suspended'
    
    -- Location
    state VARCHAR(50) NOT NULL,
    municipality VARCHAR(100),
    
    -- Vehicle Info (cached for quick reference)
    vehicle_vin VARCHAR(17),
    vehicle_plate VARCHAR(10),
    vehicle_make VARCHAR(50),
    vehicle_model VARCHAR(50),
    vehicle_year INTEGER,
    
    -- Payment
    payment_id UUID,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    
    -- Document
    document_id UUID,
    
    -- Metadata
    observations TEXT,
    issuer_id UUID, -- User who issued the permit
    issuer_name VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_permit_type CHECK (permit_type IN ('circulacion', 'temporal', 'remolque', 'motocicleta', 'especial')),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'suspended', 'revoked')),
    CONSTRAINT chk_expiry CHECK (expiry_date > issue_date),
    CONSTRAINT chk_amount CHECK (amount >= 0)
);

-- ============================================
-- PERMIT PAYMENTS Table
-- ============================================
CREATE TABLE permiso_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permiso_id UUID NOT NULL REFERENCES permisos_vehiculares(id) ON DELETE CASCADE,
    
    -- Payment Details
    payment_method VARCHAR(20) NOT NULL, -- 'spei', 'oxxo', 'card'
    transaction_id VARCHAR(100) UNIQUE,
    authorization_code VARCHAR(50),
    
    -- Amount
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    
    -- Payment Reference
    reference VARCHAR(50),
    clabe VARCHAR(18),
    oxxo_reference VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('spei', 'oxxo', 'card', 'cash')),
    CONSTRAINT chk_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled'))
);

-- ============================================
-- PERMIT VERIFICATIONS Table (Audit Trail)
-- ============================================
CREATE TABLE permiso_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permiso_id UUID NOT NULL REFERENCES permisos_vehiculares(id) ON DELETE CASCADE,
    
    -- Verification Details
    verified_by UUID, -- User ID who verified
    verifier_name VARCHAR(100),
    verification_type VARCHAR(30) NOT NULL, -- 'manual', 'api', 'system'
    
    -- Result
    is_valid BOOLEAN NOT NULL,
    verification_code VARCHAR(50), -- QR code or verification code
    verification_url VARCHAR(255),
    
    -- Location
    verification_location VARCHAR(100),
    ip_address VARCHAR(45),
    
    -- Notes
    notes TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- permisos_vehiculares indexes
CREATE INDEX idx_permisos_folio ON permisos_vehiculares(folio);
CREATE INDEX idx_permisos_vehicle_id ON permisos_vehiculares(vehicle_id);
CREATE INDEX idx_permisos_user_id ON permisos_vehiculares(user_id);
CREATE INDEX idx_permisos_status ON permisos_vehiculares(status);
CREATE INDEX idx_permisos_expiry_date ON permisos_vehiculares(expiry_date);
CREATE INDEX idx_permisos_state ON permisos_vehiculares(state);
CREATE INDEX idx_permisos_created_at ON permisos_vehiculares(created_at);
CREATE INDEX idx_permisos_vehicle_vin ON permisos_vehiculares(vehicle_vin);
CREATE INDEX idx_permisos_vehicle_plate ON permisos_vehiculares(vehicle_plate);

-- permiso_payments indexes
CREATE INDEX idx_payments_permiso_id ON permiso_payments(permiso_id);
CREATE INDEX idx_payments_transaction_id ON permiso_payments(transaction_id);
CREATE INDEX idx_payments_status ON permiso_payments(status);

-- permiso_verifications indexes
CREATE INDEX idx_verifications_permiso_id ON permiso_verifications(permiso_id);
CREATE INDEX idx_verifications_code ON permiso_verifications(verification_code);
CREATE INDEX idx_verifications_created_at ON permiso_verifications(created_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on permisos_vehiculares
CREATE TRIGGER update_permisos_updated_at 
    BEFORE UPDATE ON permisos_vehiculares 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on permiso_payments
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON permiso_payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEQUENCES
-- ============================================

-- Sequence for permit numbers
CREATE SEQUENCE IF NOT EXISTS permit_number_seq START 100000;

-- Function to generate permit number
CREATE OR REPLACE FUNCTION generate_permit_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    current_year := TO_CHAR(NOW(), 'YYYY');
    nextval('permit_number_seq');
    sequence_num := lastval();
    
    NEW.permit_number := current_year || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- VIEWS
-- ============================================

-- View for active permits
CREATE OR REPLACE VIEW v_active_permisos AS
SELECT 
    p.id,
    p.folio,
    p.permit_number,
    p.vehicle_id,
    p.user_id,
    p.permit_type,
    p.issue_date,
    p.expiry_date,
    p.status,
    p.state,
    p.vehicle_vin,
    p.vehicle_plate,
    p.vehicle_make,
    p.vehicle_model,
    p.amount,
    p.currency,
    p.created_at,
    CASE 
        WHEN p.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN p.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'active'
    END as validity_status
FROM permisos_vehiculares p
WHERE p.status = 'active';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE permisos_vehiculares IS 'Vehicle circulation and temporary permits';
COMMENT ON TABLE permiso_payments IS 'Payment records for vehicle permits';
COMMENT ON TABLE permiso_verifications IS 'Audit trail for permit verifications';
