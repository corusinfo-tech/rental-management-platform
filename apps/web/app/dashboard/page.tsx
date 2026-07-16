'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';

export default function DashboardPage(): React.ReactElement {
  const { logout } = useAuth();
  const router = useRouter();

  async function signOut(): Promise<void> {
    await logout();
    router.replace('/login');
  }

  return (
    <RequireAuth><main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
      <section className="w-full rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">NoAgent4U</p>
            <h1 className="mt-1 text-3xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3"><ThemeToggle /><button className="rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={() => void signOut()} type="button">Sign out</button></div>
        </div>
        <p className="mt-8 text-muted-foreground">Your dashboard will be available in a later milestone.</p>
      </section>
    </main></RequireAuth>
  );
}
