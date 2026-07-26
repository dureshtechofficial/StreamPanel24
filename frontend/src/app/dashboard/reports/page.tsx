"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  SearchIcon,
} from "@/components/icons";
import { OrderInvoiceDialog } from "@/components/order-invoice-dialog";
import { listOrderReports } from "@/lib/orders-api";
import { listResellers } from "@/lib/resellers-api";
import type { OrderReportEntry, OrderStatus, OrdersSummary, PaymentStatus } from "@/types/order";
import type { Reseller } from "@/types/reseller";
import { ApiError } from "@/lib/api-error";
import { useAuth } from "@/lib/auth-context";
import { usePageTitle } from "@/lib/use-page-title";

const SECONDS_PER_DAY = 86_400;

/** `<input type="date">` gives "YYYY-MM-DD", which Date parses as UTC midnight — used as-is for the start of the range, plus one whole day (minus a second) for an inclusive end-of-day on the end of the range. */
function dateStringToUnixStart(value: string): number | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

function dateStringToUnixEnd(value: string): number | undefined {
  const start = dateStringToUnixStart(value);
  return start === undefined ? undefined : start + SECONDS_PER_DAY - 1;
}

const PAGE_SIZE = 20;

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  active: "bg-success-soft text-success",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-danger-soft text-danger",
  suspended: "bg-warning-soft text-warning",
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: "bg-success-soft text-success",
  pending: "bg-warning-soft text-warning",
  failed: "bg-danger-soft text-danger",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
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
  const [resellerId, setResellerId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderReportEntry | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    listResellers({ status: "active", limit: 100 })
      .then((result) => setResellers(result.items))
      .catch(() => {
        // best-effort; the filter still works, just starts with an empty list
      });
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listOrderReports({
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        resellerId: resellerId || undefined,
        search: debouncedSearch || undefined,
        dateFrom: dateStringToUnixStart(dateFrom),
        dateTo: dateStringToUnixEnd(dateTo),
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
  }, [status, paymentStatus, resellerId, debouncedSearch, dateFrom, dateTo, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="w-full">
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">All orders across every customer and reseller.</p>
      </div>

      {summary && (
        <div
          className="animate-fade-in-up mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
          style={{ animationDelay: "40ms" }}
        >
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Total orders
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{summary.totalOrders}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Total value
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{summary.totalValue}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Paid revenue
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{summary.paidRevenue}</p>
          </div>
        </div>
      )}

      <div className="animate-fade-in-up mb-3" style={{ animationDelay: "60ms" }}>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number, customer, or stream…"
            className="w-full rounded-lg border border-input py-2 pl-9 pr-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <div
        className="animate-fade-in-up mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        style={{ animationDelay: "80ms" }}
      >
        <select
          value={resellerId}
          onChange={(e) => {
            setResellerId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">All resellers</option>
          <option value="none">Direct customers only</option>
          {resellers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
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
          className="rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">All payment statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <label className="col-span-2 flex items-center gap-2 sm:col-span-1">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </label>
        <label className="col-span-2 flex items-center gap-2 sm:col-span-1">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </label>
        {(resellerId || status || paymentStatus || search || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setResellerId("");
              setStatus("");
              setPaymentStatus("");
              setSearch("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            className="col-span-2 rounded-lg border border-input px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted sm:col-span-1"
          >
            Clear filters
          </button>
        )}
      </div>

      <div
        className="animate-fade-in-up overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        {isLoading && (
          <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground/70">
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
            Loading orders…
          </p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-danger">{loadError}</p>
        )}

        {!isLoading && !loadError && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">No orders found.</p>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <>
            {/* Table — sm and up */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
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
                <tbody className="divide-y divide-border">
                  {items.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-muted">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{order.order_number}</span>
                          <button
                            onClick={() => setInvoiceOrder(order)}
                            className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`View invoice for ${order.order_number}`}
                            title="View invoice"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.customer_name}
                        {order.reseller_name && (
                          <div className="text-xs text-muted-foreground/70">via {order.reseller_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{order.plan_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.stream_name}
                        <div className="text-xs text-muted-foreground/70">{order.server_name}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
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
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(order.effective_from)} – {formatDate(order.effective_to)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — below sm */}
            <div className="divide-y divide-border sm:hidden">
              {items.map((order) => (
                <div key={order.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        onClick={() => setInvoiceOrder(order)}
                        className="truncate font-medium text-foreground underline decoration-dotted underline-offset-2"
                      >
                        {order.order_number}
                      </button>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.customer_name} · {order.plan_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground/70">
                        {order.stream_name} ({order.server_name})
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm font-medium text-foreground">
                      {order.currency} {order.price}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>{total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <OrderInvoiceDialog order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    </div>
  );
}

function RestrictedNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Access restricted</h1>
      <p className="mt-2 text-sm text-muted-foreground">
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
