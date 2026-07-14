# Security Audit — OWASP ASVS and API Security

**Scope:** Static application/deployment review. No penetration test, dependency scan, or VPS configuration scan was performed.

## Summary

The API includes positive baseline controls (Argon2 hashing, short access JWTs, refresh-token hashing, DTO whitelist validation, Helmet, CORS allow-list configuration, Pino redaction, and loopback production container ports). It does not currently meet a production OWASP ASVS/API security baseline. Principal risks are public privileged registration, incomplete object/tenant authorization, inactive rate limiting, no migration/reproducible dependency controls, and missing operational protections.

## Critical Findings

| ID | Issue | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| C-01 | Public privileged tenant bootstrap | `POST /auth/register` accepts `role` and `RegisterDto` permits `ADMIN` | Any caller can create an administrator tenant without business approval; enables abuse/fraud | Remove client-chosen privileged roles; use controlled tenant bootstrap and invitation/role-assignment flow. |

## High Findings

| ID | Issue | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| H-01 | Broken object-level/tenant authorization | Agreement creation accepts body IDs without proving tenant/ownership; many schema IDs lack FKs | Cross-tenant association or unauthorized management actions may be possible | Enforce ownership/tenant policies in services; add FKs/composite checks and RLS defence in depth. |
| H-02 | No committed database migrations | Schema exists but migrations do not | Unreviewed/irreproducible DB change can corrupt or expose data | Commit migrations; run reviewed migration deploys only. |
| H-03 | Invoice delivery is claimed but no worker exists | Queue is registered/enqueued; no processor/provider exists | Financial communications can silently fail | Implement worker, delivery state, retries, monitoring, and reconciliation before release. |
| H-04 | API dependency graph is not locked | No `pnpm-lock.yaml`; Docker uses non-frozen install | Builds can silently install different/vulnerable packages | Commit lockfile; frozen installs; dependency/container scanning. |

## Medium Findings

| ID | Issue | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| M-01 | Rate limiting inactive | `ThrottlerModule` configured, no `ThrottlerGuard` applied | Login/register/refresh susceptible to brute force and abuse | Register global guard with stricter auth-route limits; test it. |
| M-02 | JWT/session lifecycle incomplete | Tokens in JSON; one refresh hash/user; no logout/revocation/device session/reuse detection | Token theft persists up to 30 days; poor session management | Use session records, rotation/reuse detection, logout, cookie/mobile storage policy, issuer/audience/key rotation. |
| M-03 | Global authentication is opt-in | Controllers explicitly use guards; no deny-by-default policy | Future endpoints can accidentally become public | Apply global JWT guard with explicit `@Public()` metadata. |
| M-04 | Input/business validation incomplete | Agreement status uses `IsString`; IDs/dates lack business checks | Invalid lifecycle/financial data may enter system | Use enum/date/amount/status-transition validation and service rules. |
| M-05 | No Docker build-context protection | `.dockerignore` absent | `.env`/local artefacts may be sent to Docker daemon/build cache | Add `.dockerignore`, exclude secrets and artefacts. |
| M-06 | Docker hardening incomplete | Floating images, root defaults, no health/resource policies | Supply-chain/runtime attack surface and weak recovery | Pin digests, non-root users, health checks, limits, image scanning. |
| M-07 | Public Swagger lacks policy | `/docs` public in every environment | API metadata helps attackers and may expose future schemas | Make production exposure explicit; protect/internalize where appropriate. |
| M-08 | Legacy VPS route conflict | `api.noagent4u.com` served Django debug page during deployment | Information disclosure and incorrect API routing | Remove legacy WSGI route, set `DEBUG=False` for legacy app, test vhost proxy. |

## Low Findings

