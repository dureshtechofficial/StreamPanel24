'use client';

import { useCallback, useEffect, useState } from 'react';
import { listOrdersForCustomer, createOrder, cancelOrder } from '@/lib/orders-api';
import { listPlans } from '@/lib/plans-api';
import { searchAvailableStreams } from '@/lib/customer-streams-api';
import type { CreateOrderInput, Order } from '@/types/order';
import type { Plan } from '@/types/plan';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { PaginatedResult } from '@/types/pagination';
import type { SearchAvailableStreamsParams } from '@/lib/customer-streams-api';
import type { Customer } from '@/types/customer';
import { ApiError } from '@/lib/api-error';
import { ArrowPathIcon, PlusIcon, XIcon } from './icons';

const DURATION_PRESETS = [30, 90, 180, 365];

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'wallet', 'other'];

export interface OrdersPanelApi {
  listOrders: (customerId: string) => Promise<Order[]>;
  createOrder: (customerId: string, input: CreateOrderInput) => Promise<Order>;
  cancelOrder: (customerId: string, orderId: string) => Promise<Order>;
  listPlans: () => Promise<Plan[]>;
  searchStreams: (
    params: SearchAvailableStreamsParams,
  ) => Promise<PaginatedResult<FlussonicStreamDirectoryEntry>>;
}

const DEFAULT_API: OrdersPanelApi = {
  listOrders: listOrdersForCustomer,
  createOrder,
  cancelOrder: (_customerId, orderId) => cancelOrder(orderId),
  listPlans: () => listPlans({ status: 'active', limit: 100 }).then((r) => r.items),
  searchStreams: searchAvailableStreams,
};

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-50 text-red-700',
  suspended: 'bg-amber-50 text-amber-700',
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-600',
};

export function OrdersPanel({
  open,
  customer,
  onClose,
  api = DEFAULT_API,
  priceField = 'customer_price',
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  /** Defaults to the admin-scoped API (/orders, /plans, /flussonic-streams) — pass the reseller-scoped equivalents to reuse this panel in the reseller portal. */
  api?: OrdersPanelApi;
  /** Which plan price to show/default to — 'customer_price' for admin, 'reseller_price' for the reseller portal. */
  priceField?: 'customer_price' | 'reseller_price';
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [streams, setStreams] = useState<FlussonicStreamDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [planId, setPlanId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Reset transient state whenever the panel is (re)opened for a customer.
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  if (open && customer && initializedFor !== customer.id) {
    setInitializedFor(customer.id);
    setShowForm(false);
    setPlanId('');
    setStreamId('');
    setDurationDays(30);
    setPaymentMethod(PAYMENT_METHODS[0]);
    setRemark('');
    setSubmitError(null);
  }

  const load = useCallback(async () => {
    if (!customer) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [ordersResult, plansResult, streamsResult] = await Promise.all([
        api.listOrders(customer.id),
        api.listPlans(),
        api.searchStreams({ availableForCustomerId: customer.id, limit: 100 }),
      ]);
      setOrders(ordersResult);
      setPlans(plansResult);
      setStreams(streamsResult.items);
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

  async function handleCreate() {
    if (!customer || !planId || !streamId) {
      setSubmitError('Select a plan and a stream.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await api.createOrder(customer.id, {
        plan_id: planId,
        stream_id: streamId,
        duration_days: durationDays,
        payment_method: paymentMethod,
        remark: remark.trim() || undefined,
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Failed to create order.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(order: Order) {
    if (!customer) return;
    setCancellingId(order.id);
    try {
      await api.cancelOrder(customer.id, order.id);
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Orders</h2>
            <p className="text-xs text-gray-500">{customer?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close panel"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Loading orders…
            </p>
          )}

          {!isLoading && loadError && <p className="text-sm text-red-600">{loadError}</p>}

          {!isLoading && !loadError && (
            <>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-500 transition hover:border-flu-pink hover:text-flu-pink"
                >
                  <PlusIcon className="h-4 w-4" />
                  New order
                </button>
              )}

              {showForm && (
                <div className="mb-4 space-y-3 rounded-lg border border-gray-200 p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Plan</label>
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
                    >
                      <option value="">Choose a plan…</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} — {plan[priceField]}
                        </option>
                      ))}
                    </select>
                    {previewPrice !== null && (
                      <p className="mt-1 text-xs text-gray-400">Price: {previewPrice}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Stream</label>
                    <select
                      value={streamId}
                      onChange={(e) => setStreamId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
                    >
                      <option value="">Choose a stream…</option>
                      {streams.map((stream) => (
                        <option key={stream.id} value={stream.id}>
                          {stream.name} ({stream.server_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Duration (days)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value) || 1)}
                        className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
                      />
                      <div className="flex gap-1">
                        {DURATION_PRESETS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDurationDays(d)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                              durationDays === d
                                ? 'bg-flu-pink text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Payment method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Remark (optional)
                    </label>
                    <input
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
                    />
                  </div>

                  {submitError && <p className="text-xs text-red-600">{submitError}</p>}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={isSubmitting}
                      className="rounded-full bg-flu-pink px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? 'Creating…' : 'Create order'}
                    </button>
                  </div>
                </div>
              )}

              {orders.length === 0 && (
                <p className="text-sm text-gray-400">No orders yet.</p>
              )}

              {orders.length > 0 && (
                <ul className="space-y-3">
                  {orders.map((order) => (
                    <li key={order.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {order.order_number}
                        </span>
                        <div className="flex gap-1.5">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              ORDER_STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {order.status}
                          </span>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              PAYMENT_STATUS_STYLES[order.payment_status] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {order.payment_status}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {order.currency} {order.price} · {order.duration_days} days ·{' '}
                        {formatDate(order.effective_from)} – {formatDate(order.effective_to)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.payment_method.replace('_', ' ')}
                        {order.remark ? ` — ${order.remark}` : ''}
                      </p>
                      {order.status === 'active' && (
                        <button
                          onClick={() => handleCancel(order)}
                          disabled={cancellingId === order.id}
                          className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                        >
                          {cancellingId === order.id ? 'Cancelling…' : 'Cancel order'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
