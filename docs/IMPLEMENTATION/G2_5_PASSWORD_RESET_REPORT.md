# G2.5 — Password Reset Report

## Architecture

`PasswordResetService` is a narrow public adapter over `VerificationEngine`. It does not generate, persist, validate, expire, revoke, or deliver a token itself. A request creates/resends a `PASSWORD_RESET` verification through the engine, which reuses the existing Argon2 verification hash, secure delivery envelope, transactional outbox, audit, expiry, attempt limit, cooldown, and replay protections.

## API

- `POST /api/v1/auth/password-reset/request` accepts a normalized email or E.164 mobile identifier and always returns the generic accepted response.
- `POST /api/v1/auth/password-reset/confirm` accepts the opaque verification token and a 12–128 character password.

## Confirmation transaction

The engine validates and consumes the expected `PASSWORD_RESET` verification. Its in-transaction completion hook:

1. creates an Argon2 password hash;
2. updates the user password hash;
3. revokes every active session (therefore every active refresh token/family);
4. records `identity.password_reset.completed` without secret material; and
5. publishes `PasswordResetCompleted` with ID-only payload data.

The expected-purpose check prevents an email-verification token from being used as a reset token.

## Files

- `apps/api/src/identity/password-reset/password-reset.service.ts`
- `apps/api/src/identity/verification-engine/verification-engine.service.ts`
- `apps/api/src/identity/repositories/identity.repository.ts`
- Identity module, controller, DTOs, and password-reset tests.

## Tests and verification

Password-reset tests cover unknown-account generic responses, engine routing, Argon2 password replacement, session revocation, audit, outbox, malformed token, and replay-safe generic response.

- API tests: **25 passed, 0 failed**.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.

No provider, worker, OTP, MFA, WhatsApp, organization API, or separate password-reset implementation was introduced.

## Known risks

Docker and `IDENTITY_TEST_DATABASE_URL` are unavailable, so the live PostgreSQL transaction and concurrency tests remain pending. Before release, validate reset confirmation rollback, replay, expiry, and session-family revocation against a disposable PostgreSQL 16 database.

## Merge recommendation

**CONDITIONAL** — implementation, static checks, and unit tests pass; database integration verification remains required before production release.
