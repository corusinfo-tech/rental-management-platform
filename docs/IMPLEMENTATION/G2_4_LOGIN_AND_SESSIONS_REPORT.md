# G2.4 — Login and Session Management Report

## Implementation

`IdentityService` now authenticates a normalized email or E.164 mobile identifier with Argon2. Unknown, wrong-password, pending, suspended, archived, locked, and deleted accounts receive the same `401 Invalid credentials` response.

Successful login creates a session and issues a 15-minute access JWT plus a 30-day refresh JWT using the existing issuer, audience, algorithm, and secret configuration. Access and refresh JWTs carry the session ID. Refresh tokens are persisted only as Argon2 hashes.

Session persistence includes user, optional membership/organization, device ID, user agent, IP address, token family, parent session, last-use/expiry/revocation fields. Refresh rotation revokes the active session atomically and creates a replacement; reuse of an already revoked token revokes its family.

## Public API

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/{sessionId}`

Protected session operations use the existing access-token guard and only affect sessions owned by the authenticated user. Swagger documents the new endpoints and response types.

## Database migration

`20260713220000_login_session_management` is additive. It adds optional `membershipId`, `organizationId`, and `deviceId` to `Session`, indexes the two foreign keys, and adds restrict-delete foreign keys. Existing session/refresh data is preserved.

## Audit events

Implemented events include login succeeded/failed, logout, logout-all, refresh succeeded/failed, and session revoked. Audit metadata uses identifiers only; tokens, password values, and refresh hashes are never written to audit data.

## Tests

Added focused login tests proving Argon2-only refresh storage and the uniform failure response for unknown, pending, suspended, archived, locked, and wrong-password accounts. The API suite reports **22 passed, 0 failed**.

## Verification

- Prisma format/generate: passed.
- API test suite: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.

Live PostgreSQL migration and concurrency integration tests were not run because Docker and `IDENTITY_TEST_DATABASE_URL` are unavailable in this environment.

## Known risks and recommendation

Refresh reuse and concurrent rotation code is transactionally implemented but requires a disposable PostgreSQL integration test before production use. Rate limiting for login is not added in this story. No OTP, MFA, password-reset, or provider flow was introduced.

**Merge recommendation: CONDITIONAL** — static verification and unit tests pass; apply the migration and run session/refresh concurrency tests against disposable PostgreSQL before release.
