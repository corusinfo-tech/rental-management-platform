# ADR-003: Self-host Using Virtualmin/Webmin

**Status:** Accepted for MVP

## Context

NoAgent4U is deployed to a VPS with Webmin/Virtualmin. Virtualmin manages domains/TLS/vhosts; Docker runs application services.

## Decision

Use Virtualmin-managed Apache/Nginx as TLS reverse proxy to loopback Docker ports. Keep database and Redis private to Docker.

## Consequences

Low initial cost/control comes with single-host operational responsibility. Vhost configuration must be versioned/documented and legacy Django routes removed from the API hostname.

## Alternatives Considered

- Managed PaaS/container hosting.
- Kubernetes.
- Direct public Docker ports/no reverse proxy.

## References

- `docs/virtualmin-deployment.md`; `docker-compose.production.yml`.
