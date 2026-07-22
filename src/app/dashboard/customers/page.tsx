"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { CustomerFormPanel } from "@/components/customer-form-panel";
import { CustomerStreamsPanel } from "@/components/customer-streams-panel";
import { CustomerAssignedStreamsPanel } from "@/components/customer-assigned-streams-panel";
import { OrdersPanel } from "@/components/orders-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { WalletTopupDialog } from "@/components/wallet-topup-dialog";
import { WalletTransactionsPanel } from "@/components/wallet-transactions-panel";
import {
  BroadcastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  TrashIcon,
  WalletIcon,
} from "@/components/icons";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/customers-api";
import {
  listCustomerWalletTransactions,
  topUpCustomerWallet,
} from "@/lib/customer-wallet-api";
import type { Customer, CustomerInput, CustomerStatus } from "@/types/customer";
import { ApiError } from "@/lib/api-error";
import { usePageTitle } from "@/lib/use-page-title";
import { useAdminOrderCancelEnabled } from "@/lib/use-order-cancel-enabled";
import { useAdminCustomerActionFlags } from "@/lib/use-customer-action-flags";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<CustomerStatus, string> = {
  active: "bg-green-50 text-green-700",
  suspended: "bg-amber-50 text-amber-700",
  closed: "bg-gray-100 text-gray-600",
};

