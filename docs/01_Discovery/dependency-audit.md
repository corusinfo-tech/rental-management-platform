# NoAgent4U Dependency Audit

**Audit date:** 2026-07-13  
**Scope:** Static inventory of manifests, Docker files, Compose files, and source imports. No package installation, `npm audit`, `pnpm audit`, SBOM generation, or source-code modification was performed.

## 1. Executive Summary

NoAgent4U declares a small monorepo dependency set: a Next.js web application, NestJS API, Prisma/PostgreSQL persistence, Redis/BullMQ queueing, and a Flutter mobile starter. The direct dependency count is modest, which is positive for an early system.

The central supply-chain issue is the absence of `pnpm-lock.yaml`. All JavaScript dependencies use version ranges (`^`), so neither local development nor the Docker build resolves a stable, auditable dependency graph. This also makes the current GitHub Actions command `pnpm install --frozen-lockfile` non-functional. Without a lockfile and an installed dependency tree, no exact transitive dependency inventory, CVE result, or definitive license SBOM can be produced.

Static inspection identifies several unused direct dependencies (`ioredis`, `joi`, `class-transformer`, and several test/tooling packages) and a number of declared-but-not-yet-used mobile dependencies. There are no third-party SaaS SDKs for payments, messaging, cloud storage, push notifications, or WhatsApp. Docker image tags are floating and must be pinned before a production release.

## Audit limitations and notation

- **Declared version** is the literal version/range in a manifest. It is not a confirmed installed version.
- **Used** means there is a direct source import/configuration reference in the repository. It does not prove runtime reachability.
- **License** is the commonly published direct-package license and must be validated against the resolved package/version before release.
- The repository has no JavaScript lockfile and no installed `node_modules`; therefore a vulnerability report is not available.

## 2. Frontend Dependencies

### Runtime dependencies

| Package | Declared version | Purpose | Used? | Recommendation |
|---|---:|---|---|---|
| `@rentalos/contracts` | `workspace:*` | Internal TypeScript response/status contracts | No direct import in web source | Keep only when web consumes generated/shared API types; otherwise remove the dependency until used. |
| `next` | `^15.1.0` | App Router framework and standalone web build | Yes — `app/`, `next.config.ts`, build script | Keep. Resolve/lock the latest approved Next 15 patch first; assess a Next 16 major upgrade separately. |
| `react` | `^19.0.0` | UI component runtime | Yes — required by Next JSX runtime | Keep, pinned through lockfile alongside Next compatibility requirements. |
| `react-dom` | `^19.0.0` | Browser/server DOM renderer | Yes — required by Next | Keep, version-aligned with `react`. |

### Frontend development dependencies

| Package | Declared version | Purpose | Used? | Recommendation |
|---|---:|---|---|---|
| `@types/node` | `^22.10.2` | Node typings for Next config/build | Indirectly | Keep; align with the approved Node 22 runtime. |
| `@types/react` | `^19.0.0` | React TypeScript types | Indirectly | Keep; align with React. |
| `@types/react-dom` | `^19.0.0` | React DOM TypeScript types | Indirectly | Keep; align with React DOM. |
| `autoprefixer` | `^10.4.20` | CSS vendor-prefix processing | Yes — PostCSS config | Keep. |
| `postcss` | `^8.4.49` | CSS transform pipeline | Yes — PostCSS config | Keep. |
| `tailwindcss` | `^3.4.16` | Utility-first CSS generation | Yes — Tailwind config and CSS directives | Keep for current UI. Evaluate Tailwind 4 only through a planned migration. |
| `typescript` | `^5.7.2` | Frontend compilation/type checking | Yes | Keep, but deduplicate to root workspace version policy. |

## 3. Backend Dependencies

### Runtime dependencies

