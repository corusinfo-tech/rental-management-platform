# ADR-004: Multi-tenant Architecture

**Status:** Accepted direction; implementation required

## Context

The platform is SaaS and current models carry `tenantId` fields.

## Decision

Use shared-schema PostgreSQL tenancy with mandatory tenant scoping in application policies and PostgreSQL RLS as defence in depth.

## Consequences

Efficient operations and simple cross-tenant platform maintenance require rigorous tenant filtering, composite relationships, tests, and auditability.

## Alternatives Considered

- Database per tenant.
- Schema per tenant.
- Single-tenant deployments.

## References

- `apps/api/prisma/schema.prisma`; `database-audit.md`.