function CustomersContent() {
  usePageTitle("Customers");
  const orderCancelEnabled = useAdminOrderCancelEnabled();
  const customerActionFlags = useAdminCustomerActionFlags();
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [streamsCustomer, setStreamsCustomer] = useState<Customer | null>(null);
  const [ordersCustomer, setOrdersCustomer] = useState<Customer | null>(null);
  const [viewStreamsCustomer, setViewStreamsCustomer] = useState<Customer | null>(null);
  const [topupTarget, setTopupTarget] = useState<Customer | null>(null);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Customer | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listCustomers({
        search: debouncedSearch || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load customers.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    // Standard fetch-on-dependency-change effect. isLoading/loadError are reset
    // synchronously so the table shows a loading state immediately on filter/page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function openCreate() {
    setEditingCustomer(null);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  async function handleSubmit(payload: CustomerInput) {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, payload);
    } else {
      await createCustomer(payload);
    }
    setPanelOpen(false);
    await load();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch {
      setLoadError("Failed to delete customer.");
    } finally {
      setIsDeleting(false);
    }
  }

  const loadWalletHistory = useCallback(
    (p: number, limit: number) => {
      if (!historyTarget) return Promise.reject(new Error("No customer selected"));
      return listCustomerWalletTransactions(historyTarget.id, { page: p, limit });
    },
    [historyTarget],
  );

  async function handleTopup(amount: number, remark: string) {
    if (!topupTarget) return;
    setIsToppingUp(true);
    try {
      await topUpCustomerWallet(topupTarget.id, {
        amount,
        remark: remark || undefined,
      });
      setTopupTarget(null);
      await load();
    } finally {
      setIsToppingUp(false);
    }
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="w-full">
      <div className="animate-fade-in-up mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Customers
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your customer accounts.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 rounded-full bg-flu-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark"
        >
          <PlusIcon className="h-4 w-4" />
          Add customer
        </button>
      </div>

      <div
        className="animate-fade-in-up mb-4 flex flex-col gap-3 sm:flex-row"
        style={{ animationDelay: "60ms" }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or company…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CustomerStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div
        className="animate-fade-in-up overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        {isLoading && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">Loading customers…</p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-red-600">{loadError}</p>
        )}

        {!isLoading && !loadError && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">No customers found.</p>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <>
            {/* Table — sm and up */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Wallet</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{customer.phone}</div>
                        {customer.email && (
                          <div className="text-xs text-gray-400">
                            {customer.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {customer.company_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {[customer.city, customer.state]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setHistoryTarget(customer)}
                          className="font-medium text-gray-900 underline decoration-dotted underline-offset-2 hover:text-flu-pink"
                          title="View transaction history"
                        >
                          {Number(customer.wallet_balance).toFixed(2)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[customer.status]}`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setOrdersCustomer(customer)}
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                            aria-label={`View orders for ${customer.name}`}
                          >
                            <ReceiptIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setViewStreamsCustomer(customer)}
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                            aria-label={`View streams assigned to ${customer.name}`}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setTopupTarget(customer)}
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                            aria-label={`Top up ${customer.name}'s wallet`}
                            title="Top up wallet"
                          >
                            <WalletIcon className="h-4 w-4" />
                          </button>
                          {customerActionFlags.assign && (
                            <button
                              onClick={() => setStreamsCustomer(customer)}
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                              aria-label={`Assign streams to ${customer.name}`}
                            >
                              <BroadcastIcon className="h-4 w-4" />
                            </button>
                          )}
                          {customerActionFlags.edit && (
                            <button
                              onClick={() => openEdit(customer)}
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                              aria-label={`Edit ${customer.name}`}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {customerActionFlags.delete && (
                            <button
                              onClick={() => setPendingDelete(customer)}
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label={`Delete ${customer.name}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — below sm */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {items.map((customer) => (
                <div key={customer.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{customer.name}</p>
                      <p className="truncate text-xs text-gray-500">{customer.phone}</p>
                      {customer.email && (
                        <p className="truncate text-xs text-gray-400">{customer.email}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setOrdersCustomer(customer)}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                        aria-label={`View orders for ${customer.name}`}
                      >
                        <ReceiptIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewStreamsCustomer(customer)}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                        aria-label={`View streams assigned to ${customer.name}`}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setTopupTarget(customer)}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                        aria-label={`Top up ${customer.name}'s wallet`}
                      >
                        <WalletIcon className="h-4 w-4" />
                      </button>
                      {customerActionFlags.assign && (
                        <button
                          onClick={() => setStreamsCustomer(customer)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                          aria-label={`Assign streams to ${customer.name}`}
                        >
                          <BroadcastIcon className="h-4 w-4" />
                        </button>
                      )}
                      {customerActionFlags.edit && (
                        <button
                          onClick={() => openEdit(customer)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                          aria-label={`Edit ${customer.name}`}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {customerActionFlags.delete && (
                        <button
                          onClick={() => setPendingDelete(customer)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${customer.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-medium capitalize ${STATUS_STYLES[customer.status]}`}
                    >
                      {customer.status}
                    </span>
                    <button
                      onClick={() => setHistoryTarget(customer)}
                      className="font-medium text-gray-700 underline decoration-dotted underline-offset-2"
                    >
                      Wallet: {Number(customer.wallet_balance).toFixed(2)}
                    </button>
                    {customer.company_name && <span>{customer.company_name}</span>}
                    {[customer.city, customer.state].filter(Boolean).length > 0 && (
                      <span>{[customer.city, customer.state].filter(Boolean).join(", ")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          <span>
            {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
          </span>
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

      <CustomerFormPanel
        key={panelKey}
        open={panelOpen}
        customer={editingCustomer}
        onClose={() => setPanelOpen(false)}
        onSubmit={handleSubmit}
        showResellerField
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete customer"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        isBusy={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <CustomerStreamsPanel
        open={streamsCustomer !== null}
        customer={streamsCustomer}
        onClose={() => setStreamsCustomer(null)}
      />

      <CustomerAssignedStreamsPanel
        open={viewStreamsCustomer !== null}
        customer={viewStreamsCustomer}
        onClose={() => setViewStreamsCustomer(null)}
      />

      <OrdersPanel
        open={ordersCustomer !== null}
        customer={ordersCustomer}
        onClose={() => setOrdersCustomer(null)}
        cancelEnabled={orderCancelEnabled}
      />

      <WalletTopupDialog
        open={topupTarget !== null}
        entityName={topupTarget?.name ?? ""}
        isBusy={isToppingUp}
        onSubmit={handleTopup}
        onCancel={() => setTopupTarget(null)}
      />

      <WalletTransactionsPanel
        open={historyTarget !== null}
        title={`${historyTarget?.name ?? ""} — Wallet history`}
        loadPage={loadWalletHistory}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <DashboardShell>
        <CustomersContent />
      </DashboardShell>
    </ProtectedRoute>
  );
}
