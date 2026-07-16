import { redirect } from 'next/navigation';

export default function LegacyPasswordResetPage(): never {
  redirect('/forgot-password');
}
