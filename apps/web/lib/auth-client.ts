export const AUTH_API_BASE = '/auth-api';

export type Envelope<T> = { success: boolean; data?: T; error?: { statusCode?: number; message?: string | string[] } };

export async function readEnvelope<T>(response: Response): Promise<Envelope<T>> {
  try {
    return await response.json() as Envelope<T>;
  } catch {
    return { success: false, error: { message: 'The server returned an unexpected response.' } };
  }
}

export function envelopeMessage(payload: Envelope<unknown>, fallback: string): string {
  const message = payload.error?.message;
  return Array.isArray(message) ? message.join(', ') : message ?? fallback;
}

export async function postAuth<T>(path: string, body: unknown): Promise<{ response: Response; payload: Envelope<T> }> {
  const response = await fetch(`${AUTH_API_BASE}/${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return { response, payload: await readEnvelope<T>(response) };
}
