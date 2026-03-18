# Permisos Vehiculares Service

Vehicle Permits Microservice for **Asegura tu Patrimonio** insurance management platform.

## Overview

The Permisos Vehiculares service manages vehicle circulation and temporary permits, including:
- Permit issuance and management
- Permit verification (public API)
- Permit status tracking
- Payment integration
- Audit trail for verifications

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Authentication**: JWT

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

## Configuration

Configuration is managed through `config.yaml` with environment variable overrides.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_USER` | PostgreSQL user | postgres |
| `DB_PASSWORD` | PostgreSQL password | postgres |
| `DB_NAME` | Database name | asegura_permisos |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_SECRET` | JWT signing secret | - |
| `PORT` | Application port | 3004 |

## Database Setup

```bash
# Run migrations
npm run migrate

# Or manually run the SQL migration file
psql -U postgres -d asegura_permisos -f database/migrations/001_initial_schema.sql
```

## Running the Service

```bash
# Development mode
npm run dev

# Production mode
npm start

# Run tests
npm test
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/permisos/verify/:code` | Verify permit |

### Protected Endpoints (Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/permisos` | List permits |
| GET | `/api/v1/permisos/my-permits` | Get user's permits |
| GET | `/api/v1/permisos/:id` | Get permit by ID |
| POST | `/api/v1/permisos` | Create permit |
| PUT | `/api/v1/permisos/:id` | Update permit |
| DELETE | `/api/v1/permisos/:id` | Cancel permit (admin) |
| POST | `/api/v1/permisos/:id/activate` | Activate permit |
| POST | `/api/v1/permisos/:id/verify` | Create verification |
| GET | `/api/v1/permisos/:id/verifications` | Get verification history |
| POST | `/api/v1/permisos/:id/renew` | Renew permit |

## Database Schema

### Main Tables

- `permisos_vehiculares` - Vehicle permits
- `permiso_payments` - Payment records
- `permiso_verifications` - Verification audit trail

### Permiso Types

- `circulacion` - Circulation permit
- `temporal` - Temporary permit
- `remolque` - Trailer permit
- `motocicleta` - Motorcycle permit
- `especial` - Special permit

### Permiso Status

- `pending` - Awaiting payment
- `active` - Valid and active
- `expired` - Validity period ended
- `cancelled` - Cancelled by user
- `suspended` - Suspended by admin
- `revoked` - Revoked by authority

## Project Structure

```
permisos-vehiculares/
├── config.yaml           # Application configuration
├── package.json           # Dependencies
├── .env.example          # Environment variables template
├── src/
│   ├── index.js          # Application entry point
│   ├── config/           # Configuration loader
│   ├── database/         # Database connections
│   ├── controllers/      # HTTP controllers
│   ├── middleware/       # Express middleware
│   ├── models/           # Data models
│   └── routes/           # API routes
├── database/
│   └── migrations/       # SQL migrations
└── tests/               # Test files
```

## Security

- JWT-based authentication
- Rate limiting (100 requests per 15 minutes)
- Input validation with Joi
- SQL injection prevention via parameterized queries
- CORS configuration

## License

MIT
