'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/auth-provider';
import { AppShell, EmptyState, ErrorState } from '@/components/management/app-shell';
import { PLATFORM_API_BASE, requirePlatformData, type Paginated } from '@/lib/platform-client';

type Organization = { id: string; name: string; status: string; organizationType: string; currency?: string; timezone?: string };
type Property = { id: string; code: string; name: string; status: string; propertyType: string; _count?: { buildings: number; images: number; documents: number } };
type DashboardData = { organization: Organization; properties: Paginated<Property>; leaseTotal: number; invoiceTotal: number; paymentTotal: number; unavailable: string[] };

export default function DashboardPage(): React.ReactElement {
  const { organizationId, authenticatedFetch } = useAuth();
  const dashboard = useQuery({
    queryKey: ['dashboard', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<DashboardData> => {
      const org = await requirePlatformData<Organization>(await authenticatedFetch(`${PLATFORM_API_BASE}/organizations/${organizationId}`));
      const properties = await requirePlatformData<Paginated<Property>>(await authenticatedFetch(`${PLATFORM_API_BASE}/organizations/${organizationId}/properties?page=1&limit=5&sortBy=createdAt&sortOrder=desc`));
      const unavailable: string[] = [];
      async function total(path: string, label: string): Promise<number> {
        try {
          return (await requirePlatformData<Paginated<unknown>>(await authenticatedFetch(path))).pagination.total;
        } catch {
          unavailable.push(label);
          return 0;
        }
      }
      const [leaseTotal, invoiceTotal, paymentTotal] = await Promise.all([
        total(`${PLATFORM_API_BASE}/organizations/${organizationId}/leases?page=1&limit=1`, 'leases'),
        total(`${PLATFORM_API_BASE}/organizations/${organizationId}/invoices?page=1&limit=1`, 'invoices'),
        total(`${PLATFORM_API_BASE}/organizations/${organizationId}/payments?page=1&limit=1`, 'payments'),
      ]);
      return { organization: org, properties, leaseTotal, invoiceTotal, paymentTotal, unavailable };
    },
  });

  return (
    <AppShell title="Dashboard" description="Live operational summary for your current organization.">
      {!organizationId && <EmptyState>No active organization membership is attached to this session. Organization management data cannot be loaded.</EmptyState>}
      {dashboard.isLoading && <EmptyState>Loading organization data…</EmptyState>}
      {dashboard.error && <ErrorState message={dashboard.error instanceof Error ? dashboard.error.message : 'Dashboard data could not be loaded.'} />}
      {dashboard.data && <div className="space-y-7">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Current organization</p><h2 className="mt-1 text-xl font-semibold">{dashboard.data.organization.name}</h2><p className="mt-1 text-sm text-muted-foreground">{dashboard.data.organization.organizationType.replaceAll('_', ' ')}</p></div><span className="rounded-full border px-3 py-1 text-xs font-medium">{dashboard.data.organization.status}</span></div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Properties', dashboard.data.properties.pagination.total, '/properties'],
            ['Leases', dashboard.data.leaseTotal, '/leases'],
            ['Invoices', dashboard.data.invoiceTotal, '/invoices'],
            ['Payments', dashboard.data.paymentTotal, '/payments'],
          ].map(([label, value, href]) => <Link className="rounded-xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href={String(href)} key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></Link>)}
        </section>
        {dashboard.data.unavailable.length > 0 && <ErrorState message={`Some summary data is unavailable because access was rejected or the service failed: ${dashboard.data.unavailable.join(', ')}.`} />}
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent properties</h2><Link className="text-sm font-medium text-primary hover:underline" href="/properties">Manage properties</Link></div>{dashboard.data.properties.items.length === 0 ? <EmptyState>No properties have been created yet.</EmptyState> : <div className="overflow-hidden rounded-xl border bg-card"><table className="w-full text-left text-sm"><thead className="bg-muted/60 text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Property</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Buildings</th></tr></thead><tbody>{dashboard.data.properties.items.map((property) => <tr className="border-t" key={property.id}><td className="px-4 py-3"><p className="font-medium">{property.name}</p><p className="text-xs text-muted-foreground">{property.code}</p></td><td className="px-4 py-3">{property.propertyType.replaceAll('_', ' ')}</td><td className="px-4 py-3">{property.status}</td><td className="px-4 py-3 text-right">{property._count?.buildings ?? 0}</td></tr>)}</tbody></table></div>}</section>
      </div>}
    </AppShell>
  );
}
