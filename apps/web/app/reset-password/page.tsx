'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell, FieldError, FormMessage, inputClassName } from '@/components/auth/auth-shell';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { envelopeMessage, postAuth } from '@/lib/auth-client';

const schema = z.object({
  token: z.string().trim().min(20, 'Enter the complete reset token').max(512),
  newPassword: z.string().min(12, 'Use at least 12 characters').max(128),
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type Values = z.infer<typeof schema>;

function ResetPasswordContent(): React.ReactElement {
  const search = useSearchParams();
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState<string>();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { token: search.get('token') ?? '', newPassword: '', confirmPassword: '' } });
  const password = form.watch('newPassword');
  const strength = [password.length >= 12, /[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;

  async function submit(values: Values): Promise<void> {
    setMessage(undefined);
    const { response, payload } = await postAuth<{ accepted: true }>('password-reset/confirm', { token: values.token, newPassword: values.newPassword });
    if (!response.ok || !payload.success) {
      setMessage(envelopeMessage(payload, 'Unable to reset the password. The token may be invalid or expired.'));
      return;
    }
    setComplete(true);
  }

  return (
    <AuthShell title="Choose a new password" description="A successful reset revokes all existing sessions." footer={<Link className="font-medium text-primary hover:underline" href="/login">Return to sign in</Link>}>
      {complete ? <FormMessage tone="success">Password reset accepted. Sign in again on all devices using your new password.</FormMessage> : (
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <div><label className="text-sm font-medium" htmlFor="token">Reset token</label><textarea className={`${inputClassName} mt-1 h-24 py-3`} id="token" {...form.register('token')} /><FieldError message={form.formState.errors.token?.message} /></div>
          <div><label className="text-sm font-medium" htmlFor="newPassword">New password</label><div className="mt-1"><PasswordInput id="newPassword" autoComplete="new-password" registration={form.register('newPassword')} /></div><div className="mt-2 flex gap-1" aria-label={`Password strength ${strength} of 5`}>{[1, 2, 3, 4, 5].map((level) => <span className={`h-1 flex-1 rounded ${level <= strength ? 'bg-primary' : 'bg-muted'}`} key={level} />)}</div><FieldError message={form.formState.errors.newPassword?.message} /></div>
          <div><label className="text-sm font-medium" htmlFor="confirmPassword">Confirm password</label><div className="mt-1"><PasswordInput id="confirmPassword" autoComplete="new-password" registration={form.register('confirmPassword')} /></div><FieldError message={form.formState.errors.confirmPassword?.message} /></div>
          <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Resetting…' : 'Reset password'}</Button>
        </form>
      )}
      {message && <div className="mt-4"><FormMessage tone="error">{message}</FormMessage></div>}
    </AuthShell>
  );
}

export default function ResetPasswordPage(): React.ReactElement {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center">Loading reset form…</main>}><ResetPasswordContent /></Suspense>;
}
