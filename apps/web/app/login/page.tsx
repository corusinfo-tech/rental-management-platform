'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email address or mobile number'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  rememberMe: z.boolean()
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage(): React.ReactElement {
  const { signIn, status } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', rememberMe: false }
  });

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
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-sm rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">NoAgent4U</p>
            <h1 className="mt-1 text-2xl font-semibold">Sign in</h1>
          </div>
          <ThemeToggle />
        </div>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium" htmlFor="identifier">
            Email or mobile number
          </label>
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            autoComplete="username"
            id="identifier"
            inputMode="email"
            placeholder="you@example.com or +14155550100"
            {...form.register('identifier')}
          />
          {form.formState.errors.identifier && <p className="text-sm text-red-600">{form.formState.errors.identifier.message}</p>}
          <div className="flex items-center justify-between gap-3"><label className="block text-sm font-medium" htmlFor="password">Password</label><Link className="text-sm text-primary underline-offset-4 hover:underline" href="/password-reset">Forgot password?</Link></div>
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            autoComplete="current-password"
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...form.register('password')}
          />
          {form.formState.errors.password && <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>}
          <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" {...form.register('rememberMe')} />Remember me</label><button className="text-sm text-primary underline-offset-4 hover:underline" type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide password' : 'Show password'}</button></div>
          <Button className="w-full" disabled={form.formState.isSubmitting || status === 'loading'} type="submit">
            {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        {message && <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">{message}</p>}
      </section>
    </main>
  );
}
