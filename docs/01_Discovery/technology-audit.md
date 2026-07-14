# NoAgent4U Technology Audit

**Audit date:** 2026-07-13  
**Scope:** Static review of this repository plus deployment facts supplied for the NoAgent4U VPS (Webmin/Virtualmin, an existing MariaDB/Django site, and Docker deployment). This document does not modify application source code.

## 1. Executive Summary

NoAgent4U is an early-stage, TypeScript-first rental-management monorepo. Its implemented core is NestJS/Node.js for the API, Next.js/React for the web frontend, Prisma/PostgreSQL for persistence, and Redis/BullMQ for intended asynchronous work. Flutter is present as a mobile starter.

The stack choices are modern and broadly suitable for a multi-tenant SaaS. However, the repository is a scaffold rather than a mature production platform: the web UI is static, the API has only a few implemented modules, no Prisma migrations or lockfile exist, and no BullMQ processor exists. The VPS has an existing MariaDB/Django application, but NoAgent4U itself is configured to use a separate PostgreSQL container; these should remain separate.

### Stack at a glance

```text
Browser ──► Next.js web app ──► NestJS REST API ──► Prisma ──► PostgreSQL
                                │
                                └────────────────────────────► Redis / BullMQ

Flutter mobile starter ── planned API consumer
Virtualmin / Apache or Nginx ── TLS termination and reverse proxy on the VPS
Docker Compose ── container lifecycle and internal service network
```

## 2. Frontend Technologies

| Technology | Purpose | Current version | Current usage | Strengths | Weaknesses | Recommendation |
|---|---|---:|---|---|---|---|
| Next.js | Web framework and server rendering | `^15.1.0` | App Router with one static dashboard route; standalone Docker output enabled | Modern React framework, route-based rendering, production standalone output | No API integration, auth/session handling, route protection, loading/error states, or feature pages | Retain. Add a typed API client, authenticated route layout, feature routes, error boundaries, and environment-aware API URL. |
| React / React DOM | UI rendering | `^19.0.0` | One server-rendered dashboard component | Current React release; compatible with Next App Router | No component architecture, state management, forms, tests, or accessibility checks | Retain with the Next.js stack. Establish a component, form, and accessibility convention before feature development. |
| TypeScript | Web type safety | `^5.7.2` | Used in Next configuration/layout/page | Strong type system and shared-contract potential | Shared contracts are not used by web source; strict build quality is unverified | Retain; enforce strict CI type checks and consume API contract types. |
| Tailwind CSS | Styling | `^3.4.16` | Global Tailwind directives and inline utility classes | Fast, consistent utility styling; low CSS overhead | No design tokens, reusable components, dark/light strategy, or UI test coverage | Retain initially. Establish tokens and reusable primitives; plan Tailwind 4 evaluation separately. |
| PostCSS / Autoprefixer | CSS processing | `^8.4.49` / `^10.4.20` | Tailwind build pipeline | Standard Tailwind integration | No issue identified; package versions are non-reproducible | Retain and lock versions. |
| Flutter | Native mobile client | Dart SDK `^3.6.0` | Static `main.dart` dashboard only | Single codebase for iOS/Android; secure-storage and HTTP packages selected | Not integrated with API or authentication; no mobile build/release workflow | Retain if native mobile is in scope. Defer feature work until API contracts and authentication are stable. |
| Dio | Flutter HTTP client | `^5.7.0` | Declared, unused | Mature request interceptors and error handling | No API client implementation | Retain for planned mobile API client. |
| flutter_secure_storage | Secure mobile token storage | `^9.2.2` | Declared, unused | Appropriate platform-backed secret storage | No session/token lifecycle implementation | Retain; use only with a defined refresh/logout strategy. |
| Riverpod / go_router | Mobile state and navigation | `^2.6.1` / `^14.6.2` | Declared, unused | Scalable state and declarative navigation | Adds complexity before application needs are defined | Retain only if adopted as the documented mobile standard; otherwise remove until required. |

## 3. Backend Technologies