| Package | Declared version | Purpose | Used? | Recommendation |
|---|---:|---|---|---|
| `@nestjs/bullmq` | `^11.0.0` | Nest integration for BullMQ queues | Yes — invoice module registers queue | Keep only with a real queue worker/processor; otherwise remove queue creation until delivery is implemented. |
| `@nestjs/common` | `^11.0.1` | Nest decorators, exceptions, DI primitives | Yes — broadly imported | Keep; align all Nest packages to one tested patch version. |
| `@nestjs/config` | `^4.0.0` | Environment configuration | Yes — `ConfigModule.forRoot` | Keep; add structured environment schema validation. |
| `@nestjs/core` | `^11.0.1` | Nest application/runtime core | Yes — bootstrap and `Reflector` | Keep; align with Nest common/platform packages. |
| `@nestjs/jwt` | `^11.0.0` | JWT signing and verification | Yes — authentication service/guard | Keep; review key rotation and token policy. |
| `@nestjs/platform-express` | `^11.0.1` | Express HTTP adapter | Indirectly — required by `NestFactory.create` | Keep. |
| `@nestjs/swagger` | `^11.0.0` | Swagger/OpenAPI UI/document generation | Yes — API bootstrap/controllers | Keep; gate or secure Swagger in production according to policy. |
| `@nestjs/throttler` | `^6.2.1` | API rate limiting | Configured, but not enforced | Keep only if `ThrottlerGuard` is registered and tested; otherwise this is security theatre. |
| `@prisma/client` | `^6.1.0` | Generated Prisma database client | Yes — Prisma service and domain types | Keep paired exactly with the Prisma CLI; commit migrations and lockfile. |
| `argon2` | `^0.41.1` | Password and refresh-token hashing | Yes — auth service | Keep; explicitly configure/document Argon2id parameters. |
| `bullmq` | `^5.34.2` | Redis-backed queue and job API | Yes — invoice service queue type/job creation | Keep paired with `@nestjs/bullmq`; current npm 5.x releases are newer, so update within 5.x after testing. |
| `class-transformer` | `^0.5.1` | DTO object transformation support | No direct import | Remove unless it is deliberately used for serialization/transformation; Nest validation does not require direct application usage here. |
| `class-validator` | `^0.14.1` | DTO constraint validation | Yes — auth/agreement/invoice DTOs | Keep. |
| `helmet` | `^8.0.0` | HTTP security headers | Yes — API bootstrap | Keep; validate CSP/proxy behaviour in deployment. |
| `ioredis` | `^5.4.2` | Direct Redis client | No direct import | Remove unless direct cache/lock functionality is added; BullMQ manages its Redis client internally. |
| `joi` | `^17.13.3` | Environment/config schema validation | No direct import | Remove or adopt it for `ConfigModule` validation. |
| `nestjs-pino` | `^4.2.0` | Pino-based Nest structured logging | Yes — app module/main | Keep. Add request IDs and a production log sink. |
| `pino-pretty` | `^13.0.0` | Human-readable development logs | Yes — selected outside production | Move to `devDependencies`; it is not required in the production container. |
| `reflect-metadata` | `^0.2.2` | Decorator metadata runtime support | Indirectly required by Nest | Keep. |
| `rxjs` | `^7.8.1` | Nest interceptor observable support | Yes — response interceptor | Keep. |

## 4. Mobile Dependencies

| Package | Declared version | Purpose | Used? | Recommendation |
|---|---:|---|---|---|
| `flutter` | SDK | Flutter framework/material UI | Yes — `main.dart` imports Material | Keep. Lock Flutter SDK via FVM or a documented CI image before mobile delivery. |
| `dio` | `^5.7.0` | HTTP client | No | Retain only for planned API client; otherwise remove until mobile integration begins. |
| `flutter_secure_storage` | `^9.2.2` | Platform secure token storage | No | Retain for planned token storage, subject to the JWT/session design. |
| `flutter_riverpod` | `^2.6.1` | State management/DI | No | Retain only if Riverpod is the approved mobile state standard. |
| `go_router` | `^14.6.2` | Declarative routing | No | Retain only once multiple mobile routes exist. |
| `flutter_test` | Flutter SDK | Widget/unit test framework | No tests exist | Keep; add tests when implementation starts. |
| `flutter_lints` | `^5.0.0` | Flutter static lint rules | Not evidenced by analysis config/tests | Keep and run `flutter analyze` in mobile CI. |

## 5. Development Dependencies

