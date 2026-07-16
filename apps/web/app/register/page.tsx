'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell, FieldError, FormMessage, inputClassName } from '@/components/auth/auth-shell';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { envelopeMessage, postAuth } from '@/lib/auth-client';

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().email('Enter a valid email address').max(320),
  countryCode: z.string().regex(/^\+[1-9]\d{0,2}$/, 'Use a valid country code'),
  mobile: z.string().regex(/^\d{4,14}$/, 'Enter a valid mobile number'),
  password: z.string().min(12, 'Use at least 12 characters').max(128),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

type Values = z.infer<typeof schema>;

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', countryCode: '+91', mobile: '', password: '', confirmPassword: '' },
  });
  const password = form.watch('password');
  const strength = [password.length >= 12, /[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;

  async function submit(values: Values): Promise<void> {
    setMessage(undefined);
    const request = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      countryCode: values.countryCode,
      mobile: values.mobile,
      password: values.password,
    };
    const { response, payload } = await postAuth<{ accepted: true }>('register', { ...request, registrationType: 'LANDLORD' });
    if (!response.ok || !payload.success) {
      setMessage(envelopeMessage(payload, 'Unable to submit registration. Please try again.'));
      return;
    }
    router.push(`/verify-email?email=${encodeURIComponent(values.email.trim().toLowerCase())}&registered=1`);
  }

  return (
    <AuthShell title="Create landlord account" description="Set up your identity. Your organization will remain pending until the required verification and review are complete." footer={<>Already registered? <Link className="font-medium text-primary hover:underline" href="/login">Sign in</Link></>}>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="text-sm font-medium" htmlFor="firstName">First name</label><input className={`${inputClassName} mt-1`} id="firstName" autoComplete="given-name" {...form.register('firstName')} /><FieldError message={form.formState.errors.firstName?.message} /></div>
          <div><label className="text-sm font-medium" htmlFor="lastName">Last name</label><input className={`${inputClassName} mt-1`} id="lastName" autoComplete="family-name" {...form.register('lastName')} /><FieldError message={form.formState.errors.lastName?.message} /></div>
        </div>
        <div><label className="text-sm font-medium" htmlFor="email">Email</label><input className={`${inputClassName} mt-1`} id="email" type="email" autoComplete="email" {...form.register('email')} /><FieldError message={form.formState.errors.email?.message} /></div>
        <div><label className="text-sm font-medium" htmlFor="mobile">Mobile number</label><div className="mt-1 grid grid-cols-[6rem_1fr] gap-2"><input aria-label="Country code" className={inputClassName} {...form.register('countryCode')} /><input className={inputClassName} id="mobile" inputMode="numeric" autoComplete="tel-national" {...form.register('mobile')} /></div><FieldError message={form.formState.errors.countryCode?.message ?? form.formState.errors.mobile?.message} /></div>
        <div><label className="text-sm font-medium" htmlFor="password">Password</label><div className="mt-1"><PasswordInput id="password" autoComplete="new-password" registration={form.register('password')} /></div><div className="mt-2 flex gap-1" aria-label={`Password strength ${strength} of 5`}>{[1, 2, 3, 4, 5].map((level) => <span className={`h-1 flex-1 rounded ${level <= strength ? 'bg-primary' : 'bg-muted'}`} key={level} />)}</div><FieldError message={form.formState.errors.password?.message} /></div>
        <div><label className="text-sm font-medium" htmlFor="confirmPassword">Confirm password</label><div className="mt-1"><PasswordInput id="confirmPassword" autoComplete="new-password" registration={form.register('confirmPassword')} /></div><FieldError message={form.formState.errors.confirmPassword?.message} /></div>
        <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Creating account…' : 'Create landlord account'}</Button>
      </form>
      {message && <div className="mt-4"><FormMessage tone="error">{message}</FormMessage></div>}
    </AuthShell>
  );
}