| Technology | Purpose | Current version | Current usage | Strengths | Weaknesses | Recommendation |
|---|---|---:|---|---|---|---|
| Node.js | API runtime | Docker/CI major `22` | Runs NestJS in Docker | Current LTS-class runtime, broad ecosystem | Patch version is not pinned; no runtime compatibility policy | Pin to a tested Node 22 patch via image digest or documented upgrade cadence. |
| NestJS | REST API framework | `^11.0.x` | Modules for auth, agreements, invoices, health | DI, validation, Swagger integration, modularity | Only a fraction of planned modules exists; compact one-line source reduces maintainability; services call Prisma directly | Retain. Enforce module/application/domain boundaries as features are built. |
| Express | HTTP adapter | Via `@nestjs/platform-express ^11.0.1` | Underlies Nest HTTP server | Stable default Nest adapter | Not explicitly tuned; no proxy trust configuration | Retain. Configure trusted proxy behaviour when running behind Virtualmin. |
| class-validator / class-transformer | DTO validation/transformation | `^0.14.1` / `^0.5.1` | DTO decorators and global validation pipe | Rejects undeclared fields and validates request shapes | Validation is incomplete for business rules and enum status; transformer is not used directly | Retain; add domain validation and test invalid/hostile input paths. |
| Swagger / OpenAPI | API documentation | `@nestjs/swagger ^11.0.0` | Public Swagger UI at `/docs` | Low-friction API discoverability | No documented security/access policy; incomplete controllers mean incomplete contract | Retain. Publish a versioned OpenAPI artifact and decide production access controls. |
| nestjs-pino / pino-pretty | Logging | `^4.2.0` / `^13.0.0` | HTTP logging, redacts authorization/password/refresh token | Structured logging and basic redaction | No request IDs, log sink, alerting, or retention policy | Retain; add request correlation and central log collection. |
| helmet | HTTP security headers | `^8.0.0` | Registered globally | Sensible baseline browser hardening | Content security policy and reverse-proxy header policy are not reviewed | Retain; explicitly configure and test security headers. |
| @nestjs/throttler | Request-rate control | `^6.2.1` | Module configured | Suitable Nest rate-limiting mechanism | Guard is not globally registered or applied; rate limiting is currently inactive | Retain, but enable and verify it before public API use. |
| Joi | Configuration validation | `^17.13.3` | Declared, unused | Useful schema validation | Duplicate/unnecessary until config validation is implemented | Remove or implement a Joi environment schema. |

**Backend clarification:** There is no FastAPI, Python, Django, or MariaDB dependency in the NoAgent4U repository. The Django application observed at `api.noagent4u.com` was an existing VPS route, not this API.

## 4. Database Technologies

| Technology | Purpose | Current version | Current usage | Strengths | Weaknesses | Recommendation |
|---|---|---:|---|---|---|---|
| PostgreSQL | Primary transactional database | Docker image `postgres:16-alpine` | Intended system of record; tenant, user, property, agreement, invoice, payment and audit models defined | Strong relational integrity, decimal support, JSON, indexing, concurrency; good fit for SaaS tenancy | Image patch is floating; no migrations, backup automation, RLS, or connection-pool policy | Retain. Create reviewed Prisma migrations, pin image patch/digest, configure backups/restore drills, and add RLS/tenant controls as defence in depth. |
| Prisma ORM | Schema, migration and data access layer | `^6.1.0` (CLI/client) | Prisma schema and direct service queries | Type-safe DB access, migration support, suitable Nest integration | No migration directory; direct ORM usage bypasses promised repository abstraction; several tenant IDs lack FK relations | Retain. Commit migration history and introduce repository/transaction conventions incrementally. |
| MariaDB | Existing VPS database, not a NoAgent4U dependency | Server version unknown | Used by pre-existing Virtualmin/Django workload | Can coexist with Docker PostgreSQL | Would require schema/ORM/design rework if substituted; increases VPS operational surface | Keep separate. Do not migrate NoAgent4U to MariaDB without a deliberate architecture decision. |

## 5. Queue Technologies

| Technology | Purpose | Current version | Current usage | Strengths | Weaknesses | Recommendation |
|---|---|---:|---|---|---|---|
| Redis | Cache/queue broker and persistence | Docker image `redis:7-alpine` | BullMQ connection; AOF enabled in production Compose | Fast, mature, widely supported; private Compose network in production | Patch floats; no memory policy, password/TLS, metrics, backup, or cache implementation | Retain for BullMQ. Pin image, define memory/eviction policy, and expose only internal network access. |
| BullMQ / @nestjs/bullmq | Background jobs | `^5.34.2` / `^11.0.0` | Registers `invoice-delivery`; invoice creation enqueues jobs | Retries and exponential backoff are configured; suitable for notifications | No worker/processor exists, no queue dashboard, DLQ, job telemetry, or scheduler integration | Retain only after adding a separately deployable worker, delivery adapters, idempotency, and monitoring. Until then, do not represent invoices as delivered. |
| ioredis | Redis client | `^5.4.2` | Declared, not directly imported | Mature Redis client | Direct dependency appears unused | Remove unless a direct Redis/cache client is implemented. |

## 6. Authentication Technologies

