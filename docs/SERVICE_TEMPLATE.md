# Service Specification Template

## Service Name: [Service Name]

### Overview
Brief description of the service's purpose and responsibilities.

### Domain Model

#### Entities
| Entity | Description | Key Attributes |
|--------|-------------|-----------------|
| | | |

#### Value Objects
| Value Object | Description | Attributes |
|--------------|-------------|------------|
| | | |

### API Specification

#### REST Endpoints
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| | | | | |

#### WebSocket Events (if applicable)
| Event | Direction | Payload |
|-------|-----------|---------|
| | | |

### Data Storage

#### Database Schema
```sql
-- Tables for this service
```

#### Redis Keys
| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| | | |

### External Integrations

#### Dependencies
| Service | Protocol | Purpose |
|---------|----------|---------|
| | | |

#### Event Subscriptions
| Event | Source | Handler |
|-------|--------|---------|
| | | |

### Error Handling

#### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| | | |

### Security

#### Authentication
- JWT required: Yes/No
- Roles allowed: [list]

#### Authorization
| Resource | Permission |
|----------|------------|
| | |

### Performance Requirements

| Metric | Target |
|--------|--------|
| P99 Latency | < 200ms |
| Availability | 99.9% |
| RPS | 1000 |

### Monitoring

#### Metrics to Track
- Request rate
- Error rate
- Latency (p50, p95, p99)
- Active connections

#### Health Check Endpoint
```
GET /health
```

### Deployment

#### Container Specs
- Base image: [image]
- CPU: [cores]
- Memory: [RAM]
- Replicas: [count]

#### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| | | |

---

## Example: Vehicles Service Specification

### Overview
The Vehicles Service manages vehicle registration data, including VIN verification, license plate management, and vehicle history tracking.

### Domain Model

#### Entities
| Entity | Description | Key Attributes |
|--------|-------------|-----------------|
| Vehicle | Registered vehicle in the system | vin (unique), plateNumber, make, model, year, color, userId |
| VehicleOwner | Ownership relationship | vehicleId, userId, startDate, endDate |

#### Value Objects
| Value Object | Description | Attributes |
|--------------|-------------|------------|
| VIN | Vehicle Identification Number | code, country, manufacturer, sequence |
| PlateNumber | License plate | number, state, expiryDate |

### API Specification

#### REST Endpoints
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | /api/v1/vehicles/:vin | Get vehicle by VIN | - | Vehicle |
| GET | /api/v1/vehicles/plate/:plate | Get vehicle by plate | - | Vehicle |
| POST | /api/v1/vehicles | Register new vehicle | {vin, plateNumber, ...} | Vehicle |
| PUT | /api/v1/vehicles/:id | Update vehicle | Vehicle | Vehicle |
| DELETE | /api/v1/vehicles/:id | Delete vehicle | - | 204 |

### Data Storage

#### PostgreSQL Schema
```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin VARCHAR(17) NOT NULL UNIQUE,
    plate_number VARCHAR(10),
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(30),
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX idx_vehicles_user ON vehicles(user_id);
```

#### Redis Keys
| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| vehicle:vin:{vin} | 1h | Cached vehicle by VIN |
| vehicle:plate:{plate} | 1h | Cached vehicle by plate |

### External Integrations

#### Dependencies
| Service | Protocol | Purpose |
|---------|----------|---------|
| API Gateway | HTTP | Service discovery, auth |
| Policies Service | HTTP | Policy lookup by vehicle |
| External VIN API | REST | VIN verification |

#### Event Subscriptions
| Event | Source | Handler |
|-------|--------|---------|
| user.deleted | Users Service | handleUserDeleted |

### Error Handling

#### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VEHICLE_NOT_FOUND | 404 | Vehicle not found |
| VIN_INVALID | 400 | Invalid VIN format |
| VIN_VERIFICATION_FAILED | 502 | External API error |
| DUPLICATE_VIN | 409 | VIN already registered |

### Security

#### Authentication
- JWT required: Yes
- Roles allowed: user, admin

#### Authorization
| Resource | Permission |
|----------|------------|
| vehicle:read | user, admin |
| vehicle:write | user, admin |
| vehicle:delete | admin |

### Performance Requirements

| Metric | Target |
|--------|--------|
| P99 Latency | < 150ms |
| Availability | 99.9% |
| RPS | 500 |

### Monitoring

#### Metrics to Track
- vehicles.lookup.vin.rate
- vehicles.lookup.plate.rate
- vehicles.create.rate
- vehicles.errors.rate

#### Health Check Endpoint
```
GET /health
Response: {"status": "healthy", "checks": {"database": "up", "redis": "up"}}
```

### Deployment

#### Container Specs
- Base image: node:18-alpine
- CPU: 0.5 cores
- Memory: 512MB
- Replicas: 3 (min), auto-scale to 10

#### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| REDIS_URL | Yes | Redis connection string |
| JWT_SECRET | Yes | JWT validation secret |
| VIN_API_URL | No | External VIN verification API |
| VIN_API_KEY | No | External API key |
