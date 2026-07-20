'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-error';
import { groupFieldErrors } from '@/lib/form-errors';
import { AuthShell } from '@/components/auth-shell';

const FIELDS = ['name', 'email', 'password'] as const;

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

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

export default function RegisterPage() {
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
      setTimeout(() => router.push('/login'), 1200);
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
          <Link href="/login" className="font-semibold text-flu-pink hover:text-flu-pink-dark">
            Log in
          </Link>
        </>
      }
    >
      {success && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Account created. Redirecting to login…
        </p>
      )}

      {errors.general && errors.general.length > 0 && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.general.map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="name" className={labelClass}>
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          {errors.name?.map((msg) => (
            <p key={msg} className="mt-1 text-xs text-red-600">
              {msg}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          {errors.email?.map((msg) => (
            <p key={msg} className="mt-1 text-xs text-red-600">
              {msg}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {errors.password?.map((msg) => (
            <p key={msg} className="mt-1 text-xs text-red-600">
              {msg}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-flu-pink px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark hover:shadow-flu-pink/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
