'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardShell } from '@/components/dashboard-shell';
import { ServerFormPanel } from '@/components/server-form-panel';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '@/components/icons';
import {
  createServer,
  deleteServer,
  listServers,
  updateServer,
} from '@/lib/flussonic-servers-api';
import type {
  FlussonicServer,
  FlussonicServerInput,
  FlussonicServerStatus,
} from '@/types/flussonic-server';
import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/lib/auth-context';

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<FlussonicServerStatus, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  maintenance: 'bg-amber-50 text-amber-700',
  unreachable: 'bg-red-50 text-red-700',
};

function ServersContent() {
  const [items, setItems] = useState<FlussonicServer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<FlussonicServerStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [editingServer, setEditingServer] = useState<FlussonicServer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FlussonicServer | null>(null);
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
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load servers.');
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
    setPanelOpen(false);
    await load();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteServer(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch {
      setLoadError('Failed to delete server.');
    } finally {
      setIsDeleting(false);
    }
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="animate-fade-in-up mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Flussonic servers
          </h1>
          <p className="mt-1 text-sm text-gray-500">Manage registered media servers.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-1.5 rounded-full bg-flu-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark"
        >
          <PlusIcon className="h-4 w-4" />
          Add server
        </button>
      </div>

      <div
        className="animate-fade-in-up mb-4 flex flex-col gap-3 sm:flex-row"
        style={{ animationDelay: '60ms' }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, hostname, or domain…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FlussonicServerStatus | '');
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="unreachable">Unreachable</option>
        </select>
      </div>

      <div
        className="animate-fade-in-up overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        style={{ animationDelay: '120ms' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">API version</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    Loading servers…
                  </td>
                </tr>
              )}

              {!isLoading && loadError && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-red-600">
                    {loadError}
                  </td>
                </tr>
              )}

              {!isLoading && !loadError && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    No servers found.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !loadError &&
                items.map((server) => (
                  <tr key={server.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{server.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>
                        {server.hostname}:{server.port}
                      </div>
                      <div className="text-xs text-gray-400">
                        {server.use_ssl ? 'SSL enabled' : 'No SSL'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{server.domain ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 uppercase">{server.api_version_tag}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[server.status]}`}
                      >
                        {server.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(server)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                          aria-label={`Edit ${server.name}`}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(server)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
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

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          <span>{total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}</span>
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
    <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900">Access restricted</h1>
      <p className="mt-2 text-sm text-gray-500">
        Managing Flussonic servers requires an admin account. Contact an administrator if you
        need access.
      </p>
    </div>
  );
}

export default function ServersPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardShell>{user?.role === 'admin' ? <ServersContent /> : <RestrictedNotice />}</DashboardShell>
    </ProtectedRoute>
  );
}
