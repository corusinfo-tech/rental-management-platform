# ADR-006: Docker Compose

**Status:** Accepted for MVP

## Context

The VPS needs API, web, PostgreSQL and Redis deployment with minimal operational overhead.

## Decision

Use Docker Compose with internal service networking, persistent DB/Redis volumes, and loopback-only public application ports.

## Consequences

Simple deployment needs hardened images, health checks, image pinning, backups and a documented release/migration process.

## Alternatives Considered

- Native system services.
- Kubernetes.
- Managed platform services.

## References

- `docker-compose.yml`; `docker-compose.production.yml`.
