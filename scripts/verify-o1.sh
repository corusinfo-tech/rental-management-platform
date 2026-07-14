#!/usr/bin/env bash
# O1 verification runner. It never starts infrastructure or writes to a
# non-test database; callers must provide disposable test endpoints.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

require_environment() {
  : "${IDENTITY_TEST_DATABASE_URL:?IDENTITY_TEST_DATABASE_URL must target a disposable PostgreSQL database}"
  : "${REDIS_URL:?REDIS_URL must target a disposable Redis instance}"
}

run() {
  printf '\n==> %s\n' "$*"
  "$@"
}

require_environment
# Prisma resolves DATABASE_URL. Force it to the explicitly supplied disposable
# test URL rather than inheriting any developer environment value.
export DATABASE_URL="$IDENTITY_TEST_DATABASE_URL"

run pnpm prisma format --schema prisma/schemas
run pnpm prisma validate --schema prisma/schemas
run pnpm prisma generate --schema prisma/schemas
run pnpm prisma migrate deploy --schema prisma/schemas
run pnpm prisma db seed --schema prisma/schemas
run pnpm typecheck
run pnpm lint
run pnpm test
run pnpm --filter @noagent4u/worker test
run pnpm build

printf '\nO1 verification command sequence completed. Capture the evidence in docs/IMPLEMENTATION/O1_VERIFICATION_EVIDENCE.md.\n'
