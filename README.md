# RentalOS

RentalOS is a multi-tenant rental-management SaaS. It uses a modular NestJS API, Next.js web app, Flutter mobile app, PostgreSQL, Redis, and BullMQ.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

The API runs at `http://localhost:3001/api/v1`, Swagger at `/docs`, and the web app at `http://localhost:3000`.

## Architecture

- `apps/api` — NestJS modular monolith with clean domain boundaries.
- `apps/web` — Next.js App Router operations portal.
- `apps/mobile` — Flutter tenant and landlord application.
- `packages/contracts` — versioned API contracts shared by TypeScript clients.
- `infra` — deployment and operational artefacts.

Every tenant-owned table includes `tenant_id`. Requests resolve tenant context from the authenticated user, never from an untrusted body field. Domain modules depend on application ports, not implementation details, to allow gradual extraction into microservices.

## Invoice behaviour

Invoices are manual by default. A landlord explicitly creates an invoice from an active agreement. Automatic generation is opt-in per agreement and its job verifies the agreement is active and has not been vacated or cancelled immediately before issuing an invoice.

## API envelope

Successful responses: `{ "success": true, "data": {}, "meta": {} }`.
Failures: `{ "success": false, "error": { "code", "message", "details", "traceId" } }`.
