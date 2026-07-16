# Updated Web Authentication and Post-Login Completion Prompt

You are the Lead Software Architect and Senior Full Stack Engineer for NoAgent4U.

Do not redesign Identity, JWT, refresh rotation, RBAC, or Prisma. Use the existing NestJS endpoints under `/api/v1/auth/*`.

## Confirmed production defect

The production reverse proxy reserves `/api/*` for NestJS. The web client was posting to `/api/auth/login`, intending to reach a Next.js route handler, but the request reached NestJS and returned `Cannot POST /api/auth/login` because the real backend route is `/api/v1/auth/login`.

Use the Next.js same-origin BFF namespace `/auth-api/*`, outside the reverse-proxied `/api/*` namespace. The BFF must forward only approved authentication operations to `/api/v1/auth/*`, keep refresh tokens in Secure, HttpOnly, SameSite=Strict cookies, and return access tokens only to the in-memory client session.

## Objective

Complete and verify the browser authentication lifecycle and provide a useful protected application experience backed by existing APIs.

### Authentication UI

- `/login`: validation, loading state, accessible errors, remember-me, redirect to `/dashboard`.
- `/register`: landlord registration using the existing registration contract.
- `/verify-email`: confirmation token, resend request, cooldown, generic responses.
- `/forgot-password`: generic reset request.
- `/reset-password`: opaque-token confirmation, password confirmation and strength feedback.
- Preserve `/password-reset` as a compatibility redirect.

### Session lifecycle

- Automatic refresh on application load and before access-token expiry.
- Refresh rotation through the HttpOnly refresh cookie.
- Retry one authenticated request after refresh.
- Logout revokes the server session and clears all current and legacy cookie paths.
- Load the current organization context from the allow-listed session response.
- Never return `refreshTokenHash`, token-family identifiers, or revocation internals to the browser.

### Post-login application

- Replace the dashboard placeholder with live organization information.
- Display property, lease, invoice, and payment totals.
- Provide protected views for properties, leases, invoices, payments, and organization settings.
- Property UI must support listing, search, and basic creation through existing APIs.
- Other complex workflows may remain read-only but must clearly document remaining create/edit flows.
- Display empty, loading, permission-denied, expired-session, and service-error states.

### Production verification

- Prove the browser sends login to `/auth-api/login`, not `/api/auth/login`.
- Prove the BFF sends the upstream request to `/api/v1/auth/login`.
- Verify login, refresh rotation, reload persistence, protected redirect, logout, and expiry.
- Verify current organization resolution and live dashboard data.
- Verify registration, email verification, forgot-password and reset confirmation.
- Verify responsive layout, dark mode, accessibility, lint, typecheck, tests, and production build.

### Required delivery audit

Do not claim registration, email verification, or password reset is production-ready unless the runtime worker has a concrete secure-delivery implementation: verification handler registration, envelope decryption at the authorized boundary, SMTP transport/provider wiring, idempotency, retry, envelope destruction, audit, and successful production evidence. Interfaces or stubs alone are not completion.

### Administrative recovery

Do not create a CLI that writes directly to Prisma. Admin user creation, reset, unlock, or platform-role promotion requires an approved application service and platform-administrator authorization boundary. If those do not exist, record the CLI as deferred instead of bypassing the architecture.

## Final report

Return files changed, routes used, screens delivered, session protections, live-data views, tests and exact outcomes, deployment steps, delivery-worker status, deferred admin CLI status, and remaining risks. Never claim production readiness from static inspection alone.
