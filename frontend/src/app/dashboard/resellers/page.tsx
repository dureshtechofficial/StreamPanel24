"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { ResellerFormPanel } from "@/components/reseller-form-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { WalletTopupDialog } from "@/components/wallet-topup-dialog";
import { WalletTransactionsPanel } from "@/components/wallet-transactions-panel";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  WalletIcon,
} from "@/components/icons";
import {
  createReseller,
  deleteReseller,
  listResellers,
  updateReseller,
} from "@/lib/resellers-api";
import {
  listResellerWalletTransactions,
  topUpResellerWallet,
} from "@/lib/wallet-api";
import type { Reseller, ResellerInput, ResellerStatus } from "@/types/reseller";
import { ApiError } from "@/lib/api-error";
import { useAuth } from "@/lib/auth-context";
import { usePageTitle } from "@/lib/use-page-title";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<ResellerStatus, string> = {
  active: "bg-success-soft text-success",
  suspended: "bg-warning-soft text-warning",
  closed: "bg-muted text-muted-foreground",
};

function ResellersContent() {
  usePageTitle("Resellers");
  const [items, setItems] = useState<Reseller[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<ResellerStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Reseller | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [topupTarget, setTopupTarget] = useState<Reseller | null>(null);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Reseller | null>(null);

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
      const result = await listResellers({
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
        err instanceof ApiError ? err.message : "Failed to load resellers.",
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
    setEditingReseller(null);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  function openEdit(reseller: Reseller) {
    setEditingReseller(reseller);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  async function handleSubmit(payload: ResellerInput) {
    if (editingReseller) {
      await updateReseller(editingReseller.id, payload);
    } else {
      await createReseller(payload);
    }
    setPanelOpen(false);
    await load();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteReseller(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch {
      setLoadError("Failed to delete reseller.");
    } finally {
      setIsDeleting(false);
    }
  }

  const loadWalletHistory = useCallback(
    (p: number, limit: number) => {
      if (!historyTarget) return Promise.reject(new Error("No reseller selected"));
      return listResellerWalletTransactions(historyTarget.id, { page: p, limit });
    },
    [historyTarget],
  );

  async function handleTopup(amount: number, remark: string) {
    if (!topupTarget) return;
    setIsToppingUp(true);
    try {
      await topUpResellerWallet(topupTarget.id, {
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Resellers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reseller accounts — each reseller manages their own customers.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover"
        >
          <PlusIcon className="h-4 w-4" />
          Add reseller
        </button>
      </div>

      <div
        className="animate-fade-in-up mb-4 flex flex-col gap-3 sm:flex-row"
        style={{ animationDelay: "60ms" }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or company…"
            className="w-full rounded-lg border border-input py-2 pl-9 pr-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ResellerStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div
        className="animate-fade-in-up overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        {isLoading && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">Loading resellers…</p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-danger">{loadError}</p>
        )}

        {!isLoading && !loadError && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">No resellers found.</p>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <>
            {/* Table — sm and up */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
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
                <tbody className="divide-y divide-border">
                  {items.map((reseller) => (
                    <tr
                      key={reseller.id}
                      className="transition-colors hover:bg-muted"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {reseller.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{reseller.phone}</div>
                        {reseller.email && (
                          <div className="text-xs text-muted-foreground/70">
                            {reseller.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {reseller.company_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[reseller.city, reseller.state]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setHistoryTarget(reseller)}
                          className="font-medium text-foreground underline decoration-dotted underline-offset-2 hover:text-primary"
                          title="View transaction history"
                        >
                          {Number(reseller.wallet_balance).toFixed(2)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[reseller.status]}`}
                        >
                          {reseller.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setTopupTarget(reseller)}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`Top up ${reseller.name}'s wallet`}
                            title="Top up wallet"
                          >
                            <WalletIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(reseller)}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`Edit ${reseller.name}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(reseller)}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger"
                            aria-label={`Delete ${reseller.name}`}
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

            {/* Cards — below sm */}
            <div className="divide-y divide-border sm:hidden">
              {items.map((reseller) => (
                <div key={reseller.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{reseller.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{reseller.phone}</p>
                      {reseller.email && (
                        <p className="truncate text-xs text-muted-foreground/70">{reseller.email}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setTopupTarget(reseller)}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                        aria-label={`Top up ${reseller.name}'s wallet`}
                      >
                        <WalletIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(reseller)}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                        aria-label={`Edit ${reseller.name}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setPendingDelete(reseller)}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger"
                        aria-label={`Delete ${reseller.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-medium capitalize ${STATUS_STYLES[reseller.status]}`}
                    >
                      {reseller.status}
                    </span>
                    <button
                      onClick={() => setHistoryTarget(reseller)}
                      className="font-medium text-foreground underline decoration-dotted underline-offset-2"
                    >
                      Wallet: {Number(reseller.wallet_balance).toFixed(2)}
                    </button>
                    {reseller.company_name && <span>{reseller.company_name}</span>}
                    {[reseller.city, reseller.state].filter(Boolean).length > 0 && (
                      <span>{[reseller.city, reseller.state].filter(Boolean).join(", ")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>
            {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
          </span>
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

      <ResellerFormPanel
        key={panelKey}
        open={panelOpen}
        reseller={editingReseller}
        onClose={() => setPanelOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete reseller"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        isBusy={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
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

function RestrictedNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Access restricted</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Managing resellers requires an admin account. Contact an administrator
        if you need access.
      </p>
    </div>
  );
}

export default function ResellersPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardShell>
        {user?.role === "admin" ? <ResellersContent /> : <RestrictedNotice />}
      </DashboardShell>
    </ProtectedRoute>
  );
}
