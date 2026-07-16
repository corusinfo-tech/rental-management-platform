'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/auth-provider';
import { FormMessage, inputClassName } from '@/components/auth/auth-shell';
import { AppShell, EmptyState, ErrorState } from '@/components/management/app-shell';
import { Button } from '@/components/ui/button';
import { PLATFORM_API_BASE, requirePlatformData } from '@/lib/platform-client';

type Settings = { id: string; organizationId: string; timezone: string; currency: string; dateFormat: string; timeFormat: string; language: string; country: string; invoicePrefix: string; brandName?: string | null; notificationEmail?: string | null; supportEmail?: string | null; version: number };
type FormState = Pick<Settings, 'timezone' | 'currency' | 'dateFormat' | 'timeFormat' | 'language' | 'country' | 'invoicePrefix'> & { brandName: string; notificationEmail: string; supportEmail: string };

const empty: FormState = { timezone: 'UTC', currency: 'INR', dateFormat: 'YYYY-MM-DD', timeFormat: '24h', language: 'en', country: 'IN', invoicePrefix: 'INV', brandName: '', notificationEmail: '', supportEmail: '' };

export default function SettingsPage(): React.ReactElement {
  const { organizationId, authenticatedFetch } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string }>();
  const settings = useQuery({
    queryKey: ['settings', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => requirePlatformData<Settings>(await authenticatedFetch(`${PLATFORM_API_BASE}/organizations/${organizationId}/settings`)),
  });

  useEffect(() => {
    if (!settings.data) return;
    setForm({ timezone: settings.data.timezone, currency: settings.data.currency, dateFormat: settings.data.dateFormat, timeFormat: settings.data.timeFormat, language: settings.data.language, country: settings.data.country, invoicePrefix: settings.data.invoicePrefix, brandName: settings.data.brandName ?? '', notificationEmail: settings.data.notificationEmail ?? '', supportEmail: settings.data.supportEmail ?? '' });
  }, [settings.data]);

  function change(field: keyof FormState, value: string): void { setForm((current) => ({ ...current, [field]: value })); }

  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!settings.data) return;
    setMessage(undefined);
    try {
      await requirePlatformData<Settings>(await authenticatedFetch(`${PLATFORM_API_BASE}/organizations/${organizationId}/settings`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, currency: form.currency.toUpperCase(), country: form.country.toUpperCase(), expectedVersion: settings.data.version }) }));
      await queryClient.invalidateQueries({ queryKey: ['settings', organizationId] });
      setMessage({ tone: 'success', text: 'Organization settings were updated.' });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Settings could not be updated.' });
    }
  }

  const fields: Array<[keyof FormState, string]> = [['brandName', 'Brand name'], ['timezone', 'Timezone'], ['currency', 'Currency'], ['country', 'Country'], ['language', 'Language'], ['dateFormat', 'Date format'], ['timeFormat', 'Time format'], ['invoicePrefix', 'Invoice prefix'], ['notificationEmail', 'Notification email'], ['supportEmail', 'Support email']];
  return (
    <AppShell title="Organization settings" description="Branding, locale, invoice, and support defaults.">
      {!organizationId && <EmptyState>No active organization is available for this session.</EmptyState>}
      {settings.isLoading && <EmptyState>Loading settings…</EmptyState>}
      {settings.error && <ErrorState message={settings.error instanceof Error ? settings.error.message : 'Settings could not be loaded.'} />}
      {settings.data && <form className="rounded-xl border bg-card p-5 shadow-sm" onSubmit={(event) => void save(event)}><div className="grid gap-4 md:grid-cols-2">{fields.map(([field, label]) => <div key={field}><label className="text-sm font-medium" htmlFor={field}>{label}</label><input className={`${inputClassName} mt-1`} id={field} value={form[field]} onChange={(event) => change(field, event.target.value)} /></div>)}</div><div className="mt-5 flex items-center gap-4"><Button type="submit">Save settings</Button><span className="text-xs text-muted-foreground">Version {settings.data.version}</span></div>{message && <div className="mt-4"><FormMessage tone={message.tone}>{message.text}</FormMessage></div>}</form>}
    </AppShell>
  );
}
