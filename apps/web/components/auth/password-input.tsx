'use client';

import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { inputClassName } from './auth-shell';

export function PasswordInput({ id, registration, autoComplete = 'current-password', disabled }: Readonly<{ id: string; registration: UseFormRegisterReturn; autoComplete?: string; disabled?: boolean }>): React.ReactElement {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...registration} autoComplete={autoComplete} className={`${inputClassName} pr-16`} disabled={disabled} id={id} type={visible ? 'text' : 'password'} />
      <button className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-primary" onClick={() => setVisible((value) => !value)} type="button" aria-controls={id} aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