| Technology | Purpose | Current version | Current usage | Strengths | Weaknesses | Recommendation |
|---|---|---:|---|---|---|---|
| JWT / @nestjs/jwt | Stateless API access and refresh tokens | `^11.0.0` | 15-minute access and 30-day refresh JWTs | Simple API/mobile integration; short access-token expiry | Tokens returned in response body; no logout, device sessions, revocation list, reuse detection, issuer/audience claims, or key rotation | Retain short-term. Define token storage per client, rotation/revocation policy, issuer/audience, and key-management process. |
| Argon2 | Password and refresh-token hashing | `^0.41.1` | Hashes passwords and stored refresh token | Modern password hash; stronger choice than fast hashes | Parameters not explicitly configured/documented; one refresh-token hash allows only one session | Retain. Set documented Argon2id memory/time/parallelism values and use a session table. |
| Nest guards / Reflector | Route authentication and RBAC | NestJS `^11.0.x` | Custom JWT guard and role metadata guard | Clear basic role enforcement | No global guard, permissions, tenant policies, ownership checks, or database RLS; public registration accepts caller-chosen `ADMIN` role | Retain framework mechanism, but urgently redesign tenant bootstrap and authorization policies. |

## 7. Infrastructure Technologies

| Technology | Purpose | Current version | Current usage | Strengths | Weaknesses | Recommendation |
|---|---|---:|---|---|---|---|
| VPS | Compute host | Provider/OS unknown | Hosts Virtualmin, existing services, Docker containers | Full control and predictable location | Single-server availability, patching and backup responsibility | Document OS/provider sizing and patch policy; plan managed backups and eventual high-availability needs. |
| Webmin / Virtualmin | VPS administration, domains, TLS, vhosts | Installed; exact version unknown | Intended for DNS/vhost/TLS management and reverse proxy to containers | Convenient domain and Let’s Encrypt administration | Existing Django route on `api.noagent4u.com` caused proxy conflict; manual directives can drift from repo | Retain. Document actual vhost configuration, remove legacy application mappings, and test routing after each change. |
| Apache or Nginx reverse proxy | Public TLS termination and proxy | Exact server/version unknown | Virtualmin proxy is intended to expose frontend/API loopback ports | Keeps DB/Redis private and centralizes TLS | Configuration is external to repository; host port drift (3000/3001 vs 3100/3101) caused inconsistency | Choose/document one proxy server and store a sanitized canonical vhost template in repo. |
| Let’s Encrypt | TLS certificate issuance | Managed by Virtualmin; version N/A | Intended for `noagent4u.com` and `api.noagent4u.com` | Free automated certificates | Renewal/routing verification not documented | Retain. Monitor certificate renewal and enforce HTTP-to-HTTPS redirects. |

## 8. Development Tools

| Technology | Purpose | Current version | Current usage | Strengths | Weaknesses | Recommendation |
|---|---|---:|---|---|---|---|
| pnpm workspaces | Monorepo dependency management | `9.15.0` | Root workspace spans `apps/*` and `packages/*` | Efficient installs and workspace filtering | No `pnpm-lock.yaml`; deployments cannot reproduce dependencies | Retain; generate and commit a lockfile, require `--frozen-lockfile` in CI and release builds. |
| Prettier | Formatting | `^3.4.2` | Root `format` script | Common, low-friction formatting | No configuration or CI formatting check | Retain; add config and check-only CI command. |
| ESLint | Static analysis | `^9.16.0` | API lint script references it | Standard TypeScript lint platform | No ESLint config; web uses obsolete/unsupported `next lint` command pattern for current Next versions | Establish flat ESLint config and run lint in CI. |
| Jest / ts-jest | API unit testing | `^29.7.0` / `^29.2.5` | Declared only | Familiar Nest testing path | No tests/configuration; test command has no demonstrated value | Retain if Nest unit/integration testing is adopted; add tests before relying on CI. |
| Flutter test / flutter_lints | Mobile quality tools | Flutter SDK / `^5.0.0` | Declared only | Standard Flutter tooling | No tests or analysis workflow | Add analysis/test commands when mobile work begins. |
| Git / GitHub Actions | Source and automated verification | Git repo; Actions workflow versioned actions v4 | One CI YAML file | Familiar delivery foundation | Repository has no commits and no lockfile; CI cannot currently complete reliably | Establish initial commit, branch protection, release tags, and working CI baseline. |

## 9. CI/CD Tools

