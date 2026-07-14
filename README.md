# NoAgent4U

Repository foundation for the NoAgent4U platform.

## Structure

- `apps/` — deployable API, web, worker, and scheduler applications.
- `packages/` — shared platform packages.
- `prisma/` — future database schemas, migrations, and seeds.
- `docs/`, `docker/`, `infra/`, `scripts/`, `tests/` — documentation, container, infrastructure, automation, and test assets.

## Commands

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

This milestone intentionally contains configuration and package boundaries only. It does not include application code, authentication, Prisma models, or database migrations.

## API foundation

The NestJS API exposes `GET /health` and Swagger UI at `GET /docs`. Both responses include `x-request-id` and `x-correlation-id` headers. Request validation, response envelopes, exception handling, and structured application logging are configured globally.

## Local infrastructure

Start the local infrastructure with `docker compose up -d`. Copy `.env.example` to `.env` first if you need to override any defaults.

| Service       | Host port                     | Purpose                          |
| ------------- | ----------------------------- | -------------------------------- |
| PostgreSQL 16 | `5432` (`POSTGRES_PORT`)      | PostgreSQL database              |
| Redis         | `6379` (`REDIS_PORT`)         | Cache and BullMQ backend         |
| pgAdmin       | `5050` (`PGADMIN_PORT`)       | PostgreSQL administration UI     |
| MinIO API     | `9000` (`MINIO_API_PORT`)     | S3-compatible object-storage API |
| MinIO Console | `9001` (`MINIO_CONSOLE_PORT`) | MinIO administration UI          |
| Mailpit SMTP  | `1025` (`MAILPIT_SMTP_PORT`)  | Local email capture SMTP server  |
| Mailpit UI    | `8025` (`MAILPIT_UI_PORT`)    | Captured-email web UI            |

No application containers are defined in the Compose file.
