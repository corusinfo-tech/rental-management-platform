/** Provider boundary for a future worker. No provider implementation is permitted in G2.6. */
export interface SmsProvider {
  send(input: { recipient: string; message: string; correlationId?: string }): Promise<{ providerRequestId: string }>;
  health(): Promise<{ healthy: boolean }>;
}
