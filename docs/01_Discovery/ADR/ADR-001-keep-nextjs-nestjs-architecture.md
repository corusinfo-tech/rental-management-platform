# ADR-001: Keep Next.js + NestJS Architecture

**Status:** Accepted (baseline; implementation incomplete)

## Context

The repository already uses Next.js for web and NestJS for the API, with TypeScript across both. A separate Django application exists on the VPS but is not part of NoAgent4U.

## Decision

Keep Next.js App Router for the web client and NestJS for versioned REST APIs. Share contracts where useful through workspace packages.

## Consequences

One language/tooling ecosystem improves delivery speed and contract sharing. Teams must maintain compatible Node/TypeScript versions and complete the missing frontend/API architecture.

## Alternatives Considered

- Replace NestJS with FastAPI/Python.
- Use Next.js API routes as the backend.
- Retain/reuse the existing Django route.

## References

- `apps/web`, `apps/api`, `ARCHITECTURE.md`.
