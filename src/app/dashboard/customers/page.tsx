"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { CustomerFormPanel } from "@/components/customer-form-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/customers-api";
import type { Customer, CustomerInput, CustomerStatus } from "@/types/customer";
import { ApiError } from "@/lib/api-error";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<CustomerStatus, string> = {
  active: "bg-green-50 text-green-700",
  suspended: "bg-amber-50 text-amber-700",
  closed: "bg-gray-100 text-gray-600",
};

function CustomersContent() {
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    Loading customers…
                  </td>
                </tr>
              )}

              {!isLoading && loadError && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-red-600"
                  >
                    {loadError}
                  </td>
                </tr>
              )}

              {!isLoading && !loadError && items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    No customers found.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !loadError &&
                items.map((customer) => (
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
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[customer.status]}`}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(customer)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                          aria-label={`Edit ${customer.name}`}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(customer)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${customer.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

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
