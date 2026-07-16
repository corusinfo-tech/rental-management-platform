# Runtime Packaging Fix Report

## Root cause

The API and Worker runtime images copied `node_modules` directly from the pnpm workspace build stage. In a pnpm workspace, those directories contain links into pnpm's shared virtual store and workspace layout. The copied subset did not preserve every target required by the API's production dependency graph, so Node could not resolve `express` at runtime.

## Files changed

- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`

## Packaging strategy

Each multi-stage build now:

1. Installs and builds in the workspace build stage.
2. Runs `pnpm deploy --filter <workspace> --prod <destination>` to create a self-contained production deployment for that application.
3. Copies that deployment into the runtime image, then copies only the compiled `dist` output.

This uses pnpm's supported workspace deployment mechanism. No runtime `pnpm install`, manual module copying, or application-code change was introduced. The API continues to start `dist/main`; the Worker continues to start `dist/main.js`.

## Verification performed

- `docker compose build api worker` — **not executed successfully** because the Docker CLI is unavailable in this environment (`docker: command not found`).
- `docker compose up` — **not run** because Docker is unavailable.
- API and Worker container startup remain **pending verification**.

Run the following where Docker Desktop is available:

```sh
docker compose build api worker
docker compose up
```

Expected evidence:

- API starts without `Cannot find module 'express'` and its health check becomes healthy.
- Worker starts, connects to PostgreSQL and Redis, and its health check becomes healthy.
