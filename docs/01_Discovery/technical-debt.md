# Technical Debt Register

| Severity | Area | Debt | Effort | Recommendation |
|---|---|---|---|---|
| Critical | Security/API | Public registration permits client-chosen `ADMIN`; tenant/object authorization incomplete | Medium | Redesign bootstrap and policy checks before public use. |
| Critical | Database/CI | No migrations, no lockfile, no committed baseline | Medium | Commit migration/lockfile; make CI/release reproducible. |
| High | Architecture | Documented clean architecture/repositories/events are not implemented; direct Prisma services | Large | Establish module/application/repository conventions as each feature is added. |
| High | Backend | Queue jobs have no worker; scheduler is unreachable | Medium | Implement worker/scheduling/observability or remove claims. |
| High | Tests | No test files/configuration despite Jest scripts | Medium | Add API integration/security tests and frontend/mobile tests. |
| High | Frontend | Static dashboard, no auth/API client/routing | Large | Build client architecture before UI expansion. |
| High | Docker/operations | No `.dockerignore`, health checks, non-root, digest pins, versioned vhost config | Medium | Harden image/deployment baseline. |
| Medium | Configuration | One-line modules, untyped env config, docs/actual VPS port drift | Small | Format code, add config schema, maintain canonical deployment config. |
| Medium | API | No response DTOs/pagination/filtering/idempotency/error taxonomy | Medium | Define API contract standards before list/payment APIs. |
| Medium | Database | Missing FKs/checks/timestamps/indexes/financial tables | Large | Design through reviewed migrations. |
| Medium | Logging | No request IDs, central sink, metrics/tracing | Medium | Add observability standards and infrastructure. |
| Medium | Dependencies | Unused packages and no SCA/SBOM | Small | Lock, scan, prune, automate updates. |
| Low | Folder structure | `infra/` documented but absent; contracts unused | Small | Remove stale references or implement. |
| Low | Naming | RentalOS identifiers coexist with NoAgent4U branding | Small | Decide/product-wide rename and update deliberately. |

## Priority Plan

- **First:** security, migrations/lockfile, test baseline, deployment hardening.
- **Next:** property/unit/agreement/invoice vertical slice with complete API/UI/tests.
- **Then:** queue/delivery/payments/documents and operational observability.
