# ADR-G3.2 — Generic Verification Subjects

## Decision implemented

The Verification Engine is now subject-oriented. A verification record may target
an existing user or another durable subject while retaining the original user
relationship for every existing user-based flow. No invitation API, invitation
acceptance flow, membership mutation, registration change, or new token system
was introduced.

## Subject model

`Verification.userId` is nullable. Every record has a non-null
`subjectType` and `subjectReferenceId`:

| Existing / future use | subjectType | subjectReferenceId | userId |
| --- | --- | --- | --- |
| Existing email, SMS, WhatsApp verification | `USER` | User ID | User ID |
| Password reset | `USER` | User ID | User ID |
| Future invitation | `INVITATION` | Invitation ID | null permitted |
| Future magic link | `EMAIL` | Stable email-subject ID | null permitted |

The engine defaults omitted subject data to `USER` plus `userId`. It rejects a
missing subject reference and rejects a `USER` subject without `userId`.
Existing callers therefore preserve their original data shape and behavior.

## Migration

Migration: `20260714110000_generic_verification_subjects`

The migration is additive:

1. Creates `VerificationSubjectType`.
2. Adds `subjectType`, defaulting to `USER`.
3. Adds and backfills `subjectReferenceId` from existing `userId` values.
4. Makes `subjectReferenceId` non-null only after the backfill.
5. Makes `userId` nullable without dropping its foreign key.
6. Adds a check constraint: `USER` records must have matching non-null `userId`
   and `subjectReferenceId`; all non-user subjects must not carry a user ID.
7. Adds the subject lookup index used by lifecycle operations:
   `(subjectType, subjectReferenceId, channel, purpose, status, expiresAt)`.

It does not drop columns, tables, constraints, or existing data.

## Verification lifecycle

`createVerification`, `resendVerification`, `verify`, `expire`, `revoke`, and
`cleanup` now resolve the same subject tuple. Repository queries for active and
expired records and delivery-envelope expiry use that tuple, preventing a
non-user subject from being mixed with a user that has a coincidental ID.

The original public email, SMS, WhatsApp, and password-reset adapters explicitly
require a user before performing user-state or password mutations. This keeps a
future generic record from being accepted by a user-only callback.

## Secure delivery and events

The existing secure delivery envelope remains the sole recoverable-token store.
New envelopes authenticate `subjectType` and `subjectReferenceId` as AES-GCM
AAD together with verification, user, organization, and correlation identifiers.
The AAD encoder omits the new fields when they are absent, allowing an existing
pre-ADR user envelope to be decrypted with its original binding representation.

Outbox payloads remain ID-only, as required; they are not redesigned. Audit
metadata includes `subjectType` and `subjectReferenceId` for all engine lifecycle
events. Plaintext verification material is never added to records, audit events,
outbox events, or responses.

## Files changed

- `prisma/schemas/identity.prisma`
- `prisma/migrations/20260714110000_generic_verification_subjects/migration.sql`
- `apps/api/src/identity/repositories/identity.repository.ts`
- `apps/api/src/identity/verification-engine/verification-engine.service.ts`
- `apps/api/src/identity/verification/verification-envelope.service.ts`
- User-specific verification adapters, to retain their user-subject boundary
- `apps/api/test/verification-envelope.service.test.mjs`
- `apps/api/test/verification-subjects.service.test.mjs`

## Test coverage added

- Generic `INVITATION` subject creation without a user.
- Legacy user callers defaulting to `USER`.
- AAD encryption/decryption for a generic subject and rejection on changed
  subject reference.
- Continued decryption of a legacy user-envelope binding.

## Verification status

Attempted command:

```text
pnpm prisma format --schema prisma/schemas && pnpm prisma validate --schema prisma/schemas && pnpm prisma generate --schema prisma/schemas
```

It could not complete in this workspace because `pnpm` attempted to reconstruct
missing dependencies and DNS resolution for `registry.npmjs.org` failed
(`ENOTFOUND`). Consequently Prisma format/validate/generate, compilation, test,
and migration execution were not represented as passing. No PostgreSQL container
or external environment was accessed for this ADR.

## Known risks and follow-up

- Apply this migration to a disposable PostgreSQL database and run the full
  Prisma/client generation, typecheck, lint, build, and test suite once the local
  dependency cache or registry connection is available.
- Add database integration coverage for backfill, generic subject concurrency,
  expiry, and envelope retrieval when the approved disposable PostgreSQL test
  mechanism is operational.
- A future delivery worker must derive subject fields from the `Verification`
  aggregate when decrypting a new envelope; it must use the legacy binding form
  for pre-ADR records.

## Recommendation

**CONDITIONAL** — the source and additive migration implement ADR-G3.2, but the
required local validation is blocked by unavailable package dependencies and was
not claimed as successful.
