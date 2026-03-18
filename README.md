# Asegura tu Patrimonio - Architecture Documentation

## Overview

**Asegura tu Patrimonio** is an insurance management platform that enables users to manage vehicle insurance policies, process payments, and handle document verification. The system follows a microservices architecture pattern with clear separation of concerns.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS (Clientes)                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│   ┌─────────────────────┐              ┌─────────────────────┐                  │
│   │    App móvil         │              │    Web / PWA       │                  │
│   │ React Native ·       │              │ React · Next.js    │                  │
│   │ iOS · Android        │              │                     │                  │
│   └──────────┬───────────┘              └──────────┬───────────┘                  │
└──────────────┼──────────────────────────────────────┼──────────────────────────────┘
               │                                      │
               ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                         │
│                         JWT · rate limiting · CORS · HTTPS                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Vehículos     │       │    Pólizas      │       │     Pagos       │
│  VIN · placas   │       │ Emisión · estados│      │  SPEI · OXXO   │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         ▼                         │                         ▼
┌─────────────────┐               │               ┌─────────────────┐
│  Banjército     │               │               │ Conekta / Stripe│
│ (Sin API ·      │               │               │ (Webhooks ·     │
│  buena fe)      │               │               │  CLABE única)   │
└─────────────────┘               │               └─────────────────┘
                                  │
                                  ▼
                        ┌─────────────────┐
                        │   Documentos     │
                        │ OCR · TIP · hash │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  OCR Provider    │
                        │Google Vision ·  │
                        │ Textract        │
                        └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 DATA LAYER                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                      │
│  │ PostgreSQL   │    │    Redis     │    │  S3 / Storage│                      │
│  │Vehículos ·   │    │Sesiones ·    │    │Documentos    │                      │
│  │pólizas ·     │    │caché         │    │cifrados      │                      │
│  │permisos      │    │              │    │              │                      │
│  └──────────────┘    └──────────────┘    └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Client Layer
| Component | Technology | Description |
|-----------|------------|-------------|
| Mobile App | React Native | Cross-platform mobile (iOS/Android) |
| Web App | React + Next.js | Progressive Web Application |

### API Gateway
| Feature | Technology | Purpose |
|---------|------------|---------|
| Authentication | JWT | Token-based auth |
| Rate Limiting | Token bucket | Prevent abuse |
| CORS | Configuration | Cross-origin requests |
| Transport | HTTPS | Secure communication |

### Core Services
| Service | Domain | Technologies |
|---------|--------|--------------|
| **Vehículos** | Vehicle registry | VIN lookup, plate verification |
| **Pólizas** | Policy management | Issuance, status tracking, renewal |
| **Pagos** | Payment processing | SPEI transfers, OXXO Pay |
| **Documentos** | Document management | OCR, TIP verification, hash integrity |

### External Integrations
| Provider | Purpose | Integration Type |
|----------|---------|------------------|
| Banjército | Bank verification | Manual (good faith) |
| Conekta/Stripe | Payment processing | Webhooks, CLABE |
| Google Vision | Document OCR | REST API |
| AWS Textract | Document extraction | REST API |

### Data Layer
| Storage | Use Case |
|---------|----------|
| **PostgreSQL** | Primary database (vehicles, policies, permissions) |
| **Redis** | Session management, caching |
| **S3/Storage** | Encrypted document storage |

---

## Service Specifications

### 1. Vehículos Service
```
Responsibilities:
- Vehicle registration and lookup by VIN
- License plate verification
- Vehicle history tracking

API Endpoints (suggested):
- GET /api/vehicles/:vin - Get vehicle by VIN
- GET /api/vehicles/plate/:plateNumber - Get vehicle by plate
- POST /api/vehicles - Register new vehicle
- PUT /api/vehicles/:id - Update vehicle info
```

### 2. Pólizas Service
```
Responsibilities:
- Policy issuance and management
- Policy status tracking
- Premium calculation
- Renewal management

API Endpoints (suggested):
- POST /api/policies - Create new policy
- GET /api/policies/:id - Get policy details
- PUT /api/policies/:id/status - Update policy status
- GET /api/policies/user/:userId - Get user's policies
- POST /api/policies/:id/renew - Renew policy
```

### 3. Pagos Service
```
Responsibilities:
- Payment processing (SPEI, OXXO Pay)
- Payment status tracking
- Refund processing
- CLABE generation

API Endpoints (suggested):
- POST /api/payments/spei - Initiate SPEI transfer
- POST /api/payments/oxxo - Create OXXO payment
- GET /api/payments/:id - Get payment status
- POST /api/payments/webhook - Handle payment webhooks
- GET /api/payments/clabe - Generate unique CLABE
```

### 4. Documentos Service
```
Responsibilities:
- Document upload and storage
- OCR processing
- TIP (Tarjeta de Identificación Pending) verification
- Document hash verification

API Endpoints (suggested):
- POST /api/documents/upload - Upload document
- GET /api/documents/:id - Get document
- POST /api/documents/:id/ocr - Process OCR
- POST /api/documents/:id/verify-tip - Verify TIP
- GET /api/documents/:id/hash - Get document hash
```

---

## Security Considerations

### Authentication
- JWT tokens with short expiration
- Refresh token rotation
- Role-based access control (RBAC)

### Data Protection
- TLS 1.3 for all communications
- AES-256 encryption for stored documents
- Database encryption at rest
- Environment variable secrets management

### API Security
- Rate limiting per user/IP
- Input validation and sanitization
- SQL injection prevention
- CSRF protection

---

## Async Communication

### Event-Driven Patterns
```
Services communicate asynchronously using:
- Message queues for inter-service events
- Webhooks for external integrations
- Event sourcing for audit trails
```

### Async Use Cases
- Document OCR processing (long-running)
- Payment webhook handling
- External API callbacks
- Notification delivery

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker & Docker Compose (optional)

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/asegura_db
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# External APIs
CONEKTA_API_KEY=key_xxx
STRIPE_SECRET_KEY=sk_xxx
GOOGLE_VISION_API_KEY=xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Storage
AWS_S3_BUCKET=asegura-documents
AWS_REGION=us-east-1
```

---

## Project Structure (Suggested)

```
asegura-tu-patrimonio/
├── clients/
│   ├── mobile/          # React Native app
│   └── web/             # Next.js app
├── services/
│   ├── api-gateway/     # Gateway service
│   ├── vehicles/        # Vehicles microservice
│   ├── policies/        # Policies microservice
│   ├── payments/       # Payments microservice
│   └── documents/       # Documents microservice
├── infrastructure/
│   ├── docker/          # Docker configurations
│   ├── terraform/       # Infrastructure as code
│   └── kubernetes/      # K8s manifests
└── docs/
    ├── architecture/    # Architecture decision records
    └── api/             # API documentation
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ (purple) | Client applications |
| ⬜ (gray) | API Gateway |
| ⬜ (teal) | Core services |
| ⬜ (coral) | External integrations |
| ⬜ (blue) | Data persistence |
| - - - | Asynchronous call |

---

*Last Updated: 2026-03-18*
*Version: 1.0.0*
