'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/auth-provider';
import { AppShell, EmptyState, ErrorState } from './app-shell';
import { inputClassName } from '@/components/auth/auth-shell';
import { PLATFORM_API_BASE, requirePlatformData, type Paginated } from '@/lib/platform-client';

type Row = Record<string, unknown> & { id: string };
type Column = { label: string; value: (row: Row) => React.ReactNode };

export function EntityList({ entity, title, description, path, columns }: Readonly<{ entity: string; title: string; description: string; path: string; columns: Column[] }>): React.ReactElement {
  const { organizationId, authenticatedFetch } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [entity, organizationId, search, page],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const parameters = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) parameters.set('search', search.trim());
      return requirePlatformData<Paginated<Row>>(await authenticatedFetch(`${PLATFORM_API_BASE}/organizations/${organizationId}/${path}?${parameters}`));
    },
  });

  return (
    <AppShell title={title} description={description}>
      <div className="mb-5 max-w-md"><label className="sr-only" htmlFor={`${entity}-search`}>Search {title.toLowerCase()}</label><input className={inputClassName} id={`${entity}-search`} placeholder={`Search ${title.toLowerCase()}…`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
      {!organizationId && <EmptyState>No active organization is available for this session.</EmptyState>}
      {query.isLoading && <EmptyState>Loading {title.toLowerCase()}…</EmptyState>}
      {query.error && <ErrorState message={query.error instanceof Error ? query.error.message : `${title} could not be loaded.`} />}
      {query.data && (query.data.items.length === 0 ? <EmptyState>No matching {title.toLowerCase()} were found.</EmptyState> : <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-muted/60 text-muted-foreground"><tr>{columns.map((column) => <th className="px-4 py-3 font-medium" key={column.label}>{column.label}</th>)}</tr></thead><tbody>{query.data.items.map((row) => <tr className="border-t" key={row.id}>{columns.map((column) => <td className="px-4 py-3" key={column.label}>{column.value(row)}</td>)}</tr>)}</tbody></table></div>)}
      {query.data && query.data.pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between text-sm"><button className="rounded-md border px-3 py-2 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button">Previous</button><span className="text-muted-foreground">Page {page} of {query.data.pagination.totalPages}</span><button className="rounded-md border px-3 py-2 disabled:opacity-50" disabled={page >= query.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} type="button">Next</button></div>}
    </AppShell>
  );
}

export function text(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).replaceAll('_', ' ');
  return fallback;
}

export function date(value: unknown): string {
  return typeof value === 'string' ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

export function money(value: unknown, currency = 'INR'): string {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(amount) ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount) : '—';
}
