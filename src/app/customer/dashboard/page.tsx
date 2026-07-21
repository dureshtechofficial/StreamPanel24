'use client';

import { useCallback, useEffect, useState } from 'react';
import { CustomerProtectedRoute } from '@/components/customer-protected-route';
import { CustomerShell } from '@/components/customer-shell';
import { ArrowPathIcon, BroadcastIcon } from '@/components/icons';
import { listMyStreams } from '@/lib/customer-portal-api';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import { ApiError } from '@/lib/api-error';
import { useCustomerAuth } from '@/lib/customer-auth-context';
import { usePageTitle } from '@/lib/use-page-title';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  disabled: 'bg-gray-100 text-gray-600',
};

function CustomerDashboardContent() {
  usePageTitle('My Streams');
  const { customer } = useCustomerAuth();
  const [streams, setStreams] = useState<FlussonicStreamDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listMyStreams();
      setStreams(result);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load your streams.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Welcome{customer ? `, ${customer.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Streams assigned to your account.</p>
      </div>

      <div className="animate-fade-in-up overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading && (
          <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-400">
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
            Loading your streams…
          </p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-red-600">{loadError}</p>
        )}

        {!isLoading && !loadError && streams.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">
            No streams have been assigned to your account yet.
          </p>
        )}

        {!isLoading && !loadError && streams.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {streams.map((stream) => (
              <li key={stream.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BroadcastIcon className="h-5 w-5 shrink-0 text-flu-pink" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{stream.name}</p>
                    <p className="truncate text-xs text-gray-500">{stream.server_name}</p>
                  </div>
                </div>
                <span
                  className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    STATUS_STYLES[stream.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {stream.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function CustomerDashboardPage() {
  return (
    <CustomerProtectedRoute>
      <CustomerShell>
        <CustomerDashboardContent />
      </CustomerShell>
    </CustomerProtectedRoute>
  );
}
