'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FlussonicStreamSession, IpWhoIsInfo } from '@/types/flussonic-stream-session';
import type { PaginatedResult } from '@/types/pagination';
import { ApiError } from '@/lib/api-error';
import { lookupIp } from '@/lib/client-ipwhois';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, XIcon } from './icons';

const PAGE_SIZE = 20;
// Sessions are always filtered to "still live as of the last sync" here —
// this panel (customer/reseller portals) has no toggle for historical
// sessions, unlike the admin per-server sessions page.
const LATEST_ONLY = true;
const AUTO_REFRESH_INTERVAL_MS = 30_000;

function formatTime(unixSeconds: number | null): string {
  if (unixSeconds === null) return '—';
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

function formatDuration(startedAt: number | null, updatedAt: number | null): string {
  if (startedAt === null || updatedAt === null || updatedAt < startedAt) return '—';
  const totalSeconds = updatedAt - startedAt;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function location(session: FlussonicStreamSession, geo: IpWhoIsInfo | null | undefined): string {
  if (!geo) return session.country ?? '—';
  return [geo.city, geo.region, geo.country ?? session.country].filter(Boolean).join(', ') || '—';
}

function isp(geo: IpWhoIsInfo | null | undefined): string {
  return geo?.connection?.isp ?? geo?.connection?.org ?? '—';
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 wrap-break-word text-xs text-gray-700">{value}</p>
    </div>
  );
}

export function StreamSessionsPanel({
  open,
  streamId,
  streamName,
  onClose,
  listSessions,
}: {
  open: boolean;
  streamId: string | null;
  streamName: string | null;
  onClose: () => void;
  listSessions: (
    streamId: string,
    params: { page?: number; limit?: number; latestOnly?: boolean },
  ) => Promise<PaginatedResult<FlussonicStreamSession>>;
}) {
  const [items, setItems] = useState<FlussonicStreamSession[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [geoByIp, setGeoByIp] = useState<Record<string, IpWhoIsInfo | null>>({});

  // Reset to page 1 each time the panel is (re-)opened for a (possibly different) stream.
  const [prevStreamId, setPrevStreamId] = useState<string | null>(streamId);
  if (open && streamId !== prevStreamId) {
    setPrevStreamId(streamId);
    if (page !== 1) setPage(1);
  }

  const load = useCallback(
    // `silent` keeps the existing list/map on screen while refreshing in the
    // background (auto-refresh, manual refresh button) instead of blanking
    // everything behind a full loading state (only used for the initial
    // load and page/stream changes, where there's nothing worth keeping).
    async (id: string, targetPage: number, silent = false) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setLoadError(null);
      try {
        const result = await listSessions(id, {
          page: targetPage,
          limit: PAGE_SIZE,
          latestOnly: LATEST_ONLY,
        });
        setItems(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load sessions.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [listSessions],
  );

  useEffect(() => {
    if (!open || !streamId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(streamId, page);
  }, [open, streamId, page, load]);

  // Auto-refresh the current page every 30s while the panel is open, without
  // blanking the list/map in the meantime.
  useEffect(() => {
    if (!open || !streamId) return;
    const timer = setInterval(() => {
      load(streamId, page, true);
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [open, streamId, page, load]);

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

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Sessions</h2>
            <p className="text-xs text-gray-500">
              {streamName}
              {!isLoading && !loadError && (
                <span className="text-gray-400"> · {total} total</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => streamId && load(streamId, page, true)}
              disabled={isLoading || isRefreshing}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
              aria-label="Refresh sessions"
              title="Refresh"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close panel"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Loading sessions…
            </p>
          )}

          {!isLoading && loadError && <p className="text-sm text-red-600">{loadError}</p>}

          {!isLoading && !loadError && items.length === 0 && (
            <p className="text-sm text-gray-400">No sessions recorded for this stream yet.</p>
          )}

          {!isLoading && !loadError && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((session) => {
                const geo = session.ip ? geoByIp[session.ip] : null;
                return (
                  <li key={session.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium capitalize text-gray-900">
                        {session.type ?? '—'}
                        {session.proto && (
                          <span className="ml-1.5 text-xs font-normal uppercase text-gray-400">
                            {session.proto}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-xs text-gray-500">{session.ip ?? '—'}</span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-50 pt-2">
                      <DetailField label="Location" value={location(session, geo)} />
                      <DetailField label="ISP / Org" value={isp(geo)} />
                      <DetailField label="Started" value={formatTime(session.started_at)} />
                      <DetailField label="Last updated" value={formatTime(session.updated_at)} />
                      <DetailField
                        label="Duration"
                        value={formatDuration(session.started_at, session.updated_at)}
                      />
                      <DetailField label="Session ID" value={session.session_uuid} />
                    </div>

                    {session.ip_lookup_url && (
                      <a
                        href={session.ip_lookup_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-flu-pink hover:text-flu-pink-dark"
                      >
                        Look up IP
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!isLoading && !loadError && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Prev
            </button>
            <span className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
