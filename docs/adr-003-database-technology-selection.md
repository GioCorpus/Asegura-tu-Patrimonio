# ADR 003: Database Technology Selection

## Status
**Accepted** - 2026-03-18

## Context
We need to select appropriate database technologies for our microservices architecture. Each service has different data access patterns and consistency requirements.

## Decision
We will use a **polyglot persistence** approach with:

| Service | Database | Justification |
|---------|----------|---------------|
| Vehicles | PostgreSQL | Relational data, complex queries, ACID |
| Policies | PostgreSQL | Complex relationships, financial data |
| Payments | PostgreSQL | ACID for financial transactions |
| Documents | PostgreSQL + S3 | Metadata in DB, files in object storage |
| Sessions/Cache | Redis | High-speed access, TTL support |

## Storage Details

### PostgreSQL (Primary)
- **Use**: Core business data (vehicles, policies, users, permissions)
- **Configuration**:
  - Connection pooling (PgBouncer)
  - Read replicas for read-heavy operations
  - Regular backups (daily + WAL archiving)

### Redis (Cache & Sessions)
- **Use**: Session management, API response caching, rate limiting
- **Configuration**:
  - Persistence (RDB + AOF)
  - Cluster mode for HA
  - TTL policies per use case

### S3 (Object Storage)
- **Use**: Encrypted document storage (IDs, policies, receipts)
- **Configuration**:
  - Server-side encryption (AES-256)
  - Versioning enabled
  - Lifecycle policies for archival
  - CDN for fast delivery

## Consequences

### Positive
- **Optimal performance** - Each service uses best-fit database
- **Scalability** - Scale databases independently
- **Flexibility** - Easy to migrate one service's database
- **Redis benefits** - Fast caching reduces DB load

### Negative
- **Operational complexity** - Multiple database systems to manage
- **Data duplication** - May need data copies across services
- **Backup complexity** - Different backup strategies needed
- **Expertise** - Team needs knowledge of each technology

## Alternatives Considered
1. **Single database** - Rejected (monolithic pattern, scalability issues)
2. **NoSQL (MongoDB)** - Rejected (relational data, ACID requirements)
3. **Only Redis** - Rejected (persistence not suitable for all data)

## Implementation Notes
- Use database-per-service pattern
- Implement saga pattern for distributed transactions
- Use outbox pattern for reliable event publishing
- Consider using connection poolers
- Document data schemas across services
