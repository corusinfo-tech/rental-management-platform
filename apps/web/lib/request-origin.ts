import type { NextRequest } from 'next/server';
import { configuredWebOrigins } from '@/lib/runtime-config';

function firstHeaderValue(value: string | null): string | undefined {
  return value?.split(',')[0]?.trim() || undefined;
}

function normalizeOrigin(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash)
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function externalRequestOrigin(request: NextRequest): string | undefined {
  const host =
    firstHeaderValue(request.headers.get('x-forwarded-host')) ??
    firstHeaderValue(request.headers.get('host'));
  const protocol =
    firstHeaderValue(request.headers.get('x-forwarded-proto')) ??
    request.nextUrl.protocol.replace(/:$/, '');
  if (!host || (protocol !== 'http' && protocol !== 'https')) return undefined;
  return normalizeOrigin(`${protocol}://${host}`);
}

/**
 * Browser mutations must originate from the configured public web origin and
 * must have reached Next.js through proxy headers describing that same origin.
 * Requests without Origin retain support for non-browser/server clients.
 */
export function hasAllowedBrowserOrigin(request: NextRequest): boolean {
  const originHeader = request.headers.get('origin');
  if (!originHeader) return true;

  const browserOrigin = normalizeOrigin(originHeader);
  const requestOrigin = externalRequestOrigin(request);
  if (!browserOrigin || !requestOrigin || browserOrigin !== requestOrigin) return false;

  const allowedOrigins = configuredWebOrigins();
  return allowedOrigins.has(browserOrigin) && allowedOrigins.has(requestOrigin);
}
