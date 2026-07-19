# NoAgent4U Integration and Template Audit

Audit date: 2026-07-19

## Executive summary

No production-ready communication integration, payment gateway, or reusable template-management feature was found. There are valuable foundations: transactional outbox records, encrypted verification delivery envelopes, a provider registry abstraction, SMTP configuration parsing, and provider interfaces for SMS and WhatsApp. The worker has real concurrency/retry/DLQ mechanics. However, its runtime composes organization event handlers as terminal no-ops, and no concrete SMTP transport or SMS/WhatsApp delivery provider is wired into production execution.

Payment functionality is currently a manual completed-payment ledger with allocation, receipt, advance, refund-reservation, and invoice-recalculation logic. It is not a gateway integration. There are no webhook endpoints, signature validation, provider-event idempotency, pending/failed/reconciled states, secret configuration, or reconciliation queue.

No agreement, invoice, receipt, email, SMS, or WhatsApp template model/API/UI exists. Property and lease document endpoints register a storage key but do not implement upload, safe download, or document rendering.

## Current integration inventory

| Capability                      | Evidence                                                                                                           | Status    | Conclusion                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------- |
| Transactional outbox            | `apps/worker/src/outbox/outbox-worker.ts`; identity/outbox schema and `20260714090000_transactional_outbox_worker` | `PARTIAL` | Real locking, retry, DLQ, readiness and metrics; business delivery handlers are incomplete.                |
| Organization event handling     | `apps/worker/src/outbox/organization-event-policy.ts`, `handlers.ts`, `runtime.ts`                                 | `STUB`    | Current policies intentionally mark organization events terminal/no-op.                                    |
| Encrypted verification envelope | `apps/api/src/identity/verification/verification-envelope.service.ts`; delivery-envelope migration                 | `PARTIAL` | Sound foundation for limiting plaintext secrets in event payloads, but delivery composition is incomplete. |
| Email provider abstraction      | `apps/worker/src/notifications/provider-registry.ts`, `smtp-email-provider.ts`, `config/smtp-config.ts`            | `STUB`    | Wrapper/config exist; no concrete SMTP transport/bootstrap/config UI/log workflow.                         |
| SMS                             | `verification-engine/sms-provider.ts` and SMS verification service                                                 | `STUB`    | Interface/generation exists; no provider adapter or runtime delivery.                                      |
| WhatsApp                        | `verification-engine/whatsapp-provider.ts` and WhatsApp verification service                                       | `STUB`    | Interface/generation exists; no Cloud API/provider adapter, webhook, template map or runtime delivery.     |
| Payment gateway                 | None                                                                                                               | `MISSING` | Manual payment records must not be presented as gateway processing.                                        |
| File/object storage             | Property/lease APIs accept `storageKey`                                                                            | `STUB`    | No upload adapter, signed URL policy, scan/validation, or web workflow.                                    |
| Templates                       | No schema/controller/service/web route                                                                             | `MISSING` | No reusable document/message template system.                                                              |
| Scheduler                       | `apps/scheduler` has manifests only                                                                                | `STUB`    | No rent-generation, overdue, expiry or reminder jobs.                                                      |
| Integration settings            | Organization settings stores branding/locale/invoice/support defaults                                              | `MISSING` | No provider configs, enable switches, connection tests, secret lifecycle, or logs.                         |

## Communication architecture recommendation

Keep communications inside the modular monolith with provider adapters and outbox-driven workers:

```text
Domain transaction
  -> durable Domain/Notification Intent + outbox event
  -> worker claims event
  -> template version resolved and rendered
  -> provider-neutral DeliveryAttempt created
  -> selected provider adapter sends
  -> provider message ID/status recorded
  -> webhook/poll updates delivery status
  -> retry or dead-letter based on classified failure
```

Do not put raw provider credentials or complete rendered secrets in outbox payloads. Events should contain stable internal IDs. The worker loads authorized data, a published template version, and decrypted credentials at execution time.

### Proposed records

| Model                     | Key fields/purpose                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IntegrationConnection`   | organization, channel/type, provider code, mode, enabled, encrypted config reference, key version, verification state, last test/result, timestamps |
| `NotificationIntent`      | organization, event type, recipient reference, channel preference, template key/version, source aggregate, dedupe key, scheduled time               |
| `DeliveryAttempt`         | intent, provider, attempt number, provider message ID, status, classified error code, sent/delivered/failed timestamps, redacted diagnostic         |
| `ProviderWebhookEvent`    | provider, external event ID unique, signature result, received/processed timestamps, encrypted/redacted payload reference                           |
| `CommunicationPreference` | person/user, organization, channel consent/opt-out, locale, quiet hours where legally appropriate                                                   |

Separate provider connection status from message delivery status. A successful connection test does not prove a specific message was delivered.

## Secure settings design

Recommended route structure:

```text
/settings/integrations
  /email
  /sms
  /whatsapp
  /payments