| Package | Declared version | Purpose | Used? | Recommendation |
|---|---:|---|---|---|
| `prettier` | `^3.4.2` | Repository formatting | Root script only | Keep; add config and a check-only CI command. |
| `typescript` | `^5.7.2` | Shared TypeScript compiler | Yes — multiple workspace configs | Centralize/align at root where possible. |
| `@nestjs/cli` | `^11.0.0` | Nest development/build CLI | Yes — `nest` scripts | Keep. |
| `@nestjs/schematics` | `^11.0.0` | Nest code generation schematics | Not used by scripts/source | Optional; remove unless team uses `nest g` scaffolding. |
| `@nestjs/testing` | `^11.0.1` | Nest test module utilities | No tests exist | Keep only if test suite is added immediately. |
| `@types/express` | `^5.0.0` | Express TypeScript types | Yes — exception filter types | Keep. |
| `@types/jest` | `^29.5.14` | Jest TypeScript types | No test source | Keep with Jest adoption; otherwise remove together. |
| `@types/node` | `^22.10.2` | Node TypeScript types | Required indirectly | Keep and align to Node policy. |
| `eslint` | `^9.16.0` | JavaScript/TypeScript lint engine | Script declared; no config | Keep only after adding flat ESLint config. |
| `jest` | `^29.7.0` | API tests | Script declared; no tests/config | Keep with immediate test implementation; otherwise do not claim a test command. |
| `prisma` | `^6.1.0` | Prisma CLI/code generator/migration tool | Yes — API scripts/Docker build | Keep exactly aligned with `@prisma/client`. |
| `ts-jest` | `^29.2.5` | Jest TypeScript transformer | No test configuration | Remove until Jest TypeScript tests are configured, or add configuration/tests. |
| `ts-node` | `^10.9.2` | Execute TypeScript in Node | No script/source reference | Remove unless used by development/migration tooling. |

## 6. Docker Images

| Image | Declared tag | Purpose | Used? | Recommendation |
|---|---|---|---|---|
| `node` | `22-alpine` | API and web build/runtime images | Yes — both Dockerfiles | Pin to a tested patch/digest. Add non-root runtime users and image scanning. |
| `postgres` | `16-alpine` | PostgreSQL database | Yes — local and production Compose | Pin patch/digest; use a controlled major-upgrade plan and verified backups. |
| `redis` | `7-alpine` | BullMQ broker / future cache | Yes — local and production Compose | Pin patch/digest; configure memory policy/auth/TLS where appropriate. |
| `mailhog/mailhog` | `v1.0.1` | Local SMTP capture | Yes — development Compose | Development-only. Do not deploy to production. Consider a maintained local mail-testing alternative if needed. |

## 7. Node Runtime

| Item | Current declaration | Assessment | Recommendation |
|---|---|---|---|
| Node.js | `node:22-alpine` in Docker; Node 22 in CI | Appropriate current runtime family, but tag floats to new patches and local developer version is not enforced | Pin a tested image digest/patch; add `.nvmrc` or Volta/asdf policy and `engines` fields. |
| pnpm | `9.15.0` via root `packageManager`; Corepack in images | Appropriate for workspace layout | Generate/commit `pnpm-lock.yaml`; enable Corepack in CI; enforce frozen installs. |
| Runtime modules | pnpm install uses `--no-frozen-lockfile` in Docker | Non-reproducible; each build may resolve new allowed package releases | Use a committed lockfile and `--frozen-lockfile` in Docker release builds. |

## 8. Third-party SDKs

No external commercial/SaaS SDK is currently installed.

| Area | Current state | Recommendation |
|---|---|---|
| Email | `SMTP_URL` and local MailHog only; no sender SDK | Choose a transactional email provider and provider abstraction when notifications are implemented. |
| Push notifications | Not selected | Select FCM/APNs implementation only with a device-registration and consent model. |
| WhatsApp | Not selected | Select Meta Cloud API or an approved provider only after opt-in/template/compliance design. |
| Payments/subscriptions | Not selected | Choose gateway based on operating country, GST needs, webhook reliability, and PCI scope. |
| Object storage/documents | Not selected | Choose an S3-compatible service with encrypted storage, signed URLs, malware scanning, and lifecycle policy. |
| Error monitoring/APM | Not selected | Add an approved service or OpenTelemetry collector before production users. |

## 9. License Review

### Direct dependency license classification