| Technology | Purpose | Current version | Current usage | Strengths | Weaknesses | Recommendation |
|---|---|---:|---|---|---|---|
| GitHub Actions | CI | `actions/checkout@v4`, `setup-node@v4`, `pnpm/action-setup@v4` | On push and pull request: install, lint, test, build | Standard hosted CI building block | No lockfile makes frozen install fail; no database-backed tests, security scanning, image build/push, deploy, provenance, or environment gates | Fix baseline first, then add test DB, dependency scanning, image publishing, staging, and production approval. |
| Docker Compose | Manual deployment orchestration | Compose specification; CLI version unknown | Builds/starts API, web, PostgreSQL, Redis | Simple single-VPS deployment | Manual operations, no image registry/release IDs, migrations not automated, no health checks for API/web | Retain short-term. Add a tagged image release workflow and migration stage before `up`. |

## 10. Docker Usage

### Current model

- Two multi-stage Node Alpine images: API and web.
- Local Compose exposes all service ports, including PostgreSQL and Redis.
- Production Compose keeps PostgreSQL and Redis internal, persists their volumes, and binds API/web to `127.0.0.1` for the reverse proxy.
- Redis AOF is enabled in the production profile.

### Strengths

- Clear separation of API, frontend, database, and queue broker.
- Production network design prevents direct Internet exposure of PostgreSQL/Redis.
- Multi-stage builds reduce final images compared with a build-tool runtime image.

### Weaknesses

- No `.dockerignore`; Docker build contexts can contain ignored local secrets/artefacts.
- Floating tags (`node:22-alpine`, `postgres:16-alpine`, `redis:7-alpine`) are not reproducible or pinned to vulnerability patches/digests.
- API/web health checks, non-root users, resource limits, security scanning, and image registry publishing are absent.
- VPS port changes to 3100/3101 were not committed into the repository production Compose file.
- Deployment instructions omit required `--env-file .env.production` in places.

### Recommendation

Keep Compose for the current single-VPS phase, but add a `.dockerignore`, non-root runtime users, health checks, resource policies, image digest strategy, an image registry, and a single version-controlled production Compose/vhost mapping.

## 11. Third-party Integrations

| Integration | Purpose | Current version / state | Current usage | Strengths | Weaknesses | Recommendation |
|---|---|---|---|---|---|---|
| SMTP / MailHog | Email delivery and local email testing | `mailhog/mailhog:v1.0.1` locally; `SMTP_URL` production placeholder | MailHog runs in local Compose; no application email sender exists | Simple local mail inspection | Production SMTP is unimplemented; queue jobs have no consumer | Choose a transactional provider and implement a provider abstraction, retries, delivery state, and credentials management. |
| Push notifications | Tenant/landlord notifications | Planned only | Invoice queue contains `push` channel string | Product-relevant delivery channel | No Firebase/APNs provider, device registration, or worker | Select FCM/APNs approach only when notification module is built. |
| WhatsApp | Optional invoice notification | Planned only | Invoice queue contains `whatsapp` channel string | Meets stated business goal | No Meta/Twilio provider, opt-in, template approval, or worker | Defer; select provider after privacy/consent and template requirements are documented. |
| Object storage | Document management | Planned only | No SDK or implementation | Required for scalable document storage | No provider, signing, malware scan, retention, or encryption design | Select S3-compatible storage before document module work. |
| Payment gateway | Payments and subscription billing | Not selected | Prisma `Payment` model only | Provider-neutral at present | No integration, webhooks, idempotency, or compliance strategy | Select a provider based on target market and GST/subscription needs before building payments. |
| Django / existing VPS application | Legacy/other workload | Version unknown | Previously served `api.noagent4u.com` | May support an unrelated existing site | It conflicts with NoAgent4U API routing and exposed Django debug output | Remove/relocate the conflicting `api` vhost mapping; do not treat Django as part of NoAgent4U. |

## 12. Technology Decisions

| Decision | Assessment | Recommendation |
|---|---|---|
| NestJS + TypeScript for the API | Good fit for a modular monolith, REST, validation, OpenAPI, and shared TypeScript contracts | Keep. Build modules consistently and avoid introducing FastAPI/Python without a business reason. |
| Next.js App Router for web | Good fit for an operations SaaS portal | Keep. Add real data/auth architecture before expanding UI. |
| PostgreSQL rather than VPS MariaDB | Correct for the existing Prisma schema and SaaS requirements | Keep PostgreSQL isolated in Docker; do not switch databases for convenience. |
| Prisma | Suitable for initial development | Keep with committed migrations and explicit transaction/tenant conventions. |
| Redis + BullMQ | Appropriate for notifications and scheduled work | Keep only after a worker and operations model exist. |
| Flutter mobile client | Reasonable if native apps are a committed product requirement | Maintain as a separate client; defer until backend contract stabilizes. |
| Docker Compose + Virtualmin | Pragmatic single-VPS model | Keep for MVP; codify vhost and release operations to prevent drift. |
| JWT + Argon2 | Sensible building blocks | Keep with a redesigned secure registration/session/revocation model. |

