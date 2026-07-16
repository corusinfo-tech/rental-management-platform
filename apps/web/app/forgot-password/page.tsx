'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell, FieldError, FormMessage, inputClassName } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { envelopeMessage, postAuth } from '@/lib/auth-client';

const schema = z.object({ identifier: z.string().trim().min(3, 'Enter your email address or mobile number').max(320) });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage(): React.ReactElement {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string>();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { identifier: '' } });

  async function submit(values: Values): Promise<void> {
    setMessage(undefined);
    const { response, payload } = await postAuth<{ accepted: true }>('password-reset/request', values);
    if (!response.ok || !payload.success) {
      setMessage(envelopeMessage(payload, 'Unable to request a password reset. Please try again later.'));
      return;
    }
    setSubmitted(true);
  }

  return (
    <AuthShell title="Forgot password" description="Enter your account email or mobile number." footer={<Link className="font-medium text-primary hover:underline" href="/login">Return to sign in</Link>}>
      {submitted ? <FormMessage tone="success">If an account matches those details, reset instructions have been requested.</FormMessage> : (
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <div><label className="text-sm font-medium" htmlFor="identifier">Email or mobile number</label><input className={`${inputClassName} mt-1`} id="identifier" autoComplete="username" {...form.register('identifier')} /><FieldError message={form.formState.errors.identifier?.message} /></div>
          <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Requesting…' : 'Request reset'}</Button>
        </form>
      )}
      {message && <div className="mt-4"><FormMessage tone="error">{message}</FormMessage></div>}
    </AuthShell>
  );
}
