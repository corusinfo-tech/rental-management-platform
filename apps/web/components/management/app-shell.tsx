'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';

const navigation = [
  ['/dashboard', 'Overview'],
  ['/properties', 'Properties'],
  ['/leases', 'Leases'],
  ['/invoices', 'Invoices'],
  ['/payments', 'Payments'],
  ['/settings', 'Settings'],
] as const;

export function AppShell({ title, description, actions, children }: Readonly<{ title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }>): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  async function signOut(): Promise<void> {
    await logout();
    router.replace('/login');
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link className="font-semibold tracking-tight" href="/dashboard">NoAgent4U</Link>
            <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Primary navigation">
              {navigation.map(([href, label]) => <Link className={`rounded-md px-3 py-2 text-sm ${pathname === href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} href={href} key={href}>{label}</Link>)}
            </nav>
            <div className="flex items-center gap-2"><ThemeToggle /><button className="rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={() => void signOut()} type="button">Sign out</button></div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}</div>{actions}</div>
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}

export function EmptyState({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function ErrorState({ message }: Readonly<{ message: string }>): React.ReactElement {
  return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300" role="alert">{message}</div>;
}
