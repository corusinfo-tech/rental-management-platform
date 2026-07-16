'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/components/auth/auth-provider';
import { FieldError, FormMessage, inputClassName } from '@/components/auth/auth-shell';
import { AppShell, EmptyState, ErrorState } from '@/components/management/app-shell';
import { Button } from '@/components/ui/button';
import { PLATFORM_API_BASE, requirePlatformData, type Paginated } from '@/lib/platform-client';

type Property = { id: string; code: string; name: string; propertyType: string; status: string; address?: { city?: string; state?: string; country?: string }; _count?: { buildings: number; images: number; documents: number } };
const schema = z.object({ code: z.string().trim().min(1).max(50), name: z.string().trim().min(1).max(200), propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'LAND']), description: z.string().max(5000).optional() });
type Values = z.infer<typeof schema>;

export default function PropertiesPage(): React.ReactElement {
  const { organizationId, authenticatedFetch } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState<string>();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { code: '', name: '', propertyType: 'RESIDENTIAL', description: '' } });
  const properties = useQuery({
    queryKey: ['properties', organizationId, search],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const query = new URLSearchParams({ page: '1', limit: '50', sortBy: 'createdAt', sortOrder: 'desc' });
      if (search.trim()) query.set('search', search.trim());
      return requirePlatformData<Paginated<Property>>(await authenticatedFetch(`${PLATFORM_API_BASE}/organizations/${organizationId}/properties?${query}`));
    },
  });

  async function create(values: Values): Promise<void> {
    setMessage(undefined);
    try {
      await requirePlatformData<Property>(await authenticatedFetch(`${PLATFORM_API_BASE}/organizations/${organizationId}/properties`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) }));
      form.reset();
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ['properties', organizationId] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Property could not be created.');
    }
  }

  return (
    <AppShell title="Properties" description="Search existing properties or create a new property foundation record." actions={<Button onClick={() => setShowCreate((value) => !value)} type="button">{showCreate ? 'Cancel' : 'Add property'}</Button>}>
      {showCreate && <section className="mb-7 rounded-xl border bg-card p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold">New property</h2><form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(create)} noValidate><div><label className="text-sm font-medium" htmlFor="code">Code</label><input className={`${inputClassName} mt-1`} id="code" {...form.register('code')} /><FieldError message={form.formState.errors.code?.message} /></div><div><label className="text-sm font-medium" htmlFor="name">Name</label><input className={`${inputClassName} mt-1`} id="name" {...form.register('name')} /><FieldError message={form.formState.errors.name?.message} /></div><div><label className="text-sm font-medium" htmlFor="propertyType">Property type</label><select className={`${inputClassName} mt-1`} id="propertyType" {...form.register('propertyType')}><option value="RESIDENTIAL">Residential</option><option value="COMMERCIAL">Commercial</option><option value="MIXED_USE">Mixed use</option><option value="LAND">Land</option></select></div><div><label className="text-sm font-medium" htmlFor="description">Description</label><input className={`${inputClassName} mt-1`} id="description" {...form.register('description')} /></div><div className="md:col-span-2"><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Creating…' : 'Create property'}</Button></div></form>{message && <div className="mt-4"><FormMessage tone="error">{message}</FormMessage></div>}</section>}
      <div className="mb-5 max-w-md"><label className="sr-only" htmlFor="property-search">Search properties</label><input className={inputClassName} id="property-search" placeholder="Search by name or code…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {!organizationId && <EmptyState>No active organization is available for this session.</EmptyState>}
      {properties.isLoading && <EmptyState>Loading properties…</EmptyState>}
      {properties.error && <ErrorState message={properties.error instanceof Error ? properties.error.message : 'Properties could not be loaded.'} />}
      {properties.data && (properties.data.items.length === 0 ? <EmptyState>No matching properties were found.</EmptyState> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{properties.data.items.map((property) => <article className="rounded-xl border bg-card p-5 shadow-sm" key={property.id}><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{property.name}</h2><p className="mt-1 text-xs text-muted-foreground">{property.code}</p></div><span className="rounded-full border px-2 py-1 text-xs">{property.status}</span></div><p className="mt-4 text-sm text-muted-foreground">{property.propertyType.replaceAll('_', ' ')}</p><p className="mt-1 text-sm">{[property.address?.city, property.address?.state, property.address?.country].filter(Boolean).join(', ') || 'Address not added'}</p><div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-center text-xs text-muted-foreground"><span><strong className="block text-base text-foreground">{property._count?.buildings ?? 0}</strong>Buildings</span><span><strong className="block text-base text-foreground">{property._count?.images ?? 0}</strong>Images</span><span><strong className="block text-base text-foreground">{property._count?.documents ?? 0}</strong>Documents</span></div></article>)}</div>)}
    </AppShell>
  );
}
