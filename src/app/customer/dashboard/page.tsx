'use client';

import { useCallback, useEffect, useState } from 'react';
import { CustomerProtectedRoute } from '@/components/customer-protected-route';
import { CustomerShell } from '@/components/customer-shell';
import {
  ArrowPathIcon,
  BroadcastIcon,
  EyeIcon,
  PlayIcon,
  PowerIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/icons';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { OrderInvoiceDialog } from '@/components/order-invoice-dialog';
import { StreamDetailsPanel } from '@/components/stream-details-panel';
import { StreamSessionsPanel } from '@/components/stream-sessions-panel';
import { WalletTransactionsPanel } from '@/components/wallet-transactions-panel';
import { RazorpayTopupDialog } from '@/components/razorpay-topup-dialog';
import {
  getMyStreamDetails,
  listMyStreams,
  listMyStreamSessions,
  setMyStreamDisabled,
} from '@/lib/customer-portal-api';
import {
  getMyWalletBalance,
  listMyWalletTransactions,
  createMyRazorpayOrder,
  verifyMyRazorpayPayment,
} from '@/lib/customer-wallet-portal-api';
import { listMyOrders, cancelMyOrder } from '@/lib/customer-orders-api';
import { useCustomerOrderCancelEnabled } from '@/lib/use-order-cancel-enabled';
import { useCustomerWalletTopupSettings } from '@/lib/use-wallet-topup-settings';
import { useStreamDisableActions } from '@/lib/use-stream-disable-actions';
import { liveStatusStyle } from '@/lib/live-status-style';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { FlussonicStream } from '@/types/flussonic-stream';
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

const VISIBLE_ORDERS_LIMIT = 5;

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function CustomerDashboardContent() {
  usePageTitle('My Streams');
  const { customer } = useCustomerAuth();
  const cancelEnabled = useCustomerOrderCancelEnabled();
  const walletTopupSettings = useCustomerWalletTopupSettings();
  const [streams, setStreams] = useState<FlussonicStreamDirectoryEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [sessionsStream, setSessionsStream] = useState<FlussonicStreamDirectoryEntry | null>(null);
  const [walletHistoryOpen, setWalletHistoryOpen] = useState(false);
  const [viewingStream, setViewingStream] = useState<FlussonicStream | null>(null);
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [walletBalanceOverride, setWalletBalanceOverride] = useState<string | null>(null);

  const loadWalletHistory = useCallback(
    (page: number, limit: number) => listMyWalletTransactions({ page, limit }),
    [],
  );

  const load = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError(null);
    try {
      const [streamsResult, ordersResult, walletResult] = await Promise.all([
        listMyStreams(),
        listMyOrders(),
        getMyWalletBalance(),
      ]);
      setStreams(streamsResult);
      setOrders(ordersResult);
      setWalletBalanceOverride(walletResult.wallet_balance);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load your account.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const streamActions = useStreamDisableActions(
    (streamId, disabled) => setMyStreamDisabled(streamId, disabled),
    load,
  );

  async function handleView(stream: FlussonicStreamDirectoryEntry) {
    setViewLoadingId(stream.id);
    setViewError(null);
    try {
      const full = await getMyStreamDetails(stream.id);
      setViewingStream(full);
    } catch (err) {
      setViewError(err instanceof ApiError ? err.message : 'Failed to load stream details.');
    } finally {
      setViewLoadingId(null);
    }
  }

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

  const visibleOrders = orders.slice(0, VISIBLE_ORDERS_LIMIT);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="animate-fade-in-up mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Welcome{customer ? `, ${customer.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Streams assigned to your account.</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={isLoading || isRefreshing}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Refresh wallet, streams, and orders"
          title="Refresh"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {customer && customer.reseller_id === null && (
        <div
          className="animate-fade-in-up mb-6 flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          style={{ animationDelay: '30ms' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-flu-pink/10 text-flu-pink">
              <WalletIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Wallet balance
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {walletBalanceOverride ?? Number(customer.wallet_balance).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {walletTopupSettings.enabled && (
              <button
                onClick={() => setTopupDialogOpen(true)}
                className="rounded-full bg-flu-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark"
              >
                Add money
              </button>
            )}
            {/* <button
              onClick={() => setWalletHistoryOpen(true)}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              View history
            </button> */}
          </div>
        </div>
      )}

      <div className="animate-fade-in-up overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {viewError && (
          <p className="px-4 pt-3 text-sm text-red-600">{viewError}</p>
        )}
        {streamActions.error && (
          <p className="px-4 pt-3 text-sm text-red-600">{streamActions.error}</p>
        )}

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
                    <p className="truncate font-medium text-gray-900">
                      {stream.name}
                      {stream.title ? ` — ${stream.title}` : ''}
                    </p>
                    <p className="truncate text-xs text-gray-500">{stream.server_name}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      STATUS_STYLES[stream.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {stream.status}
                  </span>
                  {stream.disabled && (
                    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      disabled
                    </span>
                  )}
                  {stream.live_status && (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${liveStatusStyle(stream.live_status)}`}
                    >
                      {stream.live_status}
                    </span>
                  )}
                  <button
                    onClick={() => handleView(stream)}
                    disabled={viewLoadingId === stream.id}
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink disabled:opacity-60"
                    aria-label={`View ${stream.name}`}
                    title="View stream"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSessionsStream(stream)}
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                    aria-label={`View sessions for ${stream.name}`}
                    title="View sessions"
                  >
                    <UsersIcon className="h-4 w-4" />
                  </button>
                  {stream.disabled ? (
                    <button
                      onClick={() => streamActions.start(stream.id)}
                      disabled={streamActions.busyId === stream.id}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-60"
                      aria-label={`Start ${stream.name}`}
                      title="Start"
                    >
                      <PlayIcon
                        className={`h-4 w-4 ${
                          streamActions.busyId === stream.id && streamActions.busyAction === 'start'
                            ? 'animate-pulse'
                            : ''
                        }`}
                      />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => streamActions.disable(stream.id)}
                        disabled={streamActions.busyId === stream.id}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                        aria-label={`Disable ${stream.name}`}
                        title="Disable"
                      >
                        <PowerIcon
                          className={`h-4 w-4 ${
                            streamActions.busyId === stream.id && streamActions.busyAction === 'disable'
                              ? 'animate-pulse'
                              : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => streamActions.restart(stream.id)}
                        disabled={streamActions.busyId === stream.id}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink disabled:opacity-60"
                        aria-label={`Restart ${stream.name}`}
                        title="Restart"
                      >
                        <ArrowPathIcon
                          className={`h-4 w-4 ${
                            streamActions.busyId === stream.id && streamActions.busyAction === 'restart'
                              ? 'animate-spin'
                              : ''
                          }`}
                        />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="animate-fade-in-up mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            My orders
          </h2>
          {orders.length > VISIBLE_ORDERS_LIMIT && (
            <p className="text-xs text-gray-400">
              Showing {VISIBLE_ORDERS_LIMIT} most recent of {orders.length}
            </p>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {!isLoading && !loadError && orders.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No orders yet.</p>
          )}
          {!isLoading && !loadError && orders.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {visibleOrders.map((order) => (
                <li key={order.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{order.order_number}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          ORDER_STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {order.status}
                      </span>
                      <button
                        onClick={() => setInvoiceOrder(order)}
                        className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                        aria-label={`View invoice for ${order.order_number}`}
                        title="View invoice"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {order.plan_name} · {order.currency} {order.price} · {order.duration_days} days
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.stream_name}
                    {order.stream_title ? ` — ${order.stream_title}` : ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(order.effective_from)} – {formatDate(order.effective_to)} ·{' '}
                    {order.payment_method.replace('_', ' ')}
                  </p>
                  {order.status === 'active' && cancelEnabled && (
                    <button
                      onClick={() => setPendingCancel(order)}
                      className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Cancel order
                    </button>
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

      <OrderInvoiceDialog
        order={
          invoiceOrder && {
            ...invoiceOrder,
            // server_name isn't part of the invoicing snapshot — enrich it
            // best-effort from the customer's own stream list, but never
            // touch stream_name/stream_title, which must stay exactly what
            // was frozen at purchase time.
            server_name: streams.find((s) => s.id === invoiceOrder.stream_id)?.server_name,
          }
        }
        onClose={() => setInvoiceOrder(null)}
      />

      <StreamDetailsPanel
        open={viewingStream !== null}
        stream={viewingStream}
        onClose={() => setViewingStream(null)}
        showRawData={false}
      />

      <StreamSessionsPanel
        open={sessionsStream !== null}
        streamId={sessionsStream?.id ?? null}
        streamName={sessionsStream?.name ?? null}
        onClose={() => setSessionsStream(null)}
        listSessions={listMyStreamSessions}
      />

      <WalletTransactionsPanel
        open={walletHistoryOpen}
        title="Wallet history"
        loadPage={loadWalletHistory}
        onClose={() => setWalletHistoryOpen(false)}
      />

      <RazorpayTopupDialog
        open={topupDialogOpen}
        minimumAmount={walletTopupSettings.minimum_amount}
        onClose={() => setTopupDialogOpen(false)}
        createOrder={createMyRazorpayOrder}
        verifyPayment={verifyMyRazorpayPayment}
        onSuccess={setWalletBalanceOverride}
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
