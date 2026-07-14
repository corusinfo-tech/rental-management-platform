'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password')
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage(): React.ReactElement {
  const [message, setMessage] = useState<string>();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  function onSubmit(): void {
    setMessage('Authentication will be enabled in a later milestone.');
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
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            id="email"
            type="email"
            {...form.register('email')}
          />
          {form.formState.errors.email && <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>}
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            id="password"
            type="password"
            {...form.register('password')}
          />
          {form.formState.errors.password && <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>}
          <Button className="w-full" type="submit">
            Continue
          </Button>
        </form>
        {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
      </section>
    </main>
  );
}
