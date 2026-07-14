#!/usr/bin/env bash
# Full disposable O1 verification wrapper. Stops at the first failure.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export IDENTITY_TEST_DATABASE_URL="${IDENTITY_TEST_DATABASE_URL:-postgresql://noagent4u_test:noagent4u_test_password@127.0.0.1:${TEST_POSTGRES_PORT:-55432}/noagent4u_test}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:${TEST_REDIS_PORT:-56379}/15}"

cleanup() {
  docker compose -f docker-compose.test.yml down --volumes --remove-orphans
}
trap cleanup EXIT

docker compose -f docker-compose.test.yml up --build --wait postgres redis mailpit minio api
bash scripts/reset-test-db.sh
docker compose -f docker-compose.test.yml up -d --wait worker
bash scripts/verify-o1.sh
