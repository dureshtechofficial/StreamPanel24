'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-error';
import { groupFieldErrors } from '@/lib/form-errors';
import { AuthShell } from '@/components/auth-shell';
import { usePageTitle } from '@/lib/use-page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { AlertIcon, CheckIcon } from '@/components/icons';

const FIELDS = ['name', 'email', 'password'] as const;

function validateClientSide(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): Record<string, string[]> {
  const errors: Record<string, string[]> = { name: [], email: [], password: [], general: [] };

  if (name.trim().length < 2) {
    errors.name.push('Name must be at least 2 characters long');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email.push('Enter a valid email address');
  }
  if (password.length < 8) {
    errors.password.push('Password must be at least 8 characters long');
  }
  if (confirmPassword !== password) {
    errors.password.push('Passwords do not match');
  }

  return errors;
}

export default function SystemRegisterPage() {
  usePageTitle('Register');
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);

    const clientErrors = validateClientSide(name, email, password, confirmPassword);
    const hasClientErrors = Object.values(clientErrors).some((v) => v.length > 0);
    if (hasClientErrors) {
      setErrors(clientErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      setSuccess(true);
      setTimeout(() => router.push('/system/login'), 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(groupFieldErrors(err.messages, [...FIELDS]));
      } else {
        setErrors({ general: ['Something went wrong. Please try again.'] });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create an account"
      subtitle="Everything for those who build, deploy, and grow video services."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/system/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {success && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-success/20 bg-success-soft px-3.5 py-3 text-sm text-success">
          <CheckIcon className="h-4 w-4 shrink-0" />
          Account created. Redirecting to login…
        </div>
      )}

      {errors.general && errors.general.length > 0 && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm text-danger">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-0.5">
            {errors.general.map((msg) => (
              <p key={msg}>{msg}</p>
            ))}
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field label="Name" htmlFor="name" error={errors.name?.[0]}>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            aria-invalid={!!errors.name?.length}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.[0]}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email?.length}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.[0]}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={!!errors.password?.length}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword">
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}
