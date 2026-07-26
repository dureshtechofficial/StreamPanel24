'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useResellerAuth } from '@/lib/reseller-auth-context';
import { ApiError } from '@/lib/api-error';
import { AuthShell } from '@/components/auth-shell';
import { usePageTitle } from '@/lib/use-page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { AlertIcon } from '@/components/icons';

export default function ResellerLoginPage() {
  usePageTitle('Reseller Login');
  const { login, reseller, isLoading } = useResellerAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already has a valid session (restored via silent refresh) — skip the form.
  useEffect(() => {
    if (!isLoading && reseller) {
      router.replace('/reseller/dashboard');
    }
  }, [isLoading, reseller, router]);

  if (isLoading || reseller) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
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
      router.push('/reseller/dashboard');
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
      title="Reseller login"
      subtitle="Sign in to manage your customers."
      footer="Contact an administrator if you need account access."
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
        <Field label="Phone number or username" htmlFor="identifier">
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="Phone or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
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