| License family | Packages/images in scope | Assessment |
|---|---|---|
| MIT | NestJS packages, Next.js, React, Tailwind CSS, Prisma client/CLI, BullMQ, Argon2, class-validator, class-transformer, Helmet, ioredis, Pino/nestjs-pino/pino-pretty, Prettier, ESLint, Jest, ts-jest, TypeScript, Dio, Riverpod, secure storage, MailHog (commonly published as MIT) | Generally compatible with commercial SaaS use; retain copyright/notice obligations in generated SBOM/license attribution. |
| Apache-2.0 | RxJS is commonly Apache-2.0; some transitive packages may also be Apache-2.0 | Generally commercial-friendly; preserve notices and patent clauses. |
| BSD | Joi is commonly BSD-3-Clause; Flutter/Dart ecosystem components commonly use BSD-style licenses; PostgreSQL uses the PostgreSQL License (BSD-like) | Generally commercial-friendly; preserve notices. Verify exact resolved versions. |
| GPL / copyleft | No direct GPL package is identified in manifests | No direct copyleft blocker identified. A full transitive SBOM scan is still required before release. |
| Commercial / source-available | No commercial SDK is declared. Redis licensing must be reviewed against the exact resolved image/tag because licensing differs across Redis release families. | Avoid unreviewed Redis tag drift; pin the exact image/digest and document its license. |

License classification is not legal advice. The release process should generate an SPDX or CycloneDX SBOM from the locked dependency graph and run an automated license-policy check.

## 10. Outdated Packages

### Confirmed version-management issues

- No `pnpm-lock.yaml` exists, so exact resolved versions are unknown.
- Every JavaScript dependency allows semver upgrades through a caret range.
- Docker tags float within a major line.
- Flutter/Dart package resolution is not represented by a committed `pubspec.lock`.

### Candidate updates requiring compatibility review

| Package family | Declared baseline | Current-status observation | Recommendation |
|---|---:|---|---|
| Next.js | `^15.1.0` | Newer Next 15 patches and Next 16 are published | Upgrade to the latest tested Next 15 patch first. Treat Next 16 as a planned major migration. |
| NestJS | `^11.0.x` | Newer Nest 11 patches are published | Align all Nest packages on a current tested 11.x patch via lockfile. |
| Prisma | `^6.1.0` | Current Prisma has a newer 6.x line and Prisma 7 major is published | Upgrade to latest compatible 6.x first; evaluate Prisma 7 separately due to potential migration changes. |
| BullMQ | `^5.34.2` | Newer BullMQ 5.x releases are published | Upgrade within 5.x after worker/queue tests exist. |
| React | `^19.0.0` | Newer React 19 patches likely resolve under the caret once locked | Let Next dictate tested React version; lock it. |
| Docker images | Major-only tags | New image patches release continuously | Pin digest after vulnerability scan; refresh on a regular patch cadence. |

