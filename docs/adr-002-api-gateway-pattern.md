# ADR 002: Use API Gateway Pattern

## Status
**Accepted** - 2026-03-18

## Context
We have multiple client applications (mobile, web) consuming multiple backend services. We need a centralized entry point that handles cross-cutting concerns.

## Decision
We will implement an **API Gateway** that acts as a single entry point for all client requests.

## Responsibilities
- **Authentication** - JWT token validation
- **Rate Limiting** - Prevent abuse and ensure fair usage
- **CORS** - Handle cross-origin requests
- **SSL/TLS Termination** - HTTPS handling
- **Request Routing** - Route to appropriate backend services
- **Response Aggregation** - Combine multiple service responses

## Configuration
```yaml
gateway:
  authentication:
    type: jwt
    issuer: auth-service
    expiry: 15m
  
  rate_limiting:
    strategy: token_bucket
    default_limit: 100/minute
    burst: 20
  
  cors:
    allowed_origins:
      - https://app.asegurapatrimonio.com
      - https://www.asegurapatrimonio.com
    allowed_methods:
      - GET
      - POST
      - PUT
      - DELETE
    allowed_headers:
      - Authorization
      - Content-Type
```

## Consequences

### Positive
- **Single entry point** - Simplified client integration
- **Centralized security** - Authentication in one place
- **Protocol translation** - Support multiple protocols if needed
- **Analytics** - Centralized request logging

### Negative
- **Single point of failure** - Gateway outage affects all clients
- **Additional hop** - Extra network latency
- **Configuration complexity** - Gateway needs careful tuning

## Alternatives Considered
1. **BFF (Backend for Frontend)** - Separate gateway per client type (deferred)
2. **Direct client-to-service** - Rejected due to security concerns
3. **Load balancer + sidecar** - Requires service mesh

## Implementation Notes
- Use Kong, AWS API Gateway, or similar
- Implement health checks for downstream services
- Add circuit breakers for resilience
- Consider caching at gateway level
