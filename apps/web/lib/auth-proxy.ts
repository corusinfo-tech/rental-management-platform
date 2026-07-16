import { NextRequest, NextResponse } from 'next/server';
import { apiInternalUrl, isProductionRuntime } from '@/lib/runtime-config';

type SuccessEnvelope<T> = { success: true; data: T; meta: { correlationId: string; requestId: string } };
type TokenPair = { sessionId: string; accessToken: string; refreshToken: string; expiresIn: number };

const REFRESH_COOKIE = 'noagent4u_refresh';
const REMEMBER_COOKIE = 'noagent4u_remember';
const REMEMBER_ME_SECONDS = 60 * 60 * 24 * 30;
const AUTH_PROXY_PATH = '/auth-api';
const LEGACY_AUTH_PROXY_PATH = '/api/auth';

function backendUrl(path: string): string {
  return `${apiInternalUrl()}/api/v1/auth/${path}`;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

function allowedPath(path: string, method: string): boolean {
  if (method === 'POST') {
    return [
      'login',
      'refresh',
      'logout',
      'logout-all',
      'register',
      'email-verification/request',
      'email-verification/confirm',
      'password-reset/request',
      'password-reset/confirm',
    ].includes(path);
  }
  if (method === 'GET') return path === 'sessions';
  return method === 'DELETE' && /^sessions\/[^/]+$/.test(path);
}

function isSuccessEnvelope(value: unknown): value is SuccessEnvelope<TokenPair> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as { success?: unknown; data?: unknown };
  if (envelope.success !== true || !envelope.data || typeof envelope.data !== 'object') return false;
  const data = envelope.data as Partial<TokenPair>;
  return typeof data.accessToken === 'string' && typeof data.refreshToken === 'string' && typeof data.expiresIn === 'number' && typeof data.sessionId === 'string';
}

function expireCookie(response: NextResponse, name: string, path: string): void {
  response.cookies.set({ name, value: '', httpOnly: true, sameSite: 'strict', secure: isProductionRuntime(), path, maxAge: 0 });
}

function clearRefreshCookies(response: NextResponse): void {
  for (const path of [AUTH_PROXY_PATH, LEGACY_AUTH_PROXY_PATH]) {
    expireCookie(response, REFRESH_COOKIE, path);
    expireCookie(response, REMEMBER_COOKIE, path);
  }
}

function setRefreshCookies(response: NextResponse, refreshToken: string, rememberMe: boolean, cookiePath: string): void {
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: refreshToken,
    httpOnly: true,
    sameSite: 'strict',
    secure: isProductionRuntime(),
    path: cookiePath,
    ...(rememberMe ? { maxAge: REMEMBER_ME_SECONDS } : {}),
  });
  response.cookies.set({
    name: REMEMBER_COOKIE,
    value: rememberMe ? '1' : '0',
    httpOnly: true,
    sameSite: 'strict',
    secure: isProductionRuntime(),
    path: cookiePath,
    ...(rememberMe ? { maxAge: REMEMBER_ME_SECONDS } : {}),
  });
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return { success: false, error: { message: 'Authentication service returned an empty response' } };
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { success: false, error: { message: 'Authentication service returned an invalid response' } };
  }
}

export async function handleAuthProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  cookiePath = AUTH_PROXY_PATH,
): Promise<NextResponse> {
  const { path: parts } = await context.params;
  const path = parts.join('/');
  if (!allowedPath(path, request.method)) return NextResponse.json({ success: false, error: { message: 'Not found' } }, { status: 404 });
  if (!sameOrigin(request)) return NextResponse.json({ success: false, error: { message: 'Cross-site authentication request rejected' } }, { status: 403 });

  let requestBody: string | undefined;
  let rememberMe = false;
  if (path === 'refresh') {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      const response = NextResponse.json({ success: false, error: { message: 'Session expired' } }, { status: 401 });
      clearRefreshCookies(response);
      return response;
    }
    requestBody = JSON.stringify({ refreshToken });
  } else if (path === 'login') {
    const body = await request.json().catch(() => null) as { identifier?: unknown; password?: unknown; rememberMe?: unknown } | null;
    if (!body || typeof body.identifier !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ success: false, error: { message: 'Invalid login request' } }, { status: 400 });
    }
    rememberMe = body.rememberMe === true;
    requestBody = JSON.stringify({ identifier: body.identifier, password: body.password });
  } else if (request.method !== 'GET' && request.method !== 'DELETE') {
    requestBody = await request.text();
  }

  const headers = new Headers({ accept: 'application/json' });
  if (requestBody !== undefined) headers.set('content-type', 'application/json');
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);
  const deviceId = request.headers.get('x-device-id');
  if (deviceId) headers.set('x-device-id', deviceId);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl(path), { method: request.method, headers, body: requestBody, cache: 'no-store' });
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Authentication service is unavailable. Please try again.' } }, { status: 503 });
  }
  const payload = await parseBody(backendResponse);

  if ((path === 'login' || path === 'refresh') && backendResponse.ok && isSuccessEnvelope(payload)) {
    const { refreshToken, ...publicTokens } = payload.data;
    const response = NextResponse.json({ ...payload, data: publicTokens }, { status: backendResponse.status });
    setRefreshCookies(response, refreshToken, path === 'login' ? rememberMe : request.cookies.get(REMEMBER_COOKIE)?.value === '1', cookiePath);
    return response;
  }

  const response = NextResponse.json(payload, { status: backendResponse.status });
  if (path === 'refresh' || path === 'logout' || path === 'logout-all') clearRefreshCookies(response);
  return response;
}
