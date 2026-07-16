# Phase 3B Browser Evidence

## Login page before submission

Screenshot: [01-production-login-old-build.png](./01-production-login-old-build.png)

Visible evidence:

- Old `Sign in` layout.
- Forgot-password link targets `/password-reset`.
- No Register link.
- This does not match the locally completed authentication UI.

## Login submission

Screenshot: [02-browser-login-routing-failure.png](./02-browser-login-routing-failure.png)

Browser action:

- Filled the live login form with non-sensitive test credentials.
- Submitted once.
- Live page displayed `Cannot POST /api/auth/login`.

Routing conclusion:

```text
Browser POST /api/auth/login
  -> nginx /api rule
  -> NestJS
  -> 404 because the real endpoint is /api/v1/auth/login
```

Expected routing after deployment:

```text
Browser POST /auth-api/login
  -> Next.js BFF
  -> internal POST /api/v1/auth/login
  -> NestJS
```

The expected route is not deployed, so a successful browser network trace cannot be captured yet.
