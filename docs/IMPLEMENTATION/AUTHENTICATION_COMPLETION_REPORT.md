# Web Authentication Completion Report

## Outcome

The production `Cannot POST /api/auth/login` defect was traced to namespace routing. Production reserves `/api/*` for NestJS, so the original Next.js BFF route `/api/auth/*` was bypassed and NestJS correctly rejected the nonexistent `/api/auth/login` path. Browser authentication now uses `/auth-api/*`; the Next.js handler forwards approved operations internally to the unchanged `/api/v1/auth/*` contract.

The prior post-login page was a placeholder. It has been replaced by a protected application shell with live organization, property, lease, invoice, payment, and settings data.

## Files changed

Backend:

- `apps/api/src/identity/dto/auth.dto.ts`
- `apps/api/src/identity/repositories/identity.repository.ts`
- `apps/api/test/session-response.test.mjs`

Web authentication:

- `apps/web/app/auth-api/[...path]/route.ts`
- `apps/web/app/api/auth/[...path]/route.ts`
- `apps/web/lib/auth-proxy.ts`
- `apps/web/lib/auth-client.ts`
- `apps/web/components/auth/*`
- `apps/web/app/login/page.tsx`
- `apps/web/app/register/page.tsx`
- `apps/web/app/verify-email/page.tsx`
- `apps/web/app/forgot-password/page.tsx`
- `apps/web/app/reset-password/page.tsx`
- `apps/web/app/password-reset/page.tsx`

Post-login web:

- `apps/web/app/platform-api/[...path]/route.ts`
- `apps/web/lib/platform-client.ts`
- `apps/web/components/management/*`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/properties/page.tsx`
- `apps/web/app/leases/page.tsx`
- `apps/web/app/invoices/page.tsx`
- `apps/web/app/payments/page.tsx`
- `apps/web/app/settings/page.tsx`

Tests and documentation:

- `apps/web/test/auth-routing.test.mjs`
- `apps/web/package.json`
- `docs/IMPLEMENTATION/WEB_AUTHENTICATION_COMPLETION_PROMPT.md`
- `docs/IMPLEMENTATION/AUTHENTICATION_COMPLETION_REPORT.md`

## Existing API endpoints used

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/email-verification/request`
- `POST /api/v1/auth/email-verification/confirm`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/:sessionId`
- `POST /api/v1/auth/password-reset/request`
- `POST /api/v1/auth/password-reset/confirm`

No Identity endpoint or JWT claim format was duplicated or renamed.

## Screens implemented

- `/login`: validation, show/hide password, Remember Me, loading and safe error states.
- `/register`: landlord registration, E.164 country/mobile input, password confirmation and strength feedback.
- `/verify-email`: confirmation, resend request, 60-second client cooldown and generic responses.
- `/forgot-password`: generic reset request.
- `/reset-password`: token confirmation, new-password confirmation and session-revocation notice.
- `/password-reset`: compatibility redirect to `/forgot-password`.
- `/dashboard`: live organization status and property/lease/invoice/payment totals.
- `/properties`: protected search, list, and basic create flow.
- `/leases`, `/invoices`, `/payments`: protected searchable operational lists.
- `/settings`: protected organization settings read/update flow with optimistic version submission.

## Session and security controls

- Access tokens remain in React memory only.
- Refresh tokens remain in Secure (production), HttpOnly, SameSite=Strict cookies.
- Refresh cookies are scoped to the unambiguous BFF path; logout clears current and legacy paths.
- Automatic refresh occurs on application load and before access-token expiry.
- Authenticated requests retry once after a 401 and successful refresh rotation.
- The current organization is derived from the authenticated current-session record.
- `GET /auth/sessions` now uses an explicit Prisma select allow-list. Refresh hashes, token-family identifiers and revocation internals are not returned.
- Mutating BFF operations enforce same-origin checks and never accept caller-selected upstream URLs.
- Generic backend login failures remain generic to preserve the existing anti-enumeration policy.

## Administrative CLI

Not implemented. The repository has no approved platform-principal administrative application service for create, reset, unlock or promote operations. A CLI that updates Prisma directly would violate the supplied requirement and the platform-administrator ADR boundary. The updated implementation prompt records this as an architecture prerequisite instead of introducing a bypass.

## Verification

- Web TypeScript: **PASS** using the existing local dependency tree.
- API TypeScript and compilation: **PASS** using the existing local dependency tree.
- API unit/architecture suite: **PASS — 71 tests, 0 failures, 0 skipped**.
- Web routing/security suite: **PASS — 3 tests, 0 failures, 0 skipped**.
- Web ESLint (`--max-warnings=0`): **PASS**.
- Next.js production build: **PASS — 16 routes generated**. It emitted one environment-only warning because this clean Git worktree is nested below another local lockfile; a normal server checkout has one lockfile.
- Frozen dependency installation in the clean Git worktree: blocked by DNS resolution to `registry.npmjs.org`; no success is claimed.
- Production browser and reverse-proxy verification: pending deployment.

## Remaining risks

1. The worker has verification/outbox handler interfaces and an SMTP provider abstraction, but the runtime composition registers only organization terminal handlers. No concrete verification delivery port or SMTP transport is wired. Registration, email verification and normal password-reset delivery are therefore **not production-complete** from this repository state.
2. Property creation is implemented in the web UI; complex create/edit workflows for buildings, units, leases, invoices and payments remain future UI work. Their existing records are visible in protected list views.
3. Browser E2E proof against the production reverse proxy, PostgreSQL and Redis is required after deployment.
4. No production-ready claim should be made until delivery wiring and the deployment verification matrix pass.

## Deployment and manual verification

After commit and push, deploy from the repository root:

```bash
git pull --ff-only origin main
docker compose -f docker-compose.production.yml build api web
docker compose -f docker-compose.production.yml up -d api web
docker compose -f docker-compose.production.yml ps
```

Verify in the browser network panel:

1. Login request URL is `/auth-api/login` and returns JSON, never Express `Cannot POST` HTML.
2. Successful login redirects to `/dashboard`.
3. Reload restores the session through `/auth-api/refresh`.
4. Dashboard loads current organization and live summaries.
5. `/properties`, `/leases`, `/invoices`, `/payments`, and `/settings` redirect to login after logout.
