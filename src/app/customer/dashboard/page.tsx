'use client';

import { useCallback, useEffect, useState } from 'react';
import { CustomerProtectedRoute } from '@/components/customer-protected-route';
import { CustomerShell } from '@/components/customer-shell';
import { ArrowPathIcon, BroadcastIcon } from '@/components/icons';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { listMyStreams } from '@/lib/customer-portal-api';
import { listMyOrders, cancelMyOrder } from '@/lib/customer-orders-api';
import { useCustomerOrderCancelEnabled } from '@/lib/use-order-cancel-enabled';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { Order } from '@/types/order';
import { ApiError } from '@/lib/api-error';
import { useCustomerAuth } from '@/lib/customer-auth-context';
import { usePageTitle } from '@/lib/use-page-title';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  disabled: 'bg-gray-100 text-gray-600',
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-50 text-red-700',
  suspended: 'bg-amber-50 text-amber-700',
};

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function CustomerDashboardContent() {
  usePageTitle('My Streams');
  const { customer } = useCustomerAuth();
  const cancelEnabled = useCustomerOrderCancelEnabled();
  const [streams, setStreams] = useState<FlussonicStreamDirectoryEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [streamsResult, ordersResult] = await Promise.all([listMyStreams(), listMyOrders()]);
      setStreams(streamsResult);
      setOrders(ordersResult);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load your account.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleConfirmCancel() {
    if (!pendingCancel) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelMyOrder(pendingCancel.id);
      setPendingCancel(null);
      await load();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  }

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

      <div className="animate-fade-in-up mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          My orders
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {!isLoading && !loadError && orders.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No orders yet.</p>
          )}
          {!isLoading && !loadError && orders.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {orders.map((order) => (
                <li key={order.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{order.order_number}</span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        ORDER_STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(order.effective_from)} – {formatDate(order.effective_to)}
                  </p>
                  {order.status === 'active' && cancelEnabled && (
                    <button
                      onClick={() => setPendingCancel(order)}
                      className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Cancel order
                    </button>
                  )}
                  {order.status === 'active' && !cancelEnabled && (
                    <p className="mt-2 text-xs text-gray-400">
                      Order cancellation is currently disabled
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {cancelError && <p className="mt-2 text-xs text-red-600">{cancelError}</p>}
      </div>

      <ConfirmDialog
        open={pendingCancel !== null}
        title="Cancel order"
        message={`Are you sure you want to cancel order "${pendingCancel?.order_number}"? This can't be undone.`}
        confirmLabel="Cancel order"
        busyLabel="Cancelling…"
        isBusy={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setPendingCancel(null)}
      />
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