This table is a maintenance signal, not a command to perform untested major upgrades. As of the audit date, npm reports Next 16.2.10, Nest 11.1.28, BullMQ 5.79.3, and Prisma 7.8.0 as current release lines; those observations do not establish compatibility with this codebase. [Next on npm](https://www.npmjs.com/package/next), [Nest on npm](https://www.npmjs.com/package/@nestjs/common), [BullMQ on npm](https://www.npmjs.com/package/bullmq), [Prisma on npm](https://www.npmjs.com/package/prisma).

## 11. Unused Packages

### Directly evidenced as unused in current source

| Package | Location | Recommended action |
|---|---|---|
| `ioredis` | API runtime dependency | Remove unless direct Redis/cache/lock access is implemented. |
| `joi` | API runtime dependency | Remove or use for environment validation. |
| `class-transformer` | API runtime dependency | Remove unless serialization/transformation is adopted explicitly. |
| `pino-pretty` | API runtime dependency | Move to `devDependencies`; it is only selected outside production. |
| `@nestjs/schematics` | API dev dependency | Remove if the team does not use Nest generation commands. |
| `@nestjs/testing`, `jest`, `@types/jest`, `ts-jest` | API dev dependencies | Either add a test suite/configuration or remove until testing is introduced. |
| `ts-node` | API dev dependency | Remove unless a TypeScript runtime script is added. |
| `@rentalos/contracts` | Web runtime dependency | Keep only after consuming shared types in web code. |

### Declared but not yet used mobile packages

`dio`, `flutter_secure_storage`, `flutter_riverpod`, and `go_router` are appropriate planned dependencies, but no mobile code uses them. Retain only if the Flutter roadmap is active; otherwise reduce the starter to Flutter/Material and add packages with the features that need them.

## 12. Duplicate Packages

| Duplicate / overlap | Locations | Assessment | Recommendation |
|---|---|---|---|
| `typescript` | Root, API dev dependencies, web dev dependencies | Intentional workspace duplication but can drift | Use one aligned workspace version/range and lockfile. |
| `@types/node` | API and web dev dependencies | Intentional, but version consistency matters | Keep aligned through workspace policy. |
| Nest/BullMQ Redis capability | `bullmq` and unused direct `ioredis` | `ioredis` is not a functional duplicate, but it overlaps with queue Redis client capability | Remove `ioredis` until direct Redis use exists. |
| Prisma client/CLI | API dependencies/dev dependencies | Required pair, not a duplicate | Keep exact compatible versions. |
| `pino-pretty` | Runtime dependency used in development only | Environment classification mismatch | Move to dev dependency. |

No duplicate JavaScript package versions can be verified without a lockfile/install tree.

## 13. Security Vulnerabilities

### Vulnerability-scan status

**No verified package CVEs can be reported from this repository state.** `pnpm audit`/`npm audit` was not run because installation is prohibited and no lockfile exists. A declared range is not an installed package version; CVE matching against it would be unreliable.

### Supply-chain and dependency security findings

| Severity | Finding | Impact | Recommendation |
|---|---|---|---|
| High | No JavaScript lockfile | Dependency builds are not reproducible; a later build can introduce a vulnerable transitive version without a repository change | Create/commit `pnpm-lock.yaml`; use frozen installs in CI/Docker. |
| High | Floating Docker image tags | Runtime OS/library patches and potentially breaking changes drift between builds | Pin images by digest; scan images in CI and update through reviewed PRs. |
| Medium | No dependency or container scanning in CI | Known CVEs/licenses are not detected before deployment | Add lockfile-based `pnpm audit`, OS/container scanner, secret scanner, and SBOM generation. |
| Medium | Redis licensing/tag uncertainty | `redis:7-alpine` floats; licensing/security characteristics should be tied to exact digest | Pin exact image/digest and record license/security review. |
| Medium | Native `argon2` dependency | Native binaries require ABI/build-chain compatibility and need regular security updates | Lock/test across Node versions; scan published artifacts. |
| Low | Development MailHog image is old and development-only | Must not become a production mail relay | Keep outside production Compose and scan/update or replace in development. |

Application authorization and deployment-routing issues are documented in `current-system-audit.md`; they are security defects but not package CVEs.

## 14. Upgrade Recommendations

1. Create a baseline lockfile using the approved Node/pnpm versions and commit it before changing individual packages.
2. Align all `@nestjs/*` packages to one tested current 11.x patch version; update Prisma CLI/client together to a tested 6.x release.
3. Update Next.js to the latest tested 15.x patch before considering Next 16; verify React compatibility through Next’s supported range.
4. Move `pino-pretty` to development dependencies, then remove unused `ioredis`, `joi`, and `class-transformer` unless implementation work justifies them.
5. Add a real test suite before retaining the Jest/testing toolchain; otherwise remove inactive test dependencies temporarily.
6. Pin Node, PostgreSQL, Redis, and MailHog image digests; run a vulnerability scan on every rebuilt image.
7. Commit Flutter’s lockfile and standardize Flutter SDK version through FVM or CI image when mobile development begins.
8. Introduce Renovate or Dependabot after CI is green, with grouped patch/minor PRs and manual approval for majors.

## 15. Immediate Cleanup Tasks

1. Commit an initial Git baseline and `pnpm-lock.yaml`.
2. Add `.dockerignore` to exclude `.env*`, local dependencies, build output, Git metadata, and documentation attachments from Docker context.
3. Change Docker installs from `--no-frozen-lockfile` to `--frozen-lockfile` once the lockfile exists.
4. Add a flat ESLint configuration or remove non-functional lint scripts until one exists.
5. Add Jest configuration and at least authentication/invoice tests, or remove inactive Jest-related dependencies.
6. Remove/move the directly unused packages listed above after confirming no planned near-term use.
7. Pin production image digests and add API/web health checks to production Compose.
8. Add CI stages for dependency audit, container scan, secret scan, SBOM, and license-policy validation.
9. Commit a `pubspec.lock` if the Flutter application is delivered as an application; otherwise document why it is excluded.
10. Establish an owner and review cadence for dependency upgrades, security advisories, and Docker base-image refreshes.

## Evidence sources

- Root/API/web/contracts `package.json`, Flutter `pubspec.yaml`, Dockerfiles, Docker Compose files, CI workflow, and direct source-import search.
- No lockfiles, installed package directories, or package-audit reports are present.
- Current release-line observations were checked against official npm package pages on 2026-07-13; see linked sources in the outdated-package section.
