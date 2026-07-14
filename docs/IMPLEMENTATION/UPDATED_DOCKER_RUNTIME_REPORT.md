# Updated Docker Runtime Report

## Updated files

- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`

## Verification

| Command | Result |
| --- | --- |
| `docker compose build api worker` | BLOCKED: `docker: command not found` |
| `docker compose up` | NOT RUN: Docker CLI unavailable |

## Static package check

- API and Worker Dockerfiles use `pnpm deploy --filter <workspace> --prod`.
- No runtime image copies `node_modules` directly from the workspace build stage.
