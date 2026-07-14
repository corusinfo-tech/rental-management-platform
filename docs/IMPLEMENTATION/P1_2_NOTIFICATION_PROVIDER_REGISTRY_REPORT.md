# P1.2 — Notification Provider Registry Report

## Architecture

`NotificationProviderRegistry` lives in `apps/worker/src/notifications/provider-registry.ts`. It is the sole worker-side provider resolution boundary. Workers and handlers do not instantiate SMTP, SMS, WhatsApp, webhook, or push implementations.

The registry supports EMAIL, SMS, WHATSAPP, WEBHOOK, and PUSH channels. Providers implement a common `NotificationProvider` contract with `providerName()`, `send()`, and `health()`. Channel-specialised `EmailProvider`, `SmsProvider`, `WhatsAppProvider`, `WebhookProvider`, and `PushProvider` interfaces preserve static channel typing.

## Lifecycle and future provider model

- Providers are registered explicitly at worker bootstrap.
- Duplicate name registration within a channel is rejected.
- Resolution uses an optional requested provider, configured channel default, then configured priority order.
- Tenant-specific selection can be added ahead of default/priority resolution without changing handlers.
- No concrete provider is registered in this story.

## Worker integration

`VerificationRequestedOutboxHandler` now depends on `NotificationProviderRegistry` and `VerificationDeliveryPort`. It loads/decrypts delivery material through the secure delivery port, resolves the provider by message channel, passes the outbox event ID as the provider idempotency key, and destroys the envelope only after `send()` completes.

## Configuration

`ProviderRegistryConfig` carries channel defaults and future priority arrays. It is constructor-injected so the worker bootstrap can source it through the approved configuration boundary; no provider is hard-coded.

## Tests and verification

The code was added after the worker foundation passed type checking. Subsequent worker/full-workspace checks could not execute because pnpm recreated `node_modules` and attempted unavailable registry downloads (DNS `ENOTFOUND`). Docker is also unavailable, so no integration tests could run.

Required pending tests:

- provider resolution/default/unknown/duplicate registration;
- handler registry integration with a fake provider;
- envelope load/destroy ordering;
- PostgreSQL outbox lease/idempotency integration.

## Known risks

- No concrete provider, worker bootstrap, or provider selection configuration loader exists by design.
- Verification delivery remains non-operational until an authorised `VerificationDeliveryPort` and provider adapter are implemented.
- Tests and full build must run in an environment with restored dependencies and disposable PostgreSQL/Redis.

## Recommendation

**CONDITIONAL.** The registry boundary and handler wiring are implemented, but acceptance is not complete until the pending unit/integration tests and build run successfully.
