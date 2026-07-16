'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './auth-provider';

export function RequireAuth({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement | null {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [router, status]);

  if (status === 'loading') return <main className="grid min-h-screen place-items-center p-6" aria-live="polite"><p className="text-sm text-muted-foreground">Restoring your session…</p></main>;
  if (status !== 'authenticated') return null;
  return <>{children}</>;
}
