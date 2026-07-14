/** Provider boundary for a future worker. No Meta, Gupshup, or Twilio implementation is permitted in G2.7. */
export interface WhatsAppProvider {
  send(input: { recipient: string; message: string; correlationId?: string }): Promise<{ providerRequestId: string }>;
  health(): Promise<{ healthy: boolean }>;
}
