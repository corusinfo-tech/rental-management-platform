# ADR-009: Role Based Access Control

**Status:** Accepted baseline; insufficient alone

## Context

The product defines ADMIN, LANDLORD, TENANT and AGENT roles.

## Decision

Use Nest role metadata/guards for coarse access, supplemented by service-level permission and ownership policies.

## Consequences

RBAC provides simple baseline access but must not replace tenant/object authorization. Role assignment needs a controlled administration flow.

## Alternatives Considered

- Attribute-based access control only.
- No centralized authorization.
- External policy engine from day one.

## References

- `apps/api/src/common/roles.guard.ts`; `api-audit.md`.
