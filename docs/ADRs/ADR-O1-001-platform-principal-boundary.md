# ADR-O1-001 — Platform Principal Boundary

**Status: Proposed**

## Context

The current implementation recognizes `SUPER_ADMIN` through a global role
assigned to an `OrganizationMembership`. This incorrectly couples platform
authority to a tenant lifecycle and permits future tenant membership workflows
to affect platform access.

## Decision

A future Identity release will introduce a `PlatformPrincipal` / `PlatformRole`
boundary that is independent of `Organization`, `OrganizationMembership`, and
tenant role assignment. Platform authorization will resolve the authenticated
user's platform assignment directly. It will support at least `SUPER_ADMIN`,
record grant/revocation audit events, and use restrictive foreign keys and
explicit lifecycle rules.

Until that release is approved and implemented, no Organization feature may
create, alter, or assign the global `SUPER_ADMIN` role. Existing checks remain
backward-compatible but are explicitly transitional.

## Consequences

- Approval and compliance administration will eventually be stable even when a
  user's tenant memberships change.
- Identity requires an additive migration, authorization resolver, audit rules,
  seed strategy, and migration plan before this decision can be accepted.
- This ADR intentionally does not redesign or implement Identity in O1.
