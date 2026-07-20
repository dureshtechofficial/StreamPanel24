'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-error';
import { AuthShell } from '@/components/auth-shell';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password) {
      setErrors(['Email and password are required']);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push('/dashboard');
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
      title="Log in"
      subtitle="Welcome back — video, the way it should be."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-flu-pink hover:text-flu-pink-dark">
            Register
          </Link>
        </>
      }
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
