#!/usr/bin/env bash
# Restores the locked workspace. It never creates secrets or starts services.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v node >/dev/null || { echo "Node.js is required" >&2; exit 1; }
command -v corepack >/dev/null || { echo "Corepack is required to activate pnpm 11.7.0" >&2; exit 1; }

corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install --frozen-lockfile
pnpm prisma --version
docker compose -f docker-compose.test.yml config --quiet

echo "Bootstrap complete. Copy .env.example to a local untracked .env and supply local-only values before starting application services."
