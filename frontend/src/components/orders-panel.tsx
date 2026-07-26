'use client';

import { useCallback, useEffect, useState } from 'react';
import { listOrdersForCustomer, createOrder, cancelOrder } from '@/lib/orders-api';
import { listPlans } from '@/lib/plans-api';
import { listCustomerStreams } from '@/lib/customer-streams-api';
import { getCustomerWalletBalance } from '@/lib/customer-wallet-api';
import type { CreateOrderInput, Order } from '@/types/order';
import type { Plan } from '@/types/plan';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { Customer } from '@/types/customer';
import { ApiError } from '@/lib/api-error';
import { ArrowPathIcon, EyeIcon, PlusIcon, XIcon } from './icons';
import { ConfirmDialog } from './confirm-dialog';
import { OrderInvoiceDialog } from './order-invoice-dialog';

const ALL_PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'wallet', 'other'];

export interface OrdersPanelApi {
  listOrders: (customerId: string) => Promise<Order[]>;
  createOrder: (customerId: string, input: CreateOrderInput) => Promise<Order>;
  cancelOrder: (customerId: string, orderId: string) => Promise<Order>;
  listPlans: () => Promise<Plan[]>;
  /** Streams already assigned to this customer — an order can only provision from those, not any unassigned stream. */
  listAssignedStreams: (customerId: string) => Promise<FlussonicStreamDirectoryEntry[]>;
  /**
   * Shows a "Current balance" line under the payment-method field whenever
   * 'wallet' is selected. Admin passes the customer's own balance
   * (`getCustomerWalletBalance`, keyed by the `customerId` arg); the
   * reseller portal passes its own balance instead (`getMyWalletBalance`,
   * which ignores the arg — reseller orders are always wallet-billed to the
   * reseller, never the customer).
   */
  getWalletBalance?: (customerId: string) => Promise<{ wallet_balance: string }>;
}

const DEFAULT_API: OrdersPanelApi = {
  listOrders: listOrdersForCustomer,
  createOrder,
  cancelOrder: (_customerId, orderId) => cancelOrder(orderId),
  listPlans: () => listPlans({ status: 'active', limit: 100 }).then((r) => r.items),
  listAssignedStreams: listCustomerStreams,
  getWalletBalance: getCustomerWalletBalance,
};

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  active: 'bg-success-soft text-success',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-danger-soft text-danger',
  suspended: 'bg-warning-soft text-warning',
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-success-soft text-success',
  pending: 'bg-warning-soft text-warning',
  failed: 'bg-danger-soft text-danger',
  refunded: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};

