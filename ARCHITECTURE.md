# Architecture decisions

## Domain boundaries

`auth`, `users`, `properties`, `units`, `agreements`, `gst`, `invoice-templates`, `invoices`, `payments`, `maintenance`, `notifications`, `documents`, `reports`, and `subscriptions` are bounded contexts. Each context owns its controller, application service, DTOs, domain interfaces, and repository adapter. Cross-context communication occurs through typed domain events/queues, not direct database access.

## Scale and security

PostgreSQL is the source of truth; `tenant_id` prefixes tenant-scoped indexes. Use a transaction for invoice allocation and add an idempotency-key table before connecting payment gateways. Redis backs BullMQ, rate limiting, cache-aside reads, and distributed locks. Stateless API replicas can scale horizontally. Store documents in object storage through a `DocumentStoragePort`; never store blobs in PostgreSQL.

JWT access tokens are short-lived and refresh tokens are hashed at rest. Enforce roles in controllers and object-level authorization in services. Add PostgreSQL RLS as defense in depth for a managed multi-tenant deployment. Logs redact credentials; every state mutation writes an audit event with actor and trace ID.

## Extraction path

Start with a single database/schema and outbox events. Extract Notifications first, then Invoicing/Payments, by replacing in-process ports with queue consumers while retaining API contracts and domain models.
