# G3.2 — Organization Invitations & Membership Management

## Architecture

This implementation reuses the existing Verification Engine, secure delivery
envelope, transactional outbox, audit store, owner authorization, and
membership/role model. It adds no invitation token table and creates no
placeholder user.

An invitation is a durable `OrganizationInvitation` aggregate. The service
generates the invitation ID and verification ID before entering the shared
transaction. It asks the Verification Engine to create an `INVITATION` subject
with that invitation ID, then persists the invitation referencing the generated
verification ID. The Verification Engine remains responsible for secret hashing,
token encryption, AAD, delivery-envelope persistence, and its existing outbox
event.

```text
Owner -> InvitationService -> VerificationEngine(INVITATION subject)
      -> Verification + encrypted envelope + OrganizationInvitation
      -> audit + InvitationCreated outbox event (one transaction)

Opaque token -> VerificationEngine.verify -> InvitationService callback
             -> invitation transition + membership/role (when user exists)
             -> audit + InvitationAccepted/MembershipCreated outbox events
```

## Business rules implemented

- Only an active owner membership can create, list, or revoke invitations.
- Email is normalized to trimmed lowercase before persistence.
- A partial PostgreSQL unique index permits only one pending invitation per
  organization/email. Expired pending records are transitioned before reinvite.
- A role is accepted only if it is a non-deleted system role or a private role
  belonging to the invitation organization. The pre-existing database trigger
  continues to block cross-organization private-role assignment to memberships.
- Existing users receive an active membership and idempotent role assignment on
  acceptance.
- For a new email, acceptance records the verified invitation without creating a
  user. The existing public-registration transaction later creates the real
  Person/User and atomically materializes all accepted invitation memberships.
- Accept, decline, revoke, replay, expiry, and attempt checks reuse the shared
  Verification Engine; no second token is stored or accepted.

## API

All routes are versioned under `/api/v1`.

| Method | Route | Authorization |
| --- | --- | --- |
| POST | `/organizations/{id}/invitations` | Active organization owner |
| GET | `/organizations/{id}/members` | Active organization owner |
| POST | `/invitations/{verificationId}/accept` | Opaque verification token |
| POST | `/invitations/{verificationId}/decline` | Opaque verification token |
| DELETE | `/invitations/{id}` | Active organization owner |

Swagger documents all five endpoints. The invitation response is an explicit
allow-list; membership responses do not return password, token, session, or
verification-secret fields.

## Database

Migration: `20260714120000_organization_invitations`

It adds:

- `InvitationStatus` enum.
- `OrganizationInvitation`, with restrictive foreign keys to Organization,
  Role, User (inviter), and Verification.
- A normalized-email database check.
- A unique verification reference.
- Lifecycle and lookup indexes.
- A partial unique pending-invitation index.

The migration is additive and has no destructive statements. The generic
verification migration remains the prerequisite migration.

## Audit and outbox

Audits: `organization.invitation.created`, `.accepted`, `.declined`,
`.revoked`, `organization.membership.created`, and `.updated`.

Outbox: `InvitationCreated`, `InvitationAccepted`, `InvitationDeclined`,
`InvitationRevoked`, `MembershipCreated`, and `MembershipUpdated`. Payloads are
identifier-only and are written in the same database transaction as state.

## Files changed

- `prisma/schemas/identity.prisma`
- `prisma/schemas/organization.prisma`
- `prisma/migrations/20260714120000_organization_invitations/migration.sql`
- `apps/api/src/organization/invitation.repository.ts`
- `apps/api/src/organization/invitation.service.ts`
- `apps/api/src/organization/invitation.controller.ts`
- `apps/api/src/organization/dto/invitation.dto.ts`
- `apps/api/src/organization/organization.module.ts`
- `apps/api/src/identity/identity.module.ts`
- `apps/api/src/identity/verification-engine/verification-engine.service.ts`
- `apps/api/src/identity/repositories/identity.repository.ts`
- `apps/api/src/identity/registration/public-registration.service.ts`

## Tests and verification status

Added focused unit tests cover invitation creation through the generic
`INVITATION` verification subject and existing-user acceptance/membership/outbox
wiring. Integration coverage remains required for new-email registration handoff,
duplicate/expired/revoked invitations, decline, owner authorization, audit,
outbox, and concurrency.

This workspace currently has no `node`, Prisma, TypeScript, or ESLint binary.
An attempted pnpm-driven restoration could not download dependencies because DNS
resolution to `registry.npmjs.org` failed with `ENOTFOUND`. Therefore Prisma
format/validate/generate, migration execution, lint, typecheck, build, and test
commands could not be run and are not reported as passing.

## Known risks

- Apply the additive migration to a disposable PostgreSQL database and run
  concurrency tests for the partial unique invitation index and concurrent token
  confirmation after dependencies are restored.
- Run the full generated Prisma-client typecheck; this is required because the
  new Prisma model and enum are referenced by the TypeScript repositories.
- The existing outbox worker/provider deployment remains a separate platform
  concern; this story writes events but does not implement a notification
  provider.

## Merge recommendation

**CONDITIONAL** — the implementation follows the approved architecture, but the
required local Prisma, test, and build verification is blocked by the unavailable
local toolchain and package-registry DNS failure.