| ID | Issue | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| L-01 | Request IDs absent | Exception filter reads `x-request-id`; no generator | Incident tracing is weaker | Generate trusted correlation IDs and propagate to logs/jobs/audit logs. |
| L-02 | Error taxonomy weak | HTTP-derived codes and heterogeneous messages | Clients cannot safely automate retries/field feedback | Use stable domain error codes and field error schema. |
| L-03 | Audit log is incomplete | Audit writes only invoice issuance; no immutability/actor FKs | Limited forensic trail | Audit sensitive auth/admin/data actions; protect retention and integrity. |
| L-04 | Health endpoint is liveness only | Static response, no DB/Redis check | Orchestrator may route traffic to degraded API | Add separate liveness/readiness checks. |

## Control Review

| Review area | Current state | Assessment |
|---|---|---|
| Authentication / password storage | Argon2 with min 12-character password; JWT access/refresh | Good primitives; incomplete account/session lifecycle. |
| Authorization | Roles guard on two business controllers | Insufficient: no global deny-by-default, permissions, ownership, or reliable tenant checks. |
| JWT | Separate secrets, 15m/30d expiries | Add issuer/audience, rotation, revocation/session control and secure client storage. |
| Secrets | `.env` templates, runtime env use | No secret manager, rotation policy, leak scanning, or `.dockerignore`. |
| CORS | `WEB_ORIGIN` split list, credentials enabled | Good intent; validate exact production origins and never use wildcard with credentials. |
| Headers | Helmet global | Good baseline; test CSP/HSTS/proxy configuration. |
| Cookies / CSRF | No cookies currently | If moving refresh tokens to cookies, add SameSite/Secure/HttpOnly and CSRF protection. |
| XSS | No user HTML rendering yet | Frontend still needs CSP, output encoding and safe rich-text/PDF template rules. |
| SQL injection / Prisma | Prisma typed query API | Strong default, but avoid raw SQL and enforce tenant scope in every query. |
| Validation | Whitelist/forbid unknown fields | Good baseline; add semantic/business validation. |
| Uploads | No endpoints | Design malware scanning, type/size quotas and signed storage before implementation. |
| Logging | Pino redacts three sensitive fields | Add request IDs, remote sink, retention/access policy; avoid personal/financial data logging. |
| Audit logs | Model exists, invoice event only | Expand coverage and integrity controls. |
| Error handling | Global envelope | Avoid sensitive errors; add error logging/correlation/stable codes. |
| Environment | Required core secrets checked | Add schema, minimum entropy checks, secret manager and environment separation. |
| Dependencies | No lock/audit/SBOM | Treat as high supply-chain risk. |
| Server configuration | Virtualmin reverse proxy planned; containers loopback | Lock down legacy routes, firewall, SSH, TLS renewal, patching and backups. |

## OWASP API Security Focus

- **API1 Broken Object Level Authorization:** High; agreement body references and schema relationships are not safely verified.
- **API2 Broken Authentication:** Medium; good hashing but public privileged registration and incomplete session controls.
- **API3 Broken Object Property Level Authorization:** Medium; raw Prisma models are returned without response DTO allow-lists.
- **API4 Unrestricted Resource Consumption:** Medium; throttler is inactive, no pagination/upload limits/queue controls.
- **API5 Broken Function Level Authorization:** High; broad roles and no fine-grained permission model.
- **API7 Server Side Request Forgery:** Not applicable in current endpoints; reassess when document URLs/webhooks are added.
- **API8 Security Misconfiguration:** Medium; Swagger policy, Docker pinning, debug Django route, missing lockfile.
- **API9 Improper Inventory Management:** Medium; Swagger is incomplete and planned/implemented API mismatch exists.
- **API10 Unsafe Consumption of APIs:** High risk when payment/email/WhatsApp integrations are added; no adapter validation or webhook controls exist yet.

## Recommendations

1. Resolve C-01 and H-01 before any public onboarding.
2. Establish a dependency lockfile/SBOM/container scan and migration process.
3. Make authentication deny-by-default; add policy-based tenant/object authorization tests.
4. Enforce rate limits, session revocation, secure token storage policy, request IDs and error logging.
5. Harden Docker/VPS: digest pinning, `.dockerignore`, non-root, health checks, firewall/TLS/backup monitoring, and remove legacy Django exposure.
6. Re-run this audit with ASVS evidence, authenticated API tests, SCA results and VPS configuration access before production launch.
