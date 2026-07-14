# G2 Security Hardening Report

## Result

**CONDITIONAL — not all acceptance criteria are complete.** Code-level hardening was applied and API unit tests pass. Disposable PostgreSQL/Redis infrastructure is unavailable in this environment, so Tasks 7–8 and all required live concurrency/failure-mode evidence remain blocked. The Gate G2 delivery-worker/key-rotation findings also remain outside this sprint’s listed implementation tasks.

## Completed hardening

### Cryptographic OTPs

`OtpChannel` now uses `node:crypto.randomInt(100_000, 1_000_000)` instead of `Math.random`. SMS and WhatsApp continue to share the same channel base and six-digit range. Existing unit tests verify the six-digit range/format; database/provider distribution testing is still pending.

### Authentication-wide rate limits

Added `AuthenticationThrottleService` and configurable `AUTH_REQUEST_IP_LIMIT`, `AUTH_REQUEST_IDENTIFIER_LIMIT`, and `AUTH_REQUEST_WINDOW_SECONDS` settings. Login, refresh, password-reset request, SMS request, and WhatsApp request now enforce Redis counters using HMAC identifier/IP fingerprints.

**Redis failure mode:** fail closed with HTTP 503. This avoids allowing unbounded authentication traffic when limits cannot be enforced. Redis integration tests are pending because Redis/Docker is unavailable.

### Refresh completion

Added `POST /api/v1/auth/refresh`, using the existing refresh rotation/reuse detection service. The endpoint is rate-limited and Swagger-documented. Existing transaction code revokes the token family when a revoked refresh token is reused.

### Access-token session validation

`AccessTokenGuard` now checks the signed access-token session ID against an active, non-expired, non-revoked session whose user is active and not deleted. This closes the previous immediate logout/password-reset access-token acceptance gap.

The current implementation is PostgreSQL-backed on each protected request. A Redis session cache was not added because no Redis integration environment is available to validate invalidation/failure behavior safely; this remains a performance/scalability follow-up.

### Verification lifecycle

`VerificationEngine.expire()` now finds expired records transactionally, expires them, destroys each envelope, writes an audit entry, and publishes `VerificationExpired`. Event constants for the verification outbox lifecycle are centralized in `IdentityEventType`.

## Changed files

- `apps/api/src/identity/verification-engine/verification-channel.ts`
- `apps/api/src/identity/verification-engine/verification-engine.service.ts`
- `apps/api/src/identity/events/identity-events.ts`
- `apps/api/src/identity/security/authentication-throttle.service.ts`
- `apps/api/src/identity/authorization/access-token.guard.ts`
- `apps/api/src/identity/repositories/identity.repository.ts`
- Identity controller/module, environment configuration, `.env.example`, and architecture test.

## Verification results

- `pnpm --filter @noagent4u/api test`: **31 passed, 0 failed**.
- TypeScript compilation is included in the API test command and passed.
- Earlier full lint/typecheck/build passed before this final small hardening edit; they should be rerun in CI with Redis/PostgreSQL available.
- Docker CLI remains unavailable; no disposable PostgreSQL/Redis containers, migrations, rollback tests, or integration suites were run.

## Remaining blockers

1. PostgreSQL clean migration, rollback, replay, concurrent verification, concurrent refresh, session-revocation integration tests.
2. Redis integration: rate limits, TTL, privacy fingerprints, fail-closed behavior, and session-cache invalidation (if a cache is introduced).
3. Production delivery remains incomplete: there is no authorised outbox worker/provider path to deliver verification material.
4. Envelope key rotation remains single-version/fail-closed; a historical-key operational policy is required.
5. Central event contracts currently cover verification lifecycle only; audit/event taxonomy should be completed across login, sessions, password reset, SMS, and WhatsApp.

## Recommendation

Do **not** mark Gate G2 as PASS or claim that no critical/high findings remain until the listed integration evidence and delivery/key-management architecture are complete.
