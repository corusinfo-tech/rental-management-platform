'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AUTH_API_BASE, envelopeMessage, readEnvelope } from '@/lib/auth-client';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
type LoginInput = { identifier: string; password: string; rememberMe: boolean };
type AuthTokens = { accessToken: string; expiresIn: number; sessionId: string };
type SessionSummary = { id: string; membershipId?: string; organizationId?: string };

type AuthContextValue = {
  status: AuthStatus;
  sessionId?: string;
  organizationId?: string;
  signIn: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const DEVICE_ID_KEY = 'noagent4u_device_id';

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
  const [organizationId, setOrganizationId] = useState<string>();
  const tokensRef = useRef<AuthTokens | null>(null);
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  const clearAuthentication = useCallback(() => {
    tokensRef.current = null;
    setTokens(null);
    setOrganizationId(undefined);
    setStatus('unauthenticated');
  }, []);

  const setAuthentication = useCallback(async (nextTokens: AuthTokens) => {
    tokensRef.current = nextTokens;
    setTokens(nextTokens);
    try {
      const response = await fetch(`${AUTH_API_BASE}/sessions`, {
        credentials: 'same-origin',
        headers: { authorization: `Bearer ${nextTokens.accessToken}` },
        cache: 'no-store',
      });
      const payload = await readEnvelope<SessionSummary[]>(response);
      const current = payload.data?.find((session) => session.id === nextTokens.sessionId);
      setOrganizationId(current?.organizationId);
    } catch {
      setOrganizationId(undefined);
    }
    setStatus('authenticated');
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    refreshInFlight.current = (async () => {
      const response = await fetch(`${AUTH_API_BASE}/refresh`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
      });
      const payload = await readEnvelope<AuthTokens>(response);
      if (!response.ok || !payload.success || !payload.data) {
        clearAuthentication();
        return false;
      }
      await setAuthentication(payload.data);
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
    const response = await fetch(`${AUTH_API_BASE}/login`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-device-id': deviceId() },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    const payload = await readEnvelope<AuthTokens>(response);
    if (!response.ok || !payload.success || !payload.data) {
      const fallback = response.status === 429
        ? 'Too many sign-in attempts. Please wait and try again.'
        : 'Unable to sign in. Check your credentials and account status.';
      throw new Error(envelopeMessage(payload, fallback));
    }
    await setAuthentication(payload.data);
  }, [setAuthentication]);

  const logout = useCallback(async (): Promise<void> => {
    const accessToken = tokensRef.current?.accessToken;
    try {
      await fetch(`${AUTH_API_BASE}/logout`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
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

  const value = useMemo<AuthContextValue>(
    () => ({ status, sessionId: tokens?.sessionId, organizationId, signIn, logout, authenticatedFetch }),
    [authenticatedFetch, logout, organizationId, signIn, status, tokens?.sessionId],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
