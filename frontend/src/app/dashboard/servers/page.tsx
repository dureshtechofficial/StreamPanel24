"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { ServerFormPanel } from "@/components/server-form-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ArrowPathIcon,
  BroadcastIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";
import {
  createServer,
  deleteServer,
  listServers,
  syncAllServers,
  updateServer,
  type SyncAllSummary,
} from "@/lib/flussonic-servers-api";
import type {
  FlussonicServer,
  FlussonicServerInput,
  FlussonicServerStatus,
} from "@/types/flussonic-server";
import { ApiError } from "@/lib/api-error";
import { toastSuccess, toastError } from "@/lib/toast";
import { formatUptime } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { usePageTitle } from "@/lib/use-page-title";
import { useSyncManualFlags } from "@/lib/use-sync-manual-flags";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<FlussonicServerStatus, string> = {
  active: "bg-success-soft text-success",
  inactive: "bg-muted text-muted-foreground",
  maintenance: "bg-warning-soft text-warning",
  unreachable: "bg-danger-soft text-danger",
};

function ServersContent() {
  usePageTitle("Servers");
  const [items, setItems] = useState<FlussonicServer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<FlussonicServerStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [editingServer, setEditingServer] = useState<FlussonicServer | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<FlussonicServer | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncAllSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncManualFlags = useSyncManualFlags();
  const anyManualSyncEnabled =
    syncManualFlags.server_stats || syncManualFlags.streams || syncManualFlags.sessions;

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
      const result = await listServers({
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
        err instanceof ApiError ? err.message : "Failed to load servers.",
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
    setEditingServer(null);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  function openEdit(server: FlussonicServer) {
    setEditingServer(server);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  async function handleSubmit(payload: FlussonicServerInput) {
    if (editingServer) {
      await updateServer(editingServer.id, payload);
    } else {
      await createServer(payload);
    }
    toastSuccess(editingServer ? "Server updated" : "Server created");
    setPanelOpen(false);
    await load();
  }

  async function handleSyncAll() {
    setSyncError(null);
    setSyncSummary(null);
    setIsSyncingAll(true);
    try {
      const summary = await syncAllServers();
      setSyncSummary(summary);
      toastSuccess("Servers synced");
      await load();
    } catch (err) {
      setSyncError(
        err instanceof ApiError ? err.message : "Failed to sync servers.",
      );
      toastError(err, "Failed to sync servers.");
    } finally {
      setIsSyncingAll(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteServer(pendingDelete.id);
      toastSuccess("Server deleted");
      setPendingDelete(null);
      await load();
    } catch (err) {
      toastError(err, "Failed to delete server.");
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Servers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage registered media servers.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll || !anyManualSyncEnabled}
            title={
              anyManualSyncEnabled
                ? undefined
                : "All manual syncs are disabled in Settings"
            }
            className="flex items-center justify-center gap-1.5 rounded-full border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${isSyncingAll ? "animate-spin" : ""}`}
            />
            {isSyncingAll ? "Syncing…" : "Sync all"}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover"
          >
            <PlusIcon className="h-4 w-4" />
            Add server
          </button>
        </div>
      </div>

      {syncError && (
        <div className="animate-fade-in-up mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {syncError}
        </div>
      )}

      {syncSummary && (() => {
        const failures = syncSummary.results.flatMap((r) => {
          const items: { serverId: string; name: string; type: string; error?: string }[] = [];
          if (!r.stats.ok) items.push({ serverId: r.serverId, name: r.name, type: "stats", error: r.stats.error });
          if (!r.streams.ok) items.push({ serverId: r.serverId, name: r.name, type: "streams", error: r.streams.error });
          if (!r.sessions.ok) items.push({ serverId: r.serverId, name: r.name, type: "sessions", error: r.sessions.error });
          return items;
        });
        return (
          <div
            className={`animate-fade-in-up mb-4 rounded-md px-4 py-3 text-sm ${
              failures.length === 0
                ? "bg-success-soft text-success"
                : "bg-warning-soft text-warning"
            }`}
          >
            <p>
              Synced stats, streams, and sessions for {syncSummary.total} server
              {syncSummary.total === 1 ? "" : "s"}
              {failures.length > 0 ? `, ${failures.length} issue${failures.length === 1 ? "" : "s"}` : ""}.
            </p>
            {failures.length > 0 && (
              <ul className="mt-1 list-inside list-disc">
                {failures.map((f, i) => (
                  <li key={`${f.serverId}-${f.type}-${i}`}>
                    {f.name} ({f.type}): {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}

      <div
        className="animate-fade-in-up mb-4 flex flex-col gap-3 sm:flex-row"
        style={{ animationDelay: "60ms" }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, hostname, or domain…"
            className="w-full rounded-lg border border-input py-2 pl-9 pr-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FlussonicServerStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="unreachable">Unreachable</option>
        </select>
      </div>

      <div
        className="animate-fade-in-up overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        {isLoading && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">Loading servers…</p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-danger">{loadError}</p>
        )}

        {!isLoading && !loadError && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">No servers found.</p>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <>
            {/* Table — sm and up */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Address</th>
                    <th className="px-4 py-3 font-medium">Domain</th>
                    <th className="px-4 py-3 font-medium">API version</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Clients</th>
                    <th className="px-4 py-3 font-medium">Uptime</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((server) => (
                    <tr
                      key={server.id}
                      className="transition-colors hover:bg-muted"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {server.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>
                          {server.hostname}:{server.port}
                        </div>
                        <div className="text-xs text-muted-foreground/70">
                          {server.use_ssl ? "SSL enabled" : "No SSL"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {server.domain ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground uppercase">
                        {server.api_version_tag}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[server.status]}`}
                        >
                          {server.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {server.last_total_clients ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatUptime(server.last_uptime_seconds)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/dashboard/servers/${server.id}/streams`}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`View streams for ${server.name}`}
                          >
                            <BroadcastIcon className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/servers/${server.id}/stats`}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`View stats for ${server.name}`}
                          >
                            <ChartBarIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => openEdit(server)}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`Edit ${server.name}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(server)}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger"
                            aria-label={`Delete ${server.name}`}
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
              {items.map((server) => (
                <div key={server.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{server.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {server.hostname}:{server.port} · {server.use_ssl ? "SSL" : "No SSL"}
                      </p>
                      {server.domain && (
                        <p className="truncate text-xs text-muted-foreground/70">{server.domain}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Link
                        href={`/dashboard/servers/${server.id}/streams`}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                        aria-label={`View streams for ${server.name}`}
                      >
                        <BroadcastIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/dashboard/servers/${server.id}/stats`}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                        aria-label={`View stats for ${server.name}`}
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(server)}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                        aria-label={`Edit ${server.name}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setPendingDelete(server)}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger"
                        aria-label={`Delete ${server.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-medium capitalize ${STATUS_STYLES[server.status]}`}
                    >
                      {server.status}
                    </span>
                    <span className="uppercase">{server.api_version_tag}</span>
                    <span>{server.last_total_clients ?? "—"} clients</span>
                    <span>{formatUptime(server.last_uptime_seconds)} uptime</span>
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

      <ServerFormPanel
        key={panelKey}
        open={panelOpen}
        server={editingServer}
        onClose={() => setPanelOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete server"
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
        Managing Flussonic servers requires an admin account. Contact an
        administrator if you need access.
      </p>
    </div>
  );
}

export default function ServersPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardShell>
        {user?.role === "admin" ? <ServersContent /> : <RestrictedNotice />}
      </DashboardShell>
    </ProtectedRoute>
  );
}
