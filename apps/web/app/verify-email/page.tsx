'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell, FieldError, FormMessage, inputClassName } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { envelopeMessage, postAuth } from '@/lib/auth-client';

const tokenSchema = z.object({ token: z.string().trim().min(20, 'Enter the complete verification token').max(512) });
type TokenValues = z.infer<typeof tokenSchema>;

function VerifyEmailContent(): React.ReactElement {
  const search = useSearchParams();
  const email = search.get('email') ?? '';
  const initialToken = search.get('token') ?? '';
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState<string>();
  const [verified, setVerified] = useState(false);
  const [resendEmail, setResendEmail] = useState(email);
  const form = useForm<TokenValues>({ resolver: zodResolver(tokenSchema), defaultValues: { token: initialToken } });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  async function confirm(values: TokenValues): Promise<void> {
    setMessage(undefined);
    const { response, payload } = await postAuth<{ accepted: true }>('email-verification/confirm', values);
    if (!response.ok || !payload.success) {
      setMessage(envelopeMessage(payload, 'Unable to verify this token. It may be invalid or expired.'));
      return;
    }
    setVerified(true);
  }

  async function resend(): Promise<void> {
    setMessage(undefined);
    const normalized = resendEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setMessage('Enter a valid email address.');
      return;
    }
    const { response, payload } = await postAuth<{ accepted: true }>('email-verification/request', { email: normalized });
    if (!response.ok || !payload.success) {
      setMessage(envelopeMessage(payload, 'Unable to request another verification. Please try again later.'));
      return;
    }
    setCountdown(60);
    setMessage('If the account is eligible, a new verification has been requested.');
  }

  return (
    <AuthShell title="Verify your email" description="Confirm the opaque token delivered for your account." footer={<Link className="font-medium text-primary hover:underline" href="/login">Return to sign in</Link>}>
      {search.get('registered') === '1' && !verified && <div className="mb-4"><FormMessage tone="info">Registration was accepted. Landlord access remains subject to email verification and platform review.</FormMessage></div>}
      {verified ? <FormMessage tone="success">Verification was accepted. You can now return to sign in when your account status permits access.</FormMessage> : (
        <>
          <form className="space-y-4" onSubmit={form.handleSubmit(confirm)} noValidate>
            <div><label className="text-sm font-medium" htmlFor="token">Verification token</label><textarea className="mt-1 min-h-24 w-full rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" id="token" {...form.register('token')} /><FieldError message={form.formState.errors.token?.message} /></div>
            <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Verifying…' : 'Verify email'}</Button>
          </form>
          <div className="my-5 border-t" />
          <div className="space-y-3"><label className="text-sm font-medium" htmlFor="resendEmail">Need another token?</label><input className={inputClassName} id="resendEmail" type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} /><Button className="w-full" disabled={countdown > 0} type="button" variant="outline" onClick={() => void resend()}>{countdown > 0 ? `Try again in ${countdown}s` : 'Request another verification'}</Button></div>
        </>
      )}
      {message && <div className="mt-4"><FormMessage tone={message.startsWith('If ') ? 'info' : 'error'}>{message}</FormMessage></div>}
    </AuthShell>
  );
}

export default function VerifyEmailPage(): React.ReactElement {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center">Loading verification…</main>}><VerifyEmailContent /></Suspense>;
}
