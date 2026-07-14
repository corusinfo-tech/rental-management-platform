import type { SmtpConfig } from '../config/smtp-config';
import type { EmailProvider, ProviderSendInput, ProviderSendResult } from './provider-registry';

export interface SmtpTransport { send(config: SmtpConfig, message: { from: string; to: string; replyTo?: string; subject: string; text: string; messageId: string }): Promise<void>; health(config: SmtpConfig): Promise<boolean>; }
/** Concrete registry provider; transport is injected so provider wiring never leaks credentials or message bodies. */
export class SmtpEmailProvider implements EmailProvider {
  readonly channel = 'EMAIL' as const; private readonly delivered = new Set<string>();
  constructor(private readonly config: SmtpConfig, private readonly transport: SmtpTransport) {}
  providerName(): string { return 'smtp'; }
  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    if (this.delivered.has(input.idempotencyKey)) return { providerRequestId: input.idempotencyKey };
    await this.transport.send(this.config, { from: this.config.from, to: input.recipient, replyTo: this.config.replyTo, subject: 'NoAgent4U verification', text: input.content, messageId: input.idempotencyKey });
    this.delivered.add(input.idempotencyKey); return { providerRequestId: input.idempotencyKey };
  }
  async health(): Promise<{ healthy: boolean; provider: string }> { return { healthy: await this.transport.health(this.config), provider: this.providerName() }; }
}
