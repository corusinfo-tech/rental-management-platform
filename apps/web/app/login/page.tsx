'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/components/auth/auth-provider';
import { AuthShell, FieldError, FormMessage, inputClassName } from '@/components/auth/auth-shell';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email address or mobile number'),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
  rememberMe: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage(): React.ReactElement {
  const { signIn, status } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '', rememberMe: false } });

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [router, status]);

  async function onSubmit(values: LoginValues): Promise<void> {
    setMessage(undefined);
    try {
      await signIn(values);
      router.replace('/dashboard');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your organizations and rental operations."
      footer={<>New to NoAgent4U? <Link className="font-medium text-primary hover:underline" href="/register">Create an account</Link></>}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div>
          <label className="block text-sm font-medium" htmlFor="identifier">Email or mobile number</label>
          <input className={`${inputClassName} mt-1`} autoComplete="username" id="identifier" inputMode="email" placeholder="you@example.com or +14155550100" {...form.register('identifier')} />
          <FieldError message={form.formState.errors.identifier?.message} />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium" htmlFor="password">Password</label>
            <Link className="text-sm text-primary hover:underline" href="/forgot-password">Forgot password?</Link>
          </div>
          <div className="mt-1"><PasswordInput id="password" registration={form.register('password')} /></div>
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground"><input className="h-4 w-4 rounded border" type="checkbox" {...form.register('rememberMe')} />Remember me for 30 days</label>
        <Button className="w-full" disabled={form.formState.isSubmitting || status === 'loading'} type="submit">
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      {message && <div className="mt-4"><FormMessage tone="error">{message}</FormMessage></div>}
    </AuthShell>
  );
}
