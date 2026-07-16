import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export function AuthShell({
  title,
  description,
  children,
  footer,
}: Readonly<{
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}>): React.ReactElement {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4 sm:p-6">
      <section className="mx-auto w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-lg sm:p-8 lg:max-w-lg">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold tracking-wide text-primary" href="/login">
              NoAgent4U
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
          </div>
          <ThemeToggle />
        </div>
        {children}
        {footer && (
          <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </section>
    </main>
  );
}

export function FieldError({ message }: Readonly<{ message?: string }>): React.ReactElement | null {
  return message ? (
    <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
      {message}
    </p>
  ) : null;
}

export function FormMessage({
  tone,
  children,
}: Readonly<{
  tone: 'error' | 'success' | 'info';
  children: React.ReactNode;
}>): React.ReactElement {
  const styles =
    tone === 'error'
      ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
      : tone === 'success'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        : 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300';
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${styles}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

export const inputClassName =
  'h-11 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60';
