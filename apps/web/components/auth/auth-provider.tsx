'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
type LoginInput = { identifier: string; password: string; rememberMe: boolean };
type AuthTokens = { accessToken: string; expiresIn: number; sessionId: string };
type Envelope<T> = { success: boolean; data?: T; error?: { message?: string | string[] } };

type AuthContextValue = {
  status: AuthStatus;
  signIn: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const DEVICE_ID_KEY = 'noagent4u_device_id';

function messageFrom(payload: Envelope<unknown>, fallback: string): string {
  const message = payload.error?.message;
  return Array.isArray(message) ? message.join(', ') : message ?? fallback;
}

async function readEnvelope<T>(response: Response): Promise<Envelope<T>> {
  try { return await response.json() as Envelope<T>; } catch { return { success: false, error: { message: 'Unexpected response from the authentication service' } }; }
}

function deviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, value);
  return value;
}

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const tokensRef = useRef<AuthTokens | null>(null);
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  const clearAuthentication = useCallback(() => {
    tokensRef.current = null;
    setTokens(null);
    setStatus('unauthenticated');
  }, []);

  const setAuthentication = useCallback((nextTokens: AuthTokens) => {
    tokensRef.current = nextTokens;
    setTokens(nextTokens);
    setStatus('authenticated');
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    refreshInFlight.current = (async () => {
      const response = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, cache: 'no-store' });
      const payload = await readEnvelope<AuthTokens>(response);
      if (!response.ok || !payload.success || !payload.data) {
        clearAuthentication();
        return false;
      }
      setAuthentication(payload.data);
      return true;
    })().finally(() => { refreshInFlight.current = null; });
    return refreshInFlight.current;
  }, [clearAuthentication, setAuthentication]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!tokens) return;
    const refreshAfterMs = Math.max(30_000, (tokens.expiresIn - 60) * 1000);
    const timer = window.setTimeout(() => void refresh(), refreshAfterMs);
    return () => window.clearTimeout(timer);
  }, [refresh, tokens]);

  const signIn = useCallback(async (input: LoginInput): Promise<void> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-device-id': deviceId() },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    const payload = await readEnvelope<AuthTokens>(response);
    if (!response.ok || !payload.success || !payload.data) throw new Error(messageFrom(payload, 'Unable to sign in. Please try again.'));
    setAuthentication(payload.data);
  }, [setAuthentication]);

  const logout = useCallback(async (): Promise<void> => {
    const accessToken = tokensRef.current?.accessToken;
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {}, cache: 'no-store' });
    } finally {
      clearAuthentication();
    }
  }, [clearAuthentication]);

  const authenticatedFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    let accessToken = tokensRef.current?.accessToken;
    if (!accessToken && !(await refresh())) throw new Error('Your session has expired. Please sign in again.');
    accessToken = tokensRef.current?.accessToken;
    const send = (token: string) => {
      const headers = new Headers(init.headers);
      headers.set('authorization', `Bearer ${token}`);
      return fetch(input, { ...init, headers, credentials: 'same-origin' });
    };
    let response = await send(accessToken!);
    if (response.status !== 401) return response;
    if (!(await refresh())) throw new Error('Your session has expired. Please sign in again.');
    response = await send(tokensRef.current!.accessToken);
    return response;
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({ status, signIn, logout, authenticatedFetch }), [authenticatedFetch, logout, signIn, status]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
