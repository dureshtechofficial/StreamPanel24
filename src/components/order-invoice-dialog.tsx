'use client';

import type { Order, OrderReportEntry } from '@/types/order';
import { XIcon } from './icons';

/** The dialog only needs the invoicing-snapshot fields already on `Order` (customer/plan/stream) — server/reseller names are a bonus when the caller has them (the reports page's enriched `OrderReportEntry`), optional everywhere else (the plain order lists in OrdersPanel/customer dashboard). */
export type InvoiceOrder = Order & Partial<Pick<OrderReportEntry, 'server_name' | 'reseller_name'>>;

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function OrderInvoiceDialog({
  order,
  onClose,
}: {
  order: InvoiceOrder | null;
  onClose: () => void;
}) {
  if (!order) return null;

  const billingLines = [
    order.customer_company_name,
    order.customer_address,
    [order.customer_city, order.customer_state, order.customer_pincode].filter(Boolean).join(', ') ||
      null,
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div onClick={onClose} className="animate-fade-in absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
      <div className="animate-fade-in-up relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Invoice — {order.order_number}</h2>
            <p className="text-xs text-gray-500">Billed {formatDate(order.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close invoice"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Bill to</p>
            <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
            {billingLines.map((line) => (
              <p key={line} className="text-sm text-gray-600">{line}</p>
            ))}
            <p className="mt-1 text-xs text-gray-500">{order.customer_phone}</p>
            {order.customer_email && <p className="text-xs text-gray-500">{order.customer_email}</p>}
            {order.reseller_name && (
              <p className="mt-1 text-xs text-gray-400">Sold via {order.reseller_name}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Plan</p>
            <p className="text-sm font-medium text-gray-900">{order.plan_name}</p>
            {order.plan_description && (
              <p className="text-sm text-gray-600">{order.plan_description}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Stream</p>
            <p className="text-sm font-medium text-gray-900">
              {order.stream_name}
              {order.server_name ? ` (${order.server_name})` : ''}
            </p>
            {order.stream_title && <p className="text-sm text-gray-600">{order.stream_title}</p>}
            {order.stream_ingest_domain && (
              <p className="mt-1 text-xs text-gray-500">
                Ingest domain: {order.stream_ingest_domain}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Amount</span>
              <span className="text-base font-semibold text-gray-900">
                {order.currency} {order.price}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{order.duration_days} days</span>
              <span>
                {formatDate(order.effective_from)} – {formatDate(order.effective_to)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span className="capitalize">{order.payment_method.replace('_', ' ')}</span>
              <span className="capitalize">{order.payment_status}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
