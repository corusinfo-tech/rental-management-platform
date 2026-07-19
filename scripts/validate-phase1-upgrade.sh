#!/usr/bin/env bash
set -Eeuo pipefail

: "${PHASE1_UPGRADE_DATABASE_URL:?Set PHASE1_UPGRADE_DATABASE_URL to an empty disposable PostgreSQL database}"

REPOSITORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PSQL_BIN="${PHASE1_PSQL_BIN:-psql}"
cd "$REPOSITORY_DIR"

for PHASE1_SQL in prisma/migrations/*/migration.sql; do
  if [[ "$PHASE1_SQL" == *20260719120000_phase1_authorization_isolation* ]]; then
    continue
  fi
  "$PSQL_BIN" "$PHASE1_UPGRADE_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$PHASE1_SQL" >/dev/null
done

"$PSQL_BIN" "$PHASE1_UPGRADE_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/fixtures/phase1-preupgrade.sql >/dev/null
"$PSQL_BIN" "$PHASE1_UPGRADE_DATABASE_URL" -P pager=off -c 'SELECT (SELECT count(*) FROM "Organization") AS organizations, (SELECT count(*) FROM "OrganizationSettings") AS settings, (SELECT count(*) FROM "Property") AS properties, (SELECT count(*) FROM "Payment") AS payments, (SELECT count(*) FROM "PaymentAllocation") AS allocations, (SELECT count(*) FROM "LeaseParty") AS lease_parties, (SELECT count(*) FROM "MembershipRole") AS membership_roles'
"$PSQL_BIN" "$PHASE1_UPGRADE_DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql >/dev/null
"$PSQL_BIN" "$PHASE1_UPGRADE_DATABASE_URL" -P pager=off -f tests/fixtures/phase1-upgrade-assertions.sql
