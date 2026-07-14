# ADR-005: Modular Monolith

**Status:** Accepted

## Context

The product has many domains but limited implementation and a single VPS deployment.

## Decision

Develop as a NestJS modular monolith with bounded modules, explicit interfaces/events, and one database initially.

## Consequences

Fast delivery and simpler operations are favored. Module boundaries must be enforced to permit later notification/invoice/payment extraction.

## Alternatives Considered

- Immediate microservices.
- Unstructured single-module API.
- Serverless functions per domain.

## References

- `ARCHITECTURE.md`; `apps/api/src`.
