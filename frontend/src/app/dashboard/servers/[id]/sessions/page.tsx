'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardShell } from '@/components/dashboard-shell';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from '@/components/icons';
import { ToggleField } from '@/components/toggle';
import { ExternalLinkIcon } from '@/components/icons';
import { getServer } from '@/lib/flussonic-servers-api';
import { lookupIp } from '@/lib/client-ipwhois';
import {
  listStreamSessions,
  syncStreamSessions,
  type SyncSessionsSummary,
} from '@/lib/flussonic-stream-sessions-api';
import type { FlussonicServer } from '@/types/flussonic-server';
import type { FlussonicStreamSession, IpWhoIsInfo } from '@/types/flussonic-stream-session';
import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/lib/auth-context';
import { usePageTitle } from '@/lib/use-page-title';
import { useSyncManualFlags } from '@/lib/use-sync-manual-flags';

const PAGE_SIZE = 20;

function formatTime(unixSeconds: number | null): string {
  if (unixSeconds === null) return '—';
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

function location(session: FlussonicStreamSession, geo: IpWhoIsInfo | null | undefined): string {
  if (!geo) return session.country ?? '—';
  return [geo.city, geo.region, geo.country ?? session.country].filter(Boolean).join(', ') || '—';
}

function isp(geo: IpWhoIsInfo | null | undefined): string {
  return geo?.connection?.isp ?? geo?.connection?.org ?? '—';
}

function IpCell({ session }: { session: FlussonicStreamSession }) {
  if (!session.ip) return <span>—</span>;
  if (!session.ip_lookup_url) return <span>{session.ip}</span>;
  return (
    <a
      href={session.ip_lookup_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 hover:text-flu-pink"
      title="Look up this IP"
    >
      {session.ip}
      <ExternalLinkIcon className="h-3 w-3" />
    </a>
  );
}

function SessionsContent({ serverId }: { serverId: string }) {
  const [server, setServer] = useState<FlussonicServer | null>(null);
  usePageTitle(server ? `${server.name} Sessions` : 'Stream Sessions');

  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('stream') ?? '';

  const [items, setItems] = useState<FlussonicStreamSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [latestOnly, setLatestOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSessionsSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncManualFlags = useSyncManualFlags();
  const [geoByIp, setGeoByIp] = useState<Record<string, IpWhoIsInfo | null>>({});

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
      const [serverResult, sessionsResult] = await Promise.all([
        getServer(serverId),
        listStreamSessions(serverId, {
          search: debouncedSearch || undefined,
          latestOnly,
          page,
          limit: PAGE_SIZE,
        }),
      ]);
      setServer(serverResult);
      setItems(sessionsResult.items);
      setTotal(sessionsResult.total);
      setTotalPages(sessionsResult.totalPages);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load sessions.');
    } finally {
      setIsLoading(false);
    }
  }, [serverId, debouncedSearch, latestOnly, page]);

  useEffect(() => {
    // Standard fetch-on-dependency-change effect. isLoading/loadError are reset
    // synchronously so the table shows a loading state immediately on filter/page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Client-side geolocation, one lookup per unique IP on the current page —
  // never routed through our backend (see lib/client-ipwhois.ts for why).
  useEffect(() => {
    const ips = [...new Set(items.map((s) => s.ip).filter((ip): ip is string => Boolean(ip)))];
    const unresolved = ips.filter((ip) => !(ip in geoByIp));
    if (unresolved.length === 0) return;

    let cancelled = false;
    Promise.all(unresolved.map((ip) => lookupIp(ip).then((geo) => [ip, geo] as const))).then(
      (results) => {
        if (cancelled) return;
        setGeoByIp((prev) => {
          const next = { ...prev };
          for (const [ip, geo] of results) next[ip] = geo;
          return next;
        });
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function handleSync() {
    setSyncError(null);
    setSyncSummary(null);
    setIsSyncing(true);
    try {
      const summary = await syncStreamSessions(serverId);
      setSyncSummary(summary);
      setPage(1);
      await load();
    } catch (err) {
      setSyncError(err instanceof ApiError ? err.message : 'Failed to sync sessions.');
    } finally {
      setIsSyncing(false);
    }
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="w-full">
      <Link
        href={`/dashboard/servers/${serverId}/streams`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-flu-pink"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to streams
      </Link>

      <div className="animate-fade-in-up mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Sessions{server ? ` — ${server.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {server ? `${server.hostname}:${server.port}` : 'Loading server…'}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing || !syncManualFlags.sessions}
          title={syncManualFlags.sessions ? undefined : 'Manual sessions sync is disabled in Settings'}
          className="flex items-center justify-center gap-1.5 rounded-full bg-flu-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {syncError && (
        <div className="animate-fade-in-up mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {syncError}
        </div>
      )}

      {syncSummary && (
        <div className="animate-fade-in-up mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Synced {syncSummary.total} session{syncSummary.total === 1 ? '' : 's'} from the server
          {syncSummary.created > 0 ? ` — ${syncSummary.created} new` : ''}
          {syncSummary.updated > 0 ? `, ${syncSummary.updated} refreshed` : ''}.
        </div>
      )}

      <div
        className="animate-fade-in-up mb-4 flex flex-col gap-3 sm:flex-row sm:items-center"
        style={{ animationDelay: '60ms' }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by stream name, IP, or country…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
          />
        </div>
        <div className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 sm:w-64">
          <ToggleField
            label="Current sessions only"
            hint="Hide sessions not seen in the last sync"
            checked={latestOnly}
            onChange={(v) => {
              setLatestOnly(v);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div
        className="animate-fade-in-up overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        style={{ animationDelay: '120ms' }}
      >
        {isLoading && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">Loading sessions…</p>
        )}

        {!isLoading && loadError && (
          <p className="px-4 py-10 text-center text-sm text-red-600">{loadError}</p>
        )}

        {!isLoading && !loadError && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">
            No sessions recorded yet. Click Sync to pull the latest sessions from this server.
          </p>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <>
            {/* Table — sm and up */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Stream</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Proto</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">ISP</th>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((session) => {
                    const geo = session.ip ? geoByIp[session.ip] : null;
                    return (
                      <tr key={session.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {session.stream_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 capitalize">
                          {session.type ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 uppercase">
                          {session.proto ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <IpCell session={session} />
                        </td>
                        <td className="px-4 py-3 text-gray-600">{location(session, geo)}</td>
                        <td className="px-4 py-3 text-gray-600">{isp(geo)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {formatTime(session.started_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {formatTime(session.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards — below sm */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {items.map((session) => {
                const geo = session.ip ? geoByIp[session.ip] : null;
                return (
                  <div key={session.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{session.stream_name}</p>
                        <p className="truncate text-xs text-gray-500">
                          <IpCell session={session} />
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                        {session.type ?? '—'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="uppercase">{session.proto ?? '—'}</span>
                      <span>{location(session, geo)}</span>
                      <span>{isp(geo)}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Started {formatTime(session.started_at)} · Updated{' '}
                      {formatTime(session.updated_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

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

export default function ServerSessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardShell>
        {user?.role === 'admin' ? <SessionsContent serverId={id} /> : <RestrictedNotice />}
      </DashboardShell>
    </ProtectedRoute>
  );
}
