'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/lib/customer-auth-context';
import { ApiError } from '@/lib/api-error';
import { AuthShell } from '@/components/auth-shell';
import { usePageTitle } from '@/lib/use-page-title';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

export default function CustomerLoginPage() {
  usePageTitle('Customer Login');
  const { login, customer, isLoading } = useCustomerAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already has a valid session (restored via silent refresh) — skip the form.
  useEffect(() => {
    if (!isLoading && customer) {
      router.replace('/customer/dashboard');
    }
  }, [isLoading, customer, router]);

  if (isLoading || customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      setErrors(['Phone number/username and password are required']);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
      router.push('/customer/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.messages);
      } else {
        setErrors(['Something went wrong. Please try again.']);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Customer login"
      subtitle="Sign in to view your streams."
      footer="Contact your provider if you need account access."
    >
      {errors.length > 0 && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="identifier" className={labelClass}>
            Phone number or username
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-flu-pink px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark hover:shadow-flu-pink/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}
