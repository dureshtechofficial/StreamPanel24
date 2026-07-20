'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuth } from '@/lib/auth-context';
import { CalendarIcon, MailIcon, ShieldIcon } from '@/components/icons';

function formatDate(unixSeconds: number | undefined) {
  if (!unixSeconds) return '—';
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function DashboardContent() {
  const { user } = useAuth();

  const cards = [
    { label: 'Email address', value: user?.email ?? '—', icon: MailIcon },
    { label: 'Role', value: user?.role ?? '—', icon: ShieldIcon, badge: true },
    { label: 'Member since', value: formatDate(user?.created_at), icon: CalendarIcon },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="animate-fade-in-up mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s a quick look at your account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, badge }, i) => (
          <div
            key={label}
            style={{ animationDelay: `${i * 90}ms` }}
            className="animate-fade-in-up group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-flu-pink text-white shadow-sm shadow-flu-pink/30 transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {label}
                </p>
                {badge ? (
                  <span className="mt-0.5 inline-block rounded-full bg-flu-navy px-2 py-0.5 text-xs font-medium capitalize text-white">
                    {value}
                  </span>
                ) : (
                  <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ animationDelay: '270ms' }}
        className="animate-fade-in-up mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-gray-900">Account details</h2>
        <dl className="mt-4 divide-y divide-gray-100 text-sm">
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-500">Full name</dt>
            <dd className="font-medium text-gray-900">{user?.name}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{user?.email}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-500">Role</dt>
            <dd className="font-medium capitalize text-gray-900">{user?.role}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-500">Status</dt>
            <dd className="flex items-center gap-1.5 font-medium text-gray-900">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="capitalize">{user?.status}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardShell>
        <DashboardContent />
      </DashboardShell>
    </ProtectedRoute>
  );
}
