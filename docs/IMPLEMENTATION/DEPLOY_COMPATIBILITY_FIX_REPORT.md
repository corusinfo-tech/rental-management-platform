# Deploy Compatibility Fix Report

## Root cause

pnpm v11's default `deploy` implementation requires `inject-workspace-packages=true`. The repository does not set that option, so the Docker build failed with `ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE`.

## Dockerfile changes

- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`

Both deployment commands now use:

```sh
pnpm --filter @noagent4u/<workspace> --prod deploy --legacy <target-directory>
```

## pnpm v11 compatibility

pnpm v11 documents `--legacy` as the deploy mode that works without `inject-workspace-packages=true`. It still produces an isolated, portable production deployment and leaves the workspace configuration unchanged. [pnpm deploy documentation](https://pnpm.io/cli/deploy)

## Verification results

| Command | Result |
| --- | --- |
| `docker compose -f docker-compose.test.yml build api worker` | BLOCKED: `docker: command not found` |

Docker build verification remains pending on a host with Docker Desktop or a Docker-compatible CLI.
