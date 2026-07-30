'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-error';
import { AuthShell } from '@/components/auth-shell';
import { usePageTitle } from '@/lib/use-page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { AlertIcon } from '@/components/icons';

export default function SystemLoginPage() {
  usePageTitle('Log in');
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
          <Link href="/system/register" className="font-semibold text-primary hover:underline">
            Register
          </Link>
        </>
      }
    >
      {errors.length > 0 && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm text-danger">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-0.5">
            {errors.map((msg) => (
              <p key={msg}>{msg}</p>
            ))}
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthShell>
  );
}
