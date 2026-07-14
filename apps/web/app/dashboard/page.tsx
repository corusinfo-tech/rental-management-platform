import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardPage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
      <section className="w-full rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">NoAgent4U</p>
            <h1 className="mt-1 text-3xl font-semibold">Dashboard</h1>
          </div>
          <ThemeToggle />
        </div>
        <p className="mt-8 text-muted-foreground">Your dashboard will be available in a later milestone.</p>
      </section>
    </main>
  );
}
