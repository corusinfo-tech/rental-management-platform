# Cookie, JWT, and Session Evidence

## Current result

**NOT VERIFIED.** The production browser cannot complete login because `/auth-api/login` is absent and the old `/api/auth/login` path returns 404.

No claims are made for:

- `Secure`, `HttpOnly`, `SameSite` or `Path` attributes on a live refresh cookie.
- Session-cookie versus 30-day Remember Me expiration.
- Access-token issuer, audience, algorithm, subject, session ID or expiration on a live token.
- Automatic refresh or 15-minute access-token lifecycle.
- Refresh rotation and old-token replay detection.
- Logout or logout-all revocation.
- Multiple browser sessions.
- Expired-session rejection.

## Required rerun evidence

After deployment, capture response headers for a successful `/auth-api/login` and `/auth-api/refresh`. Record cookie attributes without recording cookie values. Decode JWT headers/claims locally without recording token strings. Use two isolated browser profiles for concurrent sessions. Confirm database session rows by IDs and timestamps only; never capture refresh hashes.
