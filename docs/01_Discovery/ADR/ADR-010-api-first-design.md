# ADR-010: API First Design

**Status:** Accepted direction; implementation required

## Context

Web and Flutter clients require a stable, versioned platform interface.

## Decision

Expose versioned REST APIs under `/api/v1`, document with OpenAPI, and use DTOs/contracts as the source of client integration.

## Consequences

Requires complete request/response/error schemas, pagination/filtering/idempotency standards, OpenAPI validation, and compatibility/deprecation policy.

## Alternatives Considered

- Frontend-specific BFF only.
- GraphQL as primary API.
- Direct database access from clients.

## References

- `apps/api/src/main.ts`; `packages/contracts`; `api-audit.md`.
