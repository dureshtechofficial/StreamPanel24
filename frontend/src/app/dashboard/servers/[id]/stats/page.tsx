'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardShell } from '@/components/dashboard-shell';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/icons';
import { getServer } from '@/lib/flussonic-servers-api';
import { listServerStats, syncServerStats } from '@/lib/flussonic-server-stats-api';
import { formatUptime } from '@/lib/format';
import type { FlussonicServer } from '@/types/flussonic-server';
import type { FlussonicServerStat } from '@/types/flussonic-server-stat';
import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/lib/auth-context';
import { usePageTitle } from '@/lib/use-page-title';
import { useSyncManualFlags } from '@/lib/use-sync-manual-flags';

const PAGE_SIZE = 15;

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-muted text-muted-foreground',
  maintenance: 'bg-warning-soft text-warning',
  unreachable: 'bg-danger-soft text-danger',
};

function formatTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

function formatNumber(value: number | string | null) {
  if (value === null) return '—';
  return value;
}

// Decimal columns (cpu_usage, memory_usage_percent, network_in/out_mbps) come back
// as strings like "39.00" — strip the trailing zeros for display.
function formatDecimal(value: string | null) {
  if (value === null) return '—';
  return Number(value).toString();
}

function formatMemory(stat: FlussonicServerStat) {
  if (stat.memory_usage_percent !== null) return `${formatDecimal(stat.memory_usage_percent)}%`;
  if (stat.ram_usage_mb !== null) return `${stat.ram_usage_mb} MB`;
  return '—';
}

function formatStreams(stat: FlussonicServerStat) {
  if (stat.active_streams === null && stat.total_streams === null) return '—';
  return `${formatNumber(stat.active_streams)} / ${formatNumber(stat.total_streams)}`;
}

function ServerStatsContent({ serverId }: { serverId: string }) {
  const [server, setServer] = useState<FlussonicServer | null>(null);
  usePageTitle(server ? `${server.name} Stats` : 'Server Stats');
  const [items, setItems] = useState<FlussonicServerStat[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncManualFlags = useSyncManualFlags();

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [serverResult, statsResult] = await Promise.all([
        getServer(serverId),
        listServerStats(serverId, { page, limit: PAGE_SIZE }),
      ]);
      setServer(serverResult);
      setItems(statsResult.items);
      setTotal(statsResult.total);
      setTotalPages(statsResult.totalPages);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load stats.');
    } finally {
      setIsLoading(false);
    }
  }, [serverId, page]);

  useEffect(() => {
    // Standard fetch-on-dependency-change effect. isLoading/loadError are reset
    // synchronously so the table shows a loading state immediately on page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSync() {
    setSyncError(null);
    setIsSyncing(true);
    try {
      await syncServerStats(serverId);
      setPage(1);
      await load();
    } catch (err) {
      setSyncError(err instanceof ApiError ? err.message : 'Failed to sync stats.');
    } finally {
      setIsSyncing(false);
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Stats log{server ? ` — ${server.name}` : ''}
            </h1>
            {server && (
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[server.status]}`}
              >
                {server.status}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {server
              ? `${server.hostname}:${server.port}${server.flussonic_version ? ` · v${server.flussonic_version}` : ''}`
              : 'Loading server…'}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing || !syncManualFlags.server_stats}
          title={syncManualFlags.server_stats ? undefined : 'Manual server stats sync is disabled in Settings'}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {syncError && (
        <div className="animate-fade-in-up mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {syncError}
        </div>
      )}

      <div
        className="animate-fade-in-up overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        style={{ animationDelay: '80ms' }}
      >
        {isLoading && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">Loading stats…</p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-danger">{loadError}</p>
        )}

        {!isLoading && !loadError && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground/70">
            No stats recorded yet. Click Sync to pull the latest reading from this server.
          </p>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <>
            {/* Table — sm and up */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">CPU %</th>
                    <th className="px-4 py-3 font-medium">Memory</th>
                    <th className="px-4 py-3 font-medium">Disk (GB)</th>
                    <th className="px-4 py-3 font-medium">Net in/out (Mbps)</th>
                    <th className="px-4 py-3 font-medium">Streams (online/total)</th>
                    <th className="px-4 py-3 font-medium">Clients</th>
                    <th className="px-4 py-3 font-medium">Scheduler load</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Version</th>
                    <th className="px-4 py-3 font-medium">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((stat) => (
                    <tr key={stat.id} className="transition-colors hover:bg-muted">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatTime(stat.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {formatDecimal(stat.cpu_usage)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatMemory(stat)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatNumber(stat.disk_usage_gb)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDecimal(stat.network_in_mbps)} /{" "}
                        {formatDecimal(stat.network_out_mbps)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatStreams(stat)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatNumber(stat.total_clients)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatNumber(stat.scheduler_load)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatNumber(stat.streamer_status)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatNumber(stat.server_version)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatUptime(stat.uptime_seconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — below sm */}
            <div className="divide-y divide-border sm:hidden">
              {items.map((stat) => (
                <div key={stat.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatTime(stat.created_at)}
                    </span>
                    {stat.streamer_status !== null && (
                      <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {stat.streamer_status}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground/70">CPU</p>
                      <p className="font-medium text-foreground">{formatDecimal(stat.cpu_usage)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/70">Memory</p>
                      <p className="font-medium text-foreground">{formatMemory(stat)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/70">Streams</p>
                      <p className="font-medium text-foreground">{formatStreams(stat)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/70">Clients</p>
                      <p className="font-medium text-foreground">
                        {formatNumber(stat.total_clients)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/70">Uptime</p>
                      <p className="font-medium text-foreground">
                        {formatUptime(stat.uptime_seconds)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/70">Version</p>
                      <p className="font-medium text-foreground">
                        {formatNumber(stat.server_version)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Disk {formatNumber(stat.disk_usage_gb)} GB · Net{" "}
                    {formatDecimal(stat.network_in_mbps)}/{formatDecimal(stat.network_out_mbps)}{" "}
                    Mbps · Scheduler {formatNumber(stat.scheduler_load)}
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

export default function ServerStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardShell>
        {user?.role === 'admin' ? <ServerStatsContent serverId={id} /> : <RestrictedNotice />}
      </DashboardShell>
    </ProtectedRoute>
  );
}
