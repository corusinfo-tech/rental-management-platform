# ADR-002: PostgreSQL + Prisma

**Status:** Accepted (requires migrations)

## Context

The schema is Prisma/PostgreSQL and the VPS also has an unrelated MariaDB service.

## Decision

Use PostgreSQL as the NoAgent4U system of record and Prisma as schema/migration/data-access tooling. Keep MariaDB isolated for legacy workloads.

## Consequences

PostgreSQL supports transactional rental/financial data and multi-tenant indexes. Prisma migrations, constraints, backups and restore drills are mandatory before production data.

## Alternatives Considered

- Migrate NoAgent4U to VPS MariaDB.
- Use raw SQL/query builder only.
- Use a managed database immediately.

## References

- `apps/api/prisma/schema.prisma`; `docker-compose*.yml`.
