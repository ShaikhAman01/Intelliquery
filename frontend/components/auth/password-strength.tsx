'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

/**
 * Live password checklist shared by sign-up and reset-password.
 * Renders nothing until the user starts typing.
 */
export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Number or symbol', met: /[0-9!@#$%^&*]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-1">
      {checks.map(({ label, met }) => (
        <div key={label} className="flex items-center gap-1.5 text-[12px]">
          {met
            ? <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
            : <XCircle className="h-3.5 w-3.5 text-content-3 flex-shrink-0" />
          }
          <span className={met ? 'text-success' : 'text-content-3'}>{label}</span>
        </div>
      ))}
    </div>
  );
}