## 13. Upgrade Recommendations

### Immediate — before production users

1. Generate and commit `pnpm-lock.yaml`; make CI pass on an immutable dependency graph.
2. Create and commit Prisma migrations. Do not use `db push` as the production schema process.
3. Fix privileged registration and tenant/object authorization before allowing public signup.
4. Enable and test rate limiting; add request IDs, secure CORS/origin configuration, and a production Swagger policy.
5. Add a BullMQ worker or stop queuing notification jobs until delivery exists.
6. Add `.dockerignore`, container health checks, non-root users, and pinned image digests/patches.
7. Resolve the legacy Django mapping on `api.noagent4u.com` and commit the real reverse-proxy port mapping.

### Near term — feature delivery foundation

1. Add API integration tests with a temporary PostgreSQL/Redis environment.
2. Establish ESLint, Prettier checking, dependency updates, vulnerability scanning, and secret scanning.
3. Implement the frontend API client, authenticated layout, session handling, and error/loading states.
4. Complete one bounded context at a time, with API/DB/UI/test/documentation coverage.
5. Establish managed backup, restore, logging, metrics, and alerting processes for the VPS.

### Planned upgrades

- Evaluate the latest compatible Next.js, React, NestJS, Prisma, Flutter, PostgreSQL, and Redis versions quarterly.
- Evaluate Tailwind CSS 4 only after its migration impact is assessed against the chosen UI architecture.
- Move to a managed PostgreSQL/Redis service or a container orchestration platform only when single-VPS operational limits justify it.

## 14. Standard Version Policy

1. **Runtime policy:** Use supported Node.js LTS releases only. Standardize on Node 22 until a planned Node 24 migration passes CI and staging.
2. **Pinning policy:** Commit lockfiles. Use exact Docker image digests or approved patch versions. Avoid floating `*-alpine` tags in production.
3. **Package policy:** Permit patch updates automatically after CI/security checks; review minor updates monthly; schedule major-version upgrades quarterly or when vendor support requires them.
4. **Database policy:** Upgrade PostgreSQL one major version through a tested migration/restore rehearsal, not in-place during an incident. Maintain the current major until its vendor support window requires replacement.
5. **Framework compatibility:** Upgrade Next/React, NestJS, Prisma, and TypeScript as tested compatibility sets, not independently.
6. **Security policy:** Triage critical vulnerabilities within 48 hours, high within 14 days, and medium in the next planned maintenance cycle.
7. **Documentation policy:** Every runtime/framework/database upgrade must update the lockfile, release notes, compatibility test evidence, and rollback procedure.

## 15. Technology Lifecycle Strategy

| Lifecycle stage | Technologies | Strategy |
|---|---|---|
| Adopt / strategic | TypeScript, NestJS, Next.js, PostgreSQL, Prisma, Docker Compose, JWT/Argon2 | Establish standards, tests, owners, supported-version matrix, and production runbooks. |
| Trial / incomplete | BullMQ, Redis caching, Flutter, Swagger publication, Pino central logging | Use behind clear success criteria; do not claim production capabilities until workers, integrations, and operations exist. |
| Planned / not selected | Payment gateway, object storage, WhatsApp, push provider, subscription billing tooling | Make provider choices through lightweight ADRs covering cost, region, compliance, SLAs, data residency, and exit strategy. |
| Legacy / external to NoAgent4U | Existing MariaDB/Django/Virtualmin route | Isolate from NoAgent4U. Remove the `api` route conflict and document ownership/retirement plan separately. |
| Retire / remove if not adopted | Unused direct dependencies (`ioredis`, Joi), unreachable scheduler, unused public API URL variable | Remove only after a confirmed implementation decision; otherwise implement and document their operating model. |

### Review cadence

- Monthly: dependency/security review, image patch review, backup restore test status, and queue/runtime health.
- Quarterly: framework/runtime upgrade assessment, architecture decision review, dependency pruning, and cost/capacity check.
- Annually: PostgreSQL/Redis lifecycle review, disaster recovery exercise, VPS/vendor assessment, and mobile-support decision.

## Evidence sources

- Root and workspace `package.json` files, `pubspec.yaml`, `pnpm-workspace.yaml`.
- API source, Prisma schema, Dockerfiles, Docker Compose files, CI workflow, environment templates.
- Existing [current system audit](current-system-audit.md) and Virtualmin deployment guidance.
- VPS facts provided during deployment discussion; exact host software versions were not available in the repository and are marked as unknown.
