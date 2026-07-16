'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const schema = z.object({ identifier: z.string().trim().min(3, 'Enter your email address or mobile number') });
type Values = z.infer<typeof schema>;

export default function PasswordResetPage(): React.ReactElement {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { identifier: '' } });

  async function submit(values: Values): Promise<void> {
    setError(undefined);
    const response = await fetch('/api/auth/password-reset/request', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values), cache: 'no-store' });
    if (!response.ok) {
      setError('Unable to request a password reset. Please try again later.');
      return;
    }
    setSubmitted(true);
  }

  return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-sm rounded-xl border bg-card p-6 text-card-foreground shadow-sm"><div className="mb-8 flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">NoAgent4U</p><h1 className="mt-1 text-2xl font-semibold">Reset password</h1></div><ThemeToggle /></div>{submitted ? <div className="space-y-4"><p className="text-sm text-muted-foreground">If an account matches those details, password-reset instructions have been sent.</p><Link className="text-sm text-primary underline-offset-4 hover:underline" href="/login">Return to sign in</Link></div> : <form className="space-y-4" onSubmit={form.handleSubmit(submit)}><label className="block text-sm font-medium" htmlFor="identifier">Email or mobile number</label><input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" id="identifier" {...form.register('identifier')} />{form.formState.errors.identifier && <p className="text-sm text-red-600">{form.formState.errors.identifier.message}</p>}<Button className="w-full" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Sending…' : 'Send reset instructions'}</Button>{error && <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}<Link className="block text-center text-sm text-primary underline-offset-4 hover:underline" href="/login">Back to sign in</Link></form>}</section></main>;
}
