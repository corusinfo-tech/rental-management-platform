import type { Envelope } from './auth-client';

export const PLATFORM_API_BASE = '/platform-api/v1';

export async function readPlatformEnvelope<T>(response: Response): Promise<Envelope<T>> {
  try {
    return await response.json() as Envelope<T>;
  } catch {
    throw new Error('The platform API returned an unexpected response.');
  }
}

export async function requirePlatformData<T>(response: Response): Promise<T> {
  const payload = await readPlatformEnvelope<T>(response);
  if (!response.ok || !payload.success || payload.data === undefined) {
    const message = payload.error?.message;
    throw new Error(Array.isArray(message) ? message.join(', ') : message ?? 'The requested data could not be loaded.');
  }
  return payload.data;
}

export type Paginated<T> = { items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
