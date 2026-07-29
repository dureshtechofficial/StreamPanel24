"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlanFormPanel } from "@/components/plan-form-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";
import { createPlan, deletePlan, listPlans, updatePlan } from "@/lib/plans-api";
import type { Plan, PlanInput, PlanStatus } from "@/types/plan";
import { ApiError } from "@/lib/api-error";
import { toastSuccess, toastError } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";
import { usePageTitle } from "@/lib/use-page-title";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<PlanStatus, string> = {
  active: "bg-success-soft text-success",
  inactive: "bg-muted text-muted-foreground",
};

function formatMoney(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : value;
}

function PlansContent() {
  usePageTitle("Plans");
  const [items, setItems] = useState<Plan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<PlanStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Plan | null>(null);
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
      const result = await listPlans({
        search: debouncedSearch || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load plans.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function openCreate() {
    setEditingPlan(null);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  async function handleSubmit(payload: PlanInput) {
    if (editingPlan) {
      await updatePlan(editingPlan.id, payload);
    } else {
      await createPlan(payload);
    }
    toastSuccess(editingPlan ? "Plan updated" : "Plan created");
    setPanelOpen(false);
    await load();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deletePlan(pendingDelete.id);
      toastSuccess("Plan deleted");
      setPendingDelete(null);
      await load();
    } catch (err) {
      toastError(err, "Failed to delete plan.");
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscription plans shared by customers and resellers.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover"
        >
          <PlusIcon className="h-4 w-4" />
          Add plan
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
            placeholder="Search by name or description…"
            className="w-full rounded-lg border border-input py-2 pl-9 pr-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PlanStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div
        className="animate-fade-in-up overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        {isLoading && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">Loading plans…</p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-danger">{loadError}</p>
        )}

        {!isLoading && !loadError && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">No plans found.</p>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <>
            {/* Table — sm and up */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">MRP</th>
                    <th className="px-4 py-3 font-medium">Customer price</th>
                    <th className="px-4 py-3 font-medium">Reseller price</th>
                    <th className="px-4 py-3 font-medium">Limits</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((plan) => (
                    <tr key={plan.id} className="transition-colors hover:bg-muted">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {plan.name}
                        {!plan.show_customer && !plan.show_reseller && (
                          <span className="ml-2 text-xs text-muted-foreground/70">(hidden)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatMoney(plan.mrp)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatMoney(plan.customer_price)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatMoney(plan.reseller_price)}
                        <span className="ml-1 text-xs text-muted-foreground/70">
                          (-{formatMoney(plan.reseller_percentage)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {plan.max_streams} stream{plan.max_streams === 1 ? "" : "s"} ·{" "}
                        {plan.max_connections} conn
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[plan.status]}`}
                        >
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(plan)}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`Edit ${plan.name}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(plan)}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger"
                            aria-label={`Delete ${plan.name}`}
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
              {items.map((plan) => (
                <div key={plan.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{plan.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        MRP {formatMoney(plan.mrp)} · Customer {formatMoney(plan.customer_price)} ·
                        Reseller {formatMoney(plan.reseller_price)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => openEdit(plan)}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                        aria-label={`Edit ${plan.name}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setPendingDelete(plan)}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger"
                        aria-label={`Delete ${plan.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-medium capitalize ${STATUS_STYLES[plan.status]}`}
                    >
                      {plan.status}
                    </span>
                    <span>
                      {plan.max_streams} stream{plan.max_streams === 1 ? "" : "s"} ·{" "}
                      {plan.max_connections} conn
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

      <PlanFormPanel
        key={panelKey}
        open={panelOpen}
        plan={editingPlan}
        onClose={() => setPanelOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete plan"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        isBusy={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function RestrictedNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Access restricted</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Managing plans requires an admin account. Contact an administrator if
        you need access.
      </p>
    </div>
  );
}

export default function PlansPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardShell>
        {user?.role === "admin" ? <PlansContent /> : <RestrictedNotice />}
      </DashboardShell>
    </ProtectedRoute>
  );
}
