export type OutboxRecord = { id: string; eventType: string; aggregateType: string; aggregateId: string; organizationId: string | null; payload: unknown; attempts: number; createdAt: Date };
export interface OutboxEventHandler { readonly eventType: string; handle(event: OutboxRecord): Promise<void>; }
export interface TerminalOutboxHandler extends OutboxEventHandler { readonly policy: 'TERMINAL_NOOP'; }
export interface VerificationRequestedHandler extends OutboxEventHandler { readonly eventType: 'VerificationCreated' | 'VerificationResent'; }
export interface PasswordResetHandler extends OutboxEventHandler {}
export interface SmsVerificationHandler extends OutboxEventHandler {}
export interface WhatsAppVerificationHandler extends OutboxEventHandler {}
export interface FutureInvoiceHandler extends OutboxEventHandler {}
export interface FutureWebhookHandler extends OutboxEventHandler {}
export type WorkerMetrics = { processed: number; failed: number; retries: number; deadLetters: number; totalLatencyMs: number; totalProcessingMs: number };
