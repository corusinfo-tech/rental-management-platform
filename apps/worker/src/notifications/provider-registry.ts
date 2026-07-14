export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'WEBHOOK' | 'PUSH';
export type ProviderSendInput = { idempotencyKey: string; recipient: string; content: string; correlationId?: string };
export type ProviderSendResult = { providerRequestId: string };

export interface NotificationProvider { readonly channel: NotificationChannel; providerName(): string; send(input: ProviderSendInput): Promise<ProviderSendResult>; health(): Promise<{ healthy: boolean }>; }
export interface EmailProvider extends NotificationProvider { readonly channel: 'EMAIL'; }
export interface SmsProvider extends NotificationProvider { readonly channel: 'SMS'; }
export interface WhatsAppProvider extends NotificationProvider { readonly channel: 'WHATSAPP'; }
export interface WebhookProvider extends NotificationProvider { readonly channel: 'WEBHOOK'; }
export interface PushProvider extends NotificationProvider { readonly channel: 'PUSH'; }

export type ProviderRegistryConfig = { defaults: Partial<Record<NotificationChannel, string>>; priorities?: Partial<Record<NotificationChannel, string[]>> };

/** Registry owns provider selection; workers receive only this abstraction and never instantiate providers. */
export class NotificationProviderRegistry {
  private readonly providers = new Map<NotificationChannel, Map<string, NotificationProvider>>();
  constructor(private readonly config: ProviderRegistryConfig, providers: NotificationProvider[] = []) { providers.forEach((provider) => this.register(provider)); }
  register(provider: NotificationProvider): void {
    const byName = this.providers.get(provider.channel) ?? new Map<string, NotificationProvider>();
    if (byName.has(provider.providerName())) throw new Error(`Duplicate ${provider.channel} provider: ${provider.providerName()}`);
    byName.set(provider.providerName(), provider); this.providers.set(provider.channel, byName);
  }
  resolve(channel: NotificationChannel, requestedProvider?: string): NotificationProvider {
    const byName = this.providers.get(channel); const preferred = requestedProvider ?? this.config.defaults[channel] ?? this.config.priorities?.[channel]?.[0];
    if (!byName || !preferred || !byName.has(preferred)) throw new Error(`No configured ${channel} notification provider`);
    return byName.get(preferred)!;
  }
}
