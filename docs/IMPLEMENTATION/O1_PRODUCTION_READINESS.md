# O1 Production Readiness Checklist

**Current decision: NOT READY.** This is a readiness checklist, not proof of a
completed Gate O1.

## Blocking verification work

- [ ] Restore Node/pnpm dependencies from the locked workspace.
- [ ] Run Prisma format, validate, and generate.
- [ ] Execute clean PostgreSQL 16 migration, seed, and approved rollback
  rehearsal against a disposable database.
- [ ] Execute Redis integration tests against an isolated disposable instance.
- [ ] Run typecheck, lint, all tests, worker tests, and build.
- [ ] Prove all Organization outbox event policies at worker startup.
- [ ] Prove direct pending activation is denied and approval activation is
  atomic.
- [ ] Prove optimistic concurrency conflicts for settings, compliance, approval,
  and invitations.

## Architecture and security blockers

- [ ] Adopt or reject ADR-O1-001 with an approved PlatformPrincipal/
  PlatformRole implementation plan. Current platform-super-admin resolution is
  still tenant-membership based.
- [ ] Decide which terminal Organization events are intentionally local-only and
  assign a concrete idempotent handler before any event gains an external side
  effect.
- [ ] Complete worker operational hardening: bootstrap/deployment, monitoring,
  lease behavior, persistent provider idempotency, and atomic completion/audit
  semantics.
- [ ] Confirm the required Engineering Handbook and `AGENTS.md` are present and
  reconcile this work with their mandatory rules.

## Docker Compose review

`docker-compose.yml` contains PostgreSQL 16 and Redis 7 with health checks,
persistent volumes, and a named network. It is sufficient as a local service
foundation, but it does **not** currently provide the following O1 verification
capabilities:

- A dedicated disposable test database created separately from the persistent
  default `postgres_data` volume.
- A dedicated Redis test database/namespace and cleanup guard.
- An application API service for black-box API/Swagger integration verification.
- A worker service/entrypoint for end-to-end outbox processing verification.
- A test profile that can safely run `down -v` without affecting a developer's
  persistent local environment.

Do not modify production compose configuration for verification. Add an
approved test-only compose override/profile or CI service containers in a
separate change.

## CI recommendations (not applied)

The current workflow only installs dependencies, lints, tests, and builds. Add
separate fail-fast stages in this order:

1. Locked installation using pnpm 11.7.0 (align CI with `packageManager`).
2. Prisma format, validate, and generate.
3. Disposable PostgreSQL 16 and Redis 7 services with health waits.
4. Clean migration deployment, seed, schema constraint inspection, and approved
   rollback rehearsal.
5. Typecheck, lint, unit tests, database/Redis integration tests, and dedicated
   worker tests.
6. Build only after verification stages pass.
7. Persist redacted logs, migration history, worker evidence, and test reports
   as CI artifacts.

CI should reject skipped required PostgreSQL/Redis suites and should not expose
database URLs, credentials, tokens, or delivery-envelope plaintext in logs.

## Evidence required for a new Gate O1 review

- Completed `O1_VERIFICATION_CHECKLIST.md`.
- Completed `O1_VERIFICATION_EVIDENCE.md` with exit codes and artifacts.
- CI run links/artifacts proving all mandatory stages.
- A documented decision on outstanding ADR-O1-001 and worker risks.
