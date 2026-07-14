# G2.2A — Email Verification Hardening Report

## Final recommendation

**CONDITIONAL.** Do not mark G2.2 complete or production-ready.

## Files changed

- `apps/api/src/config/environment.ts`, `.env.example`, `.env.production.example`
- `apps/api/src/identity/verification/email-verification.service.ts`
- `apps/api/src/identity/verification/email-verification-throttle.service.ts`
- `apps/api/src/identity/controllers/identity.controller.ts`, `apps/api/src/identity/identity.module.ts`
- `prisma/migrations/20260713195500_email_verification_resend_guard/migration.sql`
- `docs/IMPLEMENTATION/ADR_G2_2_VERIFICATION_TOKEN_DELIVERY_HANDOFF.md`

## Architecture decisions

- Verification requests use Redis-backed, HMAC-fingerprinted IP/email rate limits configured through ConfigModule.
- Disabled, deleted, verified, locked, suspended, and archived users are ineligible for a usable verification.
- The approved resend policy is one active pending email-verification record per user, a configurable cooldown, and configured IP/email request windows. A resend after cooldown revokes the prior active record before creating a new one.
- The new partial unique index prevents concurrent resend transactions from creating multiple independently usable pending records. A uniqueness race returns the generic public response.

## Secure delivery hand-off status

**Unresolved by design.** No Handbook pattern is available locally. The required ADR is [ADR_G2_2_VERIFICATION_TOKEN_DELIVERY_HANDOFF.md](ADR_G2_2_VERIFICATION_TOKEN_DELIVERY_HANDOFF.md). No plaintext secret is persisted in audit or ordinary outbox data.

## Migration and PostgreSQL verification

Migration added: `20260713195500_email_verification_resend_guard`.

No isolated PostgreSQL database is configured (`IDENTITY_TEST_DATABASE_URL` is unset), and this host has no Docker or PostgreSQL server/client executable. Therefore migration-from-empty-database, integration tests, concurrent replay proof, and rollback execution were **not run**. The existing database suite was not presented as a pass.

Forward recovery: additive migrations only; if the partial index conflicts because existing data has more than one pending email verification per user, first run a reviewed data-repair migration that revokes all but the newest record, then retry this migration. Prisma has no automatic down migration; rollback is forward-only and must be reviewed.

## Unit-test results

`pnpm --filter @noagent4u/api test`: **16 passed, 0 failed**. This includes verification request/confirmation, replay, expiration, attempt limit, audit, outbox, registration throttling, and validation tests.

## Security controls verified

- Generic request and confirmation response shapes.
- Argon2-only secret storage.
- Expiry, attempt limit, single-use conditional consume, and replay audit path.
- Redis verification-request throttling and cooldown checks.
- Privacy-safe HMAC fingerprints in throttle audit records.
- Public Swagger DTOs do not expose verification IDs, hashes, audit records, outbox data, or account state.

## Exact commands executed

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed |
| `pnpm prisma format --schema prisma/schemas` | Passed |
| `pnpm prisma validate --schema prisma/schemas` | Passed with a supplied local-format `DATABASE_URL` |
| `pnpm prisma generate --schema prisma/schemas` | Passed with a supplied local-format `DATABASE_URL` |
| `pnpm --filter @noagent4u/api test` | Passed: 16 tests |
| `pnpm test` | Passed; database suite correctly reports skipped because `IDENTITY_TEST_DATABASE_URL` is absent |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm build` | Passed |
| Clean PostgreSQL migration/integration tests | Not run: no isolated database capability or URL |

## Remaining risks

1. The future token-delivery hand-off is technically incomplete pending an approved ADR.
2. PostgreSQL migration, active-verification uniqueness, concurrent resend, concurrent confirmation, and rollback semantics require live isolated-database proof.
3. The verification-request Redis throttle is unit-tested indirectly by the established Redis pattern, but requires live Redis integration verification.