/communications/delivery-log
/settings/templates
```

Every connection screen should include provider, mode, enabled state, public identifiers, redacted secret status (`Configured`, `Not configured`, `Rotation required`), last connection test, webhook status, and a link to filtered delivery events. Never re-display a saved secret.

Security controls:

- Encrypt secret values with envelope encryption and record encryption-key version.
- Separate `view integration metadata`, `change configuration`, `test connection`, and `rotate secret` permissions.
- Audit configuration changes without logging secret values.
- Use one-time secret entry; updates replace rather than merge unknown secret values.
- Validate callback URLs and prevent server-side request forgery in connection tests.
- Redact authorization headers, tokens, phone/email content, and provider payloads from logs.
- Restrict test messages to authorized verified destinations or a configured safe recipient.
- Support key rotation and provider deactivation without deleting historical delivery evidence.

## Channel-specific gaps and plan

### Email

Current status: `STUB`.

Required:

- Concrete SMTP transport or approved provider adapter.
- Host/port/TLS/auth/from/reply-to validation and safe connection test.
- DKIM/SPF/DMARC operational guidance (DNS remains outside application scope).
- Bounce/complaint handling where the provider supports it.
- Rendered HTML plus accessible plain text.
- Delivery attempt and failure logs.

TLS options should be explicit (`implicit TLS`, `STARTTLS required`) and insecure certificate bypass must not be exposed in production UI.

### SMS

Current status: `STUB`.

Required:

- Provider-neutral `SmsProvider` implemented by the selected vendor adapter.
- Sender ID/number validation, regional restrictions, segment estimation, consent/opt-out policy.
- Provider delivery callbacks with idempotency.
- Character/encoding preview and template length warnings.

### WhatsApp

Current status: `STUB`.

Required:

- WhatsApp Business/Cloud API or approved BSP adapter.
- Business account/phone-number identifiers, access-token secret, webhook verification token, app secret.
- Approved-template mapping by language and provider template version.
- Webhook signature verification and message-status processing.
- Conversation-window policy; do not assume free-form messages are always allowed.
- Connection/permission diagnostics and delivery log.

### Notifications in product

An in-app notification center is `MISSING`. Add it only after a durable notification intent/read state is defined. Do not treat external provider delivery as the sole source of truth.

## Payment gateway audit and target architecture

### Existing manual payment foundation

`apps/api/src/finance/payment.service.ts` provides important accounting protections: completed payment recording, allocations, unapplied advance, refund reservation, receipt creation, and invoice outstanding recalculation within transactions. Corresponding unit tests cover partial/multiple allocations, overpayment prevention, advance application, and refunds. Status: `BACKEND ONLY` because there is no usable web operation flow.

### Missing gateway capabilities

- Provider adapter and connection configuration.
- Checkout/payment-intent creation.
- Test/live modes.
- Signed webhook verification.
- Unique provider event and transaction identifiers.
- Pending, successful, failed, refunded/partially refunded, unreconciled/reconciled states.
- Duplicate webhook protection and safe replay.
- Settlement/payout reconciliation and exception queue.
- Gateway fees and net settlement representation.
- Refund execution/status synchronization.
- User-facing online Pay action.

### Recommended gateway boundary

```text
PaymentGatewayAdapter
  createPaymentIntent(input) -> redirect/client payload
  verifyWebhook(rawBody, headers) -> normalized event
  fetchPayment(externalId) -> normalized status
  refund(input) -> normalized refund
  testConnection(config) -> diagnostic
