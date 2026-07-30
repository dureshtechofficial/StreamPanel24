'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardShell } from '@/components/dashboard-shell';
import { StreamFormPanel } from '@/components/stream-form-panel';
import { StreamDetailsPanel } from '@/components/stream-details-panel';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  PowerIcon,
  SearchIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon,
} from '@/components/icons';
import { toastError, toastSuccess } from '@/lib/toast';
import { getServer } from '@/lib/flussonic-servers-api';
import {
  blockStream,
  createStream,
  deleteStream,
  listStreams,
  restartStream,
  syncStreams,
  unblockStream,
  updateStream,
  type SyncStreamsSummary,
} from '@/lib/flussonic-streams-api';
import { useSyncManualFlags } from '@/lib/use-sync-manual-flags';
import { useStreamDisableActions } from '@/lib/use-stream-disable-actions';
import type { FlussonicServer } from '@/types/flussonic-server';
import type {
  FlussonicStream,
  FlussonicStreamInput,
  FlussonicStreamStatus,
} from '@/types/flussonic-stream';
import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/lib/auth-context';
import { usePageTitle } from '@/lib/use-page-title';
import { liveStatusStyle } from '@/lib/live-status-style';

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<FlussonicStreamStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-muted text-muted-foreground',
};

function StreamsContent({ serverId }: { serverId: string }) {
  const [server, setServer] = useState<FlussonicServer | null>(null);
  usePageTitle(server ? `${server.name} Streams` : 'Streams');

  const [items, setItems] = useState<FlussonicStream[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<FlussonicStreamStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [editingStream, setEditingStream] = useState<FlussonicStream | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FlussonicStream | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsStream, setDetailsStream] = useState<FlussonicStream | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncStreamsSummary | null>(null);
  const syncManualFlags = useSyncManualFlags();
  const [syncError, setSyncError] = useState<string | null>(null);

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
      const [serverResult, streamsResult] = await Promise.all([
        getServer(serverId),
        listStreams(serverId, {
          search: debouncedSearch || undefined,
          status: status || undefined,
          page,
          limit: PAGE_SIZE,
        }),
      ]);
      setServer(serverResult);
      setItems(streamsResult.items);
      setTotal(streamsResult.total);
      setTotalPages(streamsResult.totalPages);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load streams.');
    } finally {
      setIsLoading(false);
    }
  }, [serverId, debouncedSearch, status, page]);

  useEffect(() => {
    // Standard fetch-on-dependency-change effect. isLoading/loadError are reset
    // synchronously so the table shows a loading state immediately on filter/page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const streamActions = useStreamDisableActions(
    (streamId, disabled) => updateStream(serverId, streamId, { disabled }),
    load,
    (streamId) => restartStream(serverId, streamId),
  );

  const [blockingId, setBlockingId] = useState<string | null>(null);

  async function handleBlock(stream: FlussonicStream) {
    setBlockingId(stream.id);
    try {
      await blockStream(serverId, stream.id);
      toastSuccess('Stream blocked', 'It has been disabled and locked.');
      await load();
    } catch (err) {
      toastError(err, 'Failed to block stream.');
    } finally {
      setBlockingId(null);
    }
  }

  async function handleUnblock(stream: FlussonicStream) {
    setBlockingId(stream.id);
    try {
      await unblockStream(serverId, stream.id);
      toastSuccess('Stream unblocked');
      await load();
    } catch (err) {
      toastError(err, 'Failed to unblock stream.');
    } finally {
      setBlockingId(null);
    }
  }

  function openCreate() {
    setEditingStream(null);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  function openEdit(stream: FlussonicStream) {
    setEditingStream(stream);
    setPanelKey((k) => k + 1);
    setPanelOpen(true);
  }

  async function handleSubmit(payload: FlussonicStreamInput) {
    if (editingStream) {
      await updateStream(serverId, editingStream.id, payload);
    } else {
      await createStream(serverId, payload);
    }
    setPanelOpen(false);
    await load();
  }

  async function handleSync() {
    setSyncError(null);
    setSyncSummary(null);
    setIsSyncing(true);
    try {
      const summary = await syncStreams(serverId);
      setSyncSummary(summary);
      await load();
    } catch (err) {
      setSyncError(err instanceof ApiError ? err.message : 'Failed to sync streams.');
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteStream(serverId, pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch {
      setLoadError('Failed to delete stream.');
    } finally {
      setIsDeleting(false);
    }
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="w-full">
      <Link
        href="/dashboard/servers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to servers
      </Link>

      <div className="animate-fade-in-up mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Streams{server ? ` — ${server.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {server
              ? `${server.hostname}:${server.port}`
              : 'Loading server…'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/servers/${serverId}/sessions`}
            className="flex items-center justify-center gap-1.5 rounded-full border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <UsersIcon className="h-4 w-4" />
            Sessions
          </Link>
          <button
            onClick={handleSync}
            disabled={isSyncing || !syncManualFlags.streams}
            title={syncManualFlags.streams ? undefined : 'Manual streams sync is disabled in Settings'}
            className="flex items-center justify-center gap-1.5 rounded-full border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync'}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover"
          >
            <PlusIcon className="h-4 w-4" />
            Add stream
          </button>
        </div>
      </div>

      {syncError && (
        <div className="animate-fade-in-up mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {syncError}
        </div>
      )}

      {streamActions.error && (
        <div className="animate-fade-in-up mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {streamActions.error}
        </div>
      )}

      {syncSummary && (
        <div className="animate-fade-in-up mb-4 rounded-md bg-success-soft px-4 py-3 text-sm text-success">
          Synced {syncSummary.total} stream{syncSummary.total === 1 ? '' : 's'} from the server
          {syncSummary.created > 0 ? ` — ${syncSummary.created} newly imported` : ''}
          {syncSummary.updated > 0 ? `, ${syncSummary.updated} refreshed` : ''}.
        </div>
      )}

      <div
        className="animate-fade-in-up mb-4 flex flex-col gap-3 sm:flex-row"
        style={{ animationDelay: '60ms' }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, title, or ingest domain…"
            className="w-full rounded-lg border border-input py-2 pl-9 pr-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FlussonicStreamStatus | '');
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
        style={{ animationDelay: '120ms' }}
      >
        {isLoading && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">Loading streams…</p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-danger">{loadError}</p>
        )}

        {!isLoading && !loadError && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">No streams found.</p>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <>
            {/* Table — sm and up */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Ingest domain</th>
                    <th className="px-4 py-3 font-medium">Inputs</th>
                    <th className="px-4 py-3 font-medium">Max sessions</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Live status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((stream) => (
                    <tr key={stream.id} className="transition-colors hover:bg-muted">
                      <td className="px-4 py-3 text-muted-foreground">
                        {stream.config_json.title ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {stream.config_json.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{stream.ingest_domain ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {stream.config_json.inputs?.length ?? 0}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {stream.config_json.on_play?.max_sessions ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[stream.status]}`}
                        >
                          {stream.status}
                        </span>
                        {stream.blocked && (
                          <span className="ml-1 inline-block rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                            blocked
                          </span>
                        )}
                        {stream.config_json.disabled && !stream.blocked && (
                          <span className="ml-1 inline-block rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                            disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${liveStatusStyle(stream.live_stats_json?.stats?.status)}`}
                        >
                          {stream.live_stats_json?.stats?.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setDetailsStream(stream);
                              setDetailsOpen(true);
                            }}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`View details for ${stream.config_json.name}`}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(stream)}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`Edit ${stream.config_json.name}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {!stream.blocked &&
                            (stream.config_json.disabled ? (
                            <button
                              onClick={() => streamActions.start(stream.id)}
                              disabled={streamActions.busyId === stream.id}
                              className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-success-soft hover:text-success disabled:opacity-60"
                              aria-label={`Start ${stream.config_json.name}`}
                              title="Start"
                            >
                              <PlayIcon
                                className={`h-4 w-4 ${
                                  streamActions.busyId === stream.id &&
                                  streamActions.busyAction === 'start'
                                    ? 'animate-pulse'
                                    : ''
                                }`}
                              />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => streamActions.disable(stream.id)}
                                disabled={streamActions.busyId === stream.id}
                                className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                                aria-label={`Disable ${stream.config_json.name}`}
                                title="Disable"
                              >
                                <PowerIcon
                                  className={`h-4 w-4 ${
                                    streamActions.busyId === stream.id &&
                                    streamActions.busyAction === 'disable'
                                      ? 'animate-pulse'
                                      : ''
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() => streamActions.restart(stream.id)}
                                disabled={streamActions.busyId === stream.id}
                                className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary disabled:opacity-60"
                                aria-label={`Restart ${stream.config_json.name}`}
                                title="Restart"
                              >
                                <ArrowPathIcon
                                  className={`h-4 w-4 ${
                                    streamActions.busyId === stream.id &&
                                    streamActions.busyAction === 'restart'
                                      ? 'animate-spin'
                                      : ''
                                  }`}
                                />
                              </button>
                            </>
                          ))}
                          {stream.blocked ? (
                            <button
                              onClick={() => handleUnblock(stream)}
                              disabled={blockingId === stream.id}
                              className="rounded-md p-1.5 text-success transition-colors hover:bg-success-soft disabled:opacity-60"
                              aria-label={`Unblock ${stream.config_json.name}`}
                              title="Blocked — click to unblock"
                            >
                              <ShieldIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlock(stream)}
                              disabled={blockingId === stream.id}
                              className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                              aria-label={`Block ${stream.config_json.name}`}
                              title="Block"
                            >
                              <BanIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setPendingDelete(stream)}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger"
                            aria-label={`Delete ${stream.config_json.name}`}
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
              {items.map((stream) => (
                <div key={stream.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {stream.config_json.title ?? stream.config_json.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{stream.config_json.name}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => {
                          setDetailsStream(stream);
                          setDetailsOpen(true);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                        aria-label={`View details for ${stream.config_json.name}`}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(stream)}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                        aria-label={`Edit ${stream.config_json.name}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {!stream.blocked &&
                        (stream.config_json.disabled ? (
                        <button
                          onClick={() => streamActions.start(stream.id)}
                          disabled={streamActions.busyId === stream.id}
                          className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-success-soft hover:text-success disabled:opacity-60"
                          aria-label={`Start ${stream.config_json.name}`}
                          title="Start"
                        >
                          <PlayIcon
                            className={`h-4 w-4 ${
                              streamActions.busyId === stream.id && streamActions.busyAction === 'start'
                                ? 'animate-pulse'
                                : ''
                            }`}
                          />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => streamActions.disable(stream.id)}
                            disabled={streamActions.busyId === stream.id}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                            aria-label={`Disable ${stream.config_json.name}`}
                            title="Disable"
                          >
                            <PowerIcon
                              className={`h-4 w-4 ${
                                streamActions.busyId === stream.id && streamActions.busyAction === 'disable'
                                  ? 'animate-pulse'
                                  : ''
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => streamActions.restart(stream.id)}
                            disabled={streamActions.busyId === stream.id}
                            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary disabled:opacity-60"
                            aria-label={`Restart ${stream.config_json.name}`}
                            title="Restart"
                          >
                            <ArrowPathIcon
                              className={`h-4 w-4 ${
                                streamActions.busyId === stream.id && streamActions.busyAction === 'restart'
                                  ? 'animate-spin'
                                  : ''
                              }`}
                            />
                          </button>
                        </>
                      ))}
                      {stream.blocked ? (
                        <button
                          onClick={() => handleUnblock(stream)}
                          disabled={blockingId === stream.id}
                          className="rounded-md p-1.5 text-success transition-colors hover:bg-success-soft disabled:opacity-60"
                          aria-label={`Unblock ${stream.config_json.name}`}
                          title="Blocked — click to unblock"
                        >
                          <ShieldIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlock(stream)}
                          disabled={blockingId === stream.id}
                          className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                          aria-label={`Block ${stream.config_json.name}`}
                          title="Block"
                        >
                          <BanIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setPendingDelete(stream)}
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger"
                        aria-label={`Delete ${stream.config_json.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-medium capitalize ${STATUS_STYLES[stream.status]}`}
                    >
                      {stream.status}
                    </span>
                    {stream.live_stats_json?.stats?.status && (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 font-medium capitalize ${liveStatusStyle(stream.live_stats_json.stats.status)}`}
                      >
                        {stream.live_stats_json.stats.status}
                      </span>
                    )}
                    {stream.config_json.disabled && (
                      <span className="inline-block rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning">
                        disabled
                      </span>
                    )}
                    <span>{stream.config_json.inputs?.length ?? 0} input(s)</span>
                    {stream.config_json.on_play?.max_sessions !== undefined && (
                      <span>{stream.config_json.on_play.max_sessions} max sessions</span>
                    )}
                    {stream.ingest_domain && <span className="truncate">{stream.ingest_domain}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>{total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}</span>
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

      <StreamFormPanel
        key={panelKey}
        open={panelOpen}
        serverId={serverId}
        stream={editingStream}
        onClose={() => setPanelOpen(false)}
        onSubmit={handleSubmit}
      />

      <StreamDetailsPanel
        open={detailsOpen}
        stream={detailsStream}
        onClose={() => setDetailsOpen(false)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete stream"
        message={`Are you sure you want to delete "${pendingDelete?.config_json.name}"? This can't be undone.`}
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
        Managing Flussonic servers requires an admin account. Contact an administrator if you
        need access.
      </p>
    </div>
  );
}

export default function ServerStreamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardShell>
        {user?.role === 'admin' ? <StreamsContent serverId={id} /> : <RestrictedNotice />}
      </DashboardShell>
    </ProtectedRoute>
  );
}