export function OrdersPanel({
  open,
  customer,
  onClose,
  api = DEFAULT_API,
  priceField = 'customer_price',
  cancelEnabled = true,
  showCancelDisabledNotice = true,
  paymentMethods = ALL_PAYMENT_METHODS,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  /** Defaults to the admin-scoped API (/orders, /plans, /flussonic-streams) — pass the reseller-scoped equivalents to reuse this panel in the reseller portal. */
  api?: OrdersPanelApi;
  /** Which plan price to show/default to — 'customer_price' for admin, 'reseller_price' for the reseller portal. */
  priceField?: 'customer_price' | 'reseller_price';
  /** Whether the current actor (admin/reseller) is currently allowed to cancel an order — set from Settings' per-role toggle. */
  cancelEnabled?: boolean;
  /** Whether to show the "cancellation is currently disabled" notice when cancelEnabled is false — the reseller portal hides it. */
  showCancelDisabledNotice?: boolean;
  /** Payment methods selectable when creating an order — defaults to every method (admin); the reseller portal passes ['wallet'] only. */
  paymentMethods?: string[];
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [streams, setStreams] = useState<FlussonicStreamDirectoryEntry[]>([]);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [planId, setPlanId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [pendingQueuedOrder, setPendingQueuedOrder] = useState<Order | null>(null);

  // Reset transient state whenever the panel is (re)opened for a customer.
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  if (open && customer && initializedFor !== customer.id) {
    setInitializedFor(customer.id);
    setShowForm(false);
    setPlanId('');
    setStreamId('');
    setPaymentMethod(paymentMethods[0]);
    setRemark('');
    setSubmitError(null);
    setSubmitInfo(null);
    setPendingQueuedOrder(null);
  }

  const load = useCallback(async () => {
    if (!customer) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [ordersResult, plansResult, streamsResult, walletResult] = await Promise.all([
        api.listOrders(customer.id),
        api.listPlans(),
        api.listAssignedStreams(customer.id),
        api.getWalletBalance?.(customer.id) ?? Promise.resolve(null),
      ]);
      setOrders(ordersResult);
      setPlans(plansResult);
      setStreams(streamsResult);
      setWalletBalance(walletResult?.wallet_balance ?? null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, [customer, api]);

  useEffect(() => {
    if (!open || !customer) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [open, customer, load]);

  const selectedPlan = plans.find((p) => p.id === planId) ?? null;
  const previewPrice = selectedPlan ? selectedPlan[priceField] : null;

  function handleCreateClick() {
    if (!customer || !planId || !streamId) {
      setSubmitError('Select a plan and a stream.');
      return;
    }
    // Same overlap rule the backend applies (resolveEffectiveFrom): a stream
    // can only be under one active order's date window at a time, so a new
    // order on a stream that already has one gets queued to start once it
    // ends rather than overlapping it — confirm that's expected before
    // actually creating it, instead of surprising the admin after the fact.
    const existingActive = orders.find(
      (o) => o.stream_id === streamId && o.status === 'active',
    );
    if (existingActive) {
      setPendingQueuedOrder(existingActive);
      return;
    }
    handleCreate();
  }

  async function handleCreate() {
    if (!customer || !planId || !streamId) {
      setSubmitError('Select a plan and a stream.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitInfo(null);
    try {
      const created = await api.createOrder(customer.id, {
        plan_id: planId,
        stream_id: streamId,
        payment_method: paymentMethod,
        remark: remark.trim() || undefined,
      });
      // The backend pushes effective_from past an existing active order on
      // this stream instead of overlapping it — surface that as a renewal,
      // not a silent surprise about why the order isn't starting today.
      const startsInFuture = created.effective_from > Date.now() / 1000 + 300;
      if (startsInFuture) {
        setSubmitInfo(
          `This stream already has an active order — the new one is queued to start ${formatDate(created.effective_from)}, right after the current one ends.`,
        );
      } else {
        setShowForm(false);
      }
      await load();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Failed to create order.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmCancel() {
    if (!customer || !pendingCancel) return;
    setCancellingId(pendingCancel.id);
    setCancelError(null);
    try {
      await api.cancelOrder(customer.id, pendingCancel.id);
      setPendingCancel(null);
      await load();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Orders</h2>
            <p className="text-xs text-muted-foreground">{customer?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground"
            aria-label="Close panel"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cancelError && <p className="mb-3 text-sm text-danger">{cancelError}</p>}

          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground/70">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Loading orders…
            </p>
          )}

          {!isLoading && loadError && <p className="text-sm text-danger">{loadError}</p>}

          {!isLoading && !loadError && (
            <>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-input py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  <PlusIcon className="h-4 w-4" />
                  New order
                </button>
              )}

              {showForm && (
                <div className="mb-4 space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Plan</label>
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="">Choose a plan…</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} — {plan[priceField]}
                        </option>
                      ))}
                    </select>
                    {previewPrice !== null && (
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        Price: {previewPrice} · {selectedPlan?.duration_days} days
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Stream</label>
                    <select
                      value={streamId}
                      onChange={(e) => setStreamId(e.target.value)}
                      disabled={streams.length === 0}
                      className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground/70"
                    >
                      <option value="">Choose a stream…</option>
                      {streams.map((stream) => (
                        <option key={stream.id} value={stream.id}>
                          {stream.name} ({stream.server_name})
                        </option>
                      ))}
                    </select>
                    {streams.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        This customer has no assigned streams yet — assign one first.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Payment method
                    </label>
                    {paymentMethods.length === 1 ? (
                      <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm capitalize text-foreground">
                        {paymentMethods[0].replace('_', ' ')}
                      </p>
                    ) : (
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                      >
                        {paymentMethods.map((m) => (
                          <option key={m} value={m}>
                            {m.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    )}
                    {walletBalance !== null && paymentMethod === 'wallet' && (
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        Current balance: {walletBalance}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Remark (optional)
                    </label>
                    <input
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                  </div>

                  {submitError && <p className="text-xs text-danger">{submitError}</p>}
                  {submitInfo && (
                    <p className="rounded-md bg-warning-soft px-2 py-1.5 text-xs text-warning">
                      {submitInfo}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-full border border-input px-4 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateClick}
                      disabled={isSubmitting}
                      className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? 'Creating…' : 'Create order'}
                    </button>
                  </div>
                </div>
              )}

              {orders.length === 0 && (
                <p className="text-sm text-muted-foreground/70">No orders yet.</p>
              )}

              {orders.length > 0 && (
                <ul className="space-y-3">
                  {orders.map((order) => (
                    <li key={order.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {order.order_number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              ORDER_STATUS_STYLES[order.status] ?? 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {order.status}
                          </span>
                          {/* <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              PAYMENT_STATUS_STYLES[order.payment_status] ?? 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {order.payment_status}
                          </span> */}
                          <button
                            onClick={() => setInvoiceOrder(order)}
                            className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`View invoice for ${order.order_number}`}
                            title="View invoice"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {order.currency} {order.price} · {order.duration_days} days ·{' '}
                        {formatDate(order.effective_from)} – {formatDate(order.effective_to)}
                      </p>
                      <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.stream_name}
                        {order.stream_title ? ` — ${order.stream_title}` : ''}
                      </p>
                      {order.stream_ingest_domain && (
                        <p className="text-xs text-muted-foreground/70">
                          Ingest domain: {order.stream_ingest_domain}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70">
                        {order.payment_method.replace('_', ' ')}
                        {order.remark ? ` — ${order.remark}` : ''}
                      </p>
                      {order.status === 'active' && cancelEnabled && (
                        <button
                          onClick={() => setPendingCancel(order)}
                          disabled={cancellingId === order.id}
                          className="mt-2 text-xs font-medium text-danger hover:text-danger disabled:opacity-60"
                        >
                          Cancel order
                        </button>
                      )}
                      {order.status === 'active' && !cancelEnabled && showCancelDisabledNotice && (
                        <p className="mt-2 text-xs text-muted-foreground/70">
                          Order cancellation is currently disabled
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingCancel !== null}
        title="Cancel order"
        message={`Are you sure you want to cancel order "${pendingCancel?.order_number}"? This unassigns the stream and can't be undone.`}
        confirmLabel="Cancel order"
        busyLabel="Cancelling…"
        isBusy={cancellingId === pendingCancel?.id}
        onConfirm={handleConfirmCancel}
        onCancel={() => setPendingCancel(null)}
      />

      <ConfirmDialog
        open={pendingQueuedOrder !== null}
        title="Stream already has an active order"
        message={
          pendingQueuedOrder
            ? `This stream already has an active order ("${pendingQueuedOrder.order_number}") ending ${formatDate(pendingQueuedOrder.effective_to)} — the new one will be queued to start right after it ends, not today. Continue?`
            : ''
        }
        confirmLabel="Create order"
        busyLabel="Creating…"
        isBusy={isSubmitting}
        onConfirm={() => {
          setPendingQueuedOrder(null);
          handleCreate();
        }}
        onCancel={() => setPendingQueuedOrder(null)}
      />

      <OrderInvoiceDialog
        order={
          invoiceOrder && {
            ...invoiceOrder,
            // server_name isn't part of the invoicing snapshot (a stream's
            // hosting server doesn't affect billing terms) — enrich it
            // best-effort from the currently-assigned streams list, but
            // never touch stream_name/stream_title, which must stay exactly
            // what was frozen at purchase time.
            server_name: streams.find((s) => s.id === invoiceOrder.stream_id)?.server_name,
          }
        }
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
}
