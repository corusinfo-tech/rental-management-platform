#!/usr/bin/env bash
# Destructive only for the explicitly named disposable test database.
set -Eeuo pipefail

: "${IDENTITY_TEST_DATABASE_URL:?IDENTITY_TEST_DATABASE_URL is required}"
case "$IDENTITY_TEST_DATABASE_URL" in
  *test*|*TEST*) ;;
  *) echo "Refusing reset: test database URL must contain 'test'." >&2; exit 1 ;;
esac

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
export DATABASE_URL="$IDENTITY_TEST_DATABASE_URL"

pnpm prisma migrate reset --force --skip-seed --schema prisma/schemas
pnpm prisma db seed --schema prisma/schemas