```

Normalized gateway events must not directly mutate invoice balances. First persist the verified provider event under a unique `(provider, externalEventId)` constraint, resolve it to an internal gateway transaction, then invoke the existing allocation service exactly once. Raw request bytes must remain available to signature verification before JSON transformation.

### Proposed gateway records

| Model                           | Purpose                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `PaymentGatewayConnection`      | Organization/provider/mode, encrypted config, enabled/tested state                                   |
| `GatewayPaymentIntent`          | Internal amount/currency/payer/invoice context, provider intent/reference, expiry/status             |
| `GatewayTransaction`            | Provider payment ID, gross/fee/net, method, normalized state, linked manual `Payment` when completed |
| `GatewayWebhookEvent`           | Unique external event, signature/processing state, retry/error metadata                              |
| `Settlement` / `SettlementLine` | Provider payout and transaction reconciliation                                                       |
| `GatewayRefund`                 | Requested/provider amount and state, link to internal refund record                                  |

Use integer minor units or the repository's established exact decimal strategy consistently; never use floating point for money.

## Template system audit

No document-template or print-format implementation was found. Status: `MISSING`. A new system will not duplicate current code.

### Template types in scope

- Lease agreement, renewal agreement, termination notice.
- Rent invoice and payment receipt.
- Rent due, overdue, lease-expiry, payment-success, and payment-failure messages.
- Channel variants: email subject/HTML/text, SMS, WhatsApp approved-template mapping.

### Recommended data model

| Model                        | Purpose                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `TemplateDefinition`         | Stable organization/global key, type/channel/locale, active state, description                         |
| `TemplateVersion`            | Immutable version, draft/published/retired state, content, schema version, created/published by/time   |
| `TemplateVariableDefinition` | Name, type, required/optional, privacy classification, example, allowed formatter                      |
| `TemplateRender`             | Source aggregate, exact published version, input snapshot/hash, output storage key/hash, render status |
| `TemplateAuditEvent`         | Draft, preview, publish, retire and override actions                                                   |

Global defaults may be copied or inherited, but organization overrides must have clear precedence and a safe reset-to-default action.

### Rendering and validation

- Use a deliberately restricted expression/merge-field language; never evaluate arbitrary JavaScript or unrestricted server-side templates.
- Validate unknown and missing required variables on save/publish and again at render.
- Escape values by output context (HTML, text, PDF) and sanitize allowed rich text.
- Preview with synthetic data clearly labeled as preview; never draw arbitrary production tenant data into a design preview.
- Published versions are immutable. Editing creates a new draft; in-flight notifications retain their chosen version.
- Persist a render snapshot/hash for legal/financial documents so later template changes cannot alter historical artifacts.
- Define locale, currency, date/time zone, page size, fonts, headers/footers, and signature blocks.
- Generated PDFs require server-side rendering, deterministic assets, access control, retention, and download audit.

## Migration requirements

Recommended migration order:

1. Add template definitions/versions/variables/audit without seeding organization content.
2. Add integration metadata and encrypted-secret references; do not place plaintext provider keys in SQL migrations.
3. Add notification intent/delivery/webhook records and unique dedupe/index constraints.
4. Add gateway connection/intent/transaction/webhook/refund/settlement records.
5. Seed only safe global template definitions/drafts; require explicit organization publish/enable.
6. Backfill existing receipts/invoices only if historical artifact requirements are approved; do not fabricate sent/delivery history.

All migrations must be additive first, idempotently backfilled where needed, and deployable before new workers begin consuming events.

## Test strategy

### Unit/contract

- Provider adapter conformance and error classification.
- Template parsing, variable validation, escaping, locale/formatting and deterministic render.
- Webhook signature fixtures from official provider specifications.
- Gateway normalized-state transition and money/allocation invariants.

### Integration

- Outbox transaction-to-worker-to-delivery state using PostgreSQL concurrency.
- Retry/DLQ and safe replay without duplicate sends/allocations.
- Encrypted credential round trip and rotation; assert secrets never appear in responses/logs.
- Raw-body webhook verification, duplicate event, out-of-order status, unknown transaction, and cross-organization attack cases.
- PDF snapshot/hash and signed download authorization.

### End to end

- Authorized admin configures/tests/disables an integration; unauthorized roles are denied by the API.
- Draft/preview/publish template, render against an authorized record, send, inspect delivery status.
- Tenant pays one or multiple invoices; duplicate webhook does not duplicate payment/allocation.
- Failed/unreconciled/refunded payment appears in the operator exception queue.

## Delivery phases

1. P0 secret store, permissions, audit and webhook security conventions.
2. P1 templates plus deterministic rendering/storage foundation.
3. P1 email adapter and delivery log; use this to prove the outbox path.
4. P1 overdue/expiry/rent scheduler and notification intents.
5. P1 first payment gateway with idempotent reconciliation.
6. P2 SMS and WhatsApp adapters/template mappings.
7. P2 in-app notifications, connection health and operational reporting.

## Decisions requiring approval

1. First email, SMS, WhatsApp and payment providers; target countries/currencies materially affect the choice.
2. Secret-management mechanism and encryption-key owner/rotation process.
3. Whether invoice/receipt/agreement PDFs are legally authoritative records and their retention period.
4. Supported locales, currencies, tax/GST fields, and organization-specific numbering.
5. Communication consent, quiet-hours, opt-out, and data-retention policy.
6. Whether gateway fees are absorbed, passed through, or separately invoiced, subject to local rules.

No provider should be enabled in production until these decisions and the P0 authorization work are complete.
