export function apiInternalUrl(): string {
  const configured = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';
  return configured.replace(/\/$/, '');
}

export function configuredWebOrigins(): ReadonlySet<string> {
  const configured =
    process.env.WEB_ORIGIN?.trim() ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

  return new Set(
    configured
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const url = new URL(value);
        if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
          throw new Error('WEB_ORIGIN must contain origins only');
        }
        return url.origin;
      }),
  );
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}
