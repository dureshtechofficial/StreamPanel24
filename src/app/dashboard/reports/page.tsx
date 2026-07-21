"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { listOrderReports } from "@/lib/orders-api";
import type { OrderReportEntry, OrderStatus, OrdersSummary, PaymentStatus } from "@/types/order";
import { ApiError } from "@/lib/api-error";
import { useAuth } from "@/lib/auth-context";
import { usePageTitle } from "@/lib/use-page-title";

const PAGE_SIZE = 20;

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  active: "bg-green-50 text-green-700",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-700",
  suspended: "bg-amber-50 text-amber-700",
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-600",
};

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function ReportsContent() {
  usePageTitle("Reports");
  const [items, setItems] = useState<OrderReportEntry[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listOrderReports({
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(result.items);
      setSummary(result.summary);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  }, [status, paymentStatus, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="w-full">
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">All orders across every customer and reseller.</p>
      </div>

      {summary && (
        <div
          className="animate-fade-in-up mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
          style={{ animationDelay: "40ms" }}
        >
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Total orders
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.totalOrders}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Total value
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.totalValue}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Paid revenue
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.paidRevenue}</p>
          </div>
        </div>
      )}

      <div
        className="animate-fade-in-up mb-4 flex flex-col gap-3 sm:flex-row"
        style={{ animationDelay: "60ms" }}
      >
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value as PaymentStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
        >
          <option value="">All payment statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div
        className="animate-fade-in-up overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        {isLoading && (
          <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-400">
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
            Loading orders…
          </p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-red-600">{loadError}</p>
        )}

        {!isLoading && !loadError && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">No orders found.</p>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <>
            {/* Table — sm and up */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Stream</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{order.order_number}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.customer_name}
                        {order.reseller_name && (
                          <div className="text-xs text-gray-400">via {order.reseller_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{order.plan_name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.stream_name}
                        <div className="text-xs text-gray-400">{order.server_name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.currency} {order.price}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ORDER_STATUS_STYLES[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PAYMENT_STATUS_STYLES[order.payment_status]}`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(order.effective_from)} – {formatDate(order.effective_to)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — below sm */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {items.map((order) => (
                <div key={order.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{order.order_number}</p>
                      <p className="truncate text-xs text-gray-500">
                        {order.customer_name} · {order.plan_name}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {order.stream_name} ({order.server_name})
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm font-medium text-gray-900">
                      {order.currency} {order.price}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-medium capitalize ${ORDER_STATUS_STYLES[order.status]}`}
                    >
                      {order.status}
                    </span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-medium capitalize ${PAYMENT_STATUS_STYLES[order.payment_status]}`}
                    >
                      {order.payment_status}
                    </span>
                    <span>
                      {formatDate(order.effective_from)} – {formatDate(order.effective_to)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          <span>{total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RestrictedNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900">Access restricted</h1>
      <p className="mt-2 text-sm text-gray-500">
        Viewing reports requires an admin account. Contact an administrator if
        you need access.
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardShell>
        {user?.role === "admin" ? <ReportsContent /> : <RestrictedNotice />}
      </DashboardShell>
    </ProtectedRoute>
  );
}
