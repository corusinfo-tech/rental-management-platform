import type { OutboxEventHandler, OutboxRecord } from './types';
import { NotificationProviderRegistry, type NotificationChannel } from '../notifications/provider-registry';

/** The delivery boundary must atomically use event.id as its provider idempotency key, decrypt the envelope, deliver, and destroy it after success. */
export interface VerificationDeliveryPort { loadAndDecrypt(event: OutboxRecord): Promise<{ channel: NotificationChannel; recipient: string; content: string }>; destroyEnvelope(event: OutboxRecord): Promise<void>; }
export class VerificationRequestedOutboxHandler implements OutboxEventHandler {
  readonly eventType = 'VerificationCreated';
  constructor(private readonly delivery: VerificationDeliveryPort, private readonly providers: NotificationProviderRegistry) {}
  async handle(event: OutboxRecord) {
    const message = await this.delivery.loadAndDecrypt(event);
    const provider = this.providers.resolve(message.channel);
    await provider.send({ idempotencyKey: event.id, recipient: message.recipient, content: message.content, correlationId: this.correlationId(event) });
    await this.delivery.destroyEnvelope(event);
  }
  private correlationId(event: OutboxRecord): string | undefined { const payload = event.payload; return typeof payload === 'object' && payload !== null && 'correlationId' in payload && typeof payload.correlationId === 'string' ? payload.correlationId : undefined; }
}
/**
 * Explicit policy for local-only domain events. This is terminal by design: it
 * acknowledges a durable event without attempting external delivery.
 */
export class TerminalNoopOutboxHandler implements OutboxEventHandler {
  readonly policy = 'TERMINAL_NOOP' as const;
  constructor(readonly eventType: string) {}
  async handle(): Promise<void> { /* intentionally terminal */ }
}
