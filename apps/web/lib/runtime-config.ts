export function apiInternalUrl(): string {
  const configured = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';
  return configured.replace(/\/$/, '');
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}
