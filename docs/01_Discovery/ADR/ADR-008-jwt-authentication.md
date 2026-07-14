# ADR-008: JWT Authentication

**Status:** Accepted with required hardening

## Context

Web/mobile REST clients need stateless short-lived access authentication.

## Decision

Use short-lived JWT access tokens plus rotating refresh tokens hashed with Argon2.

## Consequences

Requires secure bootstrap, session/device records, logout/revocation, key rotation, secure storage and strict rate limiting.

## Alternatives Considered

- Server-side opaque sessions only.
- Third-party identity provider.
- Long-lived JWT only.

## References

- `apps/api/src/auth`; `security-audit.md`.
