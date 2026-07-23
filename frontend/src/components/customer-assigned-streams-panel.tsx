'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listCustomerStreams } from '@/lib/customer-streams-api';
import { getStream, updateStream } from '@/lib/flussonic-streams-api';
import { useStreamDisableActions } from '@/lib/use-stream-disable-actions';
import { liveStatusStyle } from '@/lib/live-status-style';
import { StreamDetailsPanel } from './stream-details-panel';
import { StreamSessionsPanel } from './stream-sessions-panel';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { FlussonicStream } from '@/types/flussonic-stream';
import type { FlussonicStreamSession } from '@/types/flussonic-stream-session';
import type { PaginatedResult } from '@/types/pagination';
import type { Customer } from '@/types/customer';
import { ApiError } from '@/lib/api-error';
import { ArrowPathIcon, EyeIcon, PlayIcon, PowerIcon, UsersIcon, XIcon } from './icons';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export interface CustomerAssignedStreamsPanelApi {
  listCustomerStreams: (customerId: string) => Promise<FlussonicStreamDirectoryEntry[]>;
  /** Omit to hide the "view details" action entirely (shown whenever this is provided). */
  getStreamDetails?: (serverId: string, streamId: string) => Promise<FlussonicStream>;
  /** Omit to hide the "disable"/"restart" actions entirely (shown whenever this is provided). */
  setStreamDisabled?: (serverId: string, streamId: string, disabled: boolean) => Promise<unknown>;
}

const DEFAULT_API: CustomerAssignedStreamsPanelApi = {
  listCustomerStreams,
  getStreamDetails: getStream,
  setStreamDisabled: (serverId, streamId, disabled) =>
    updateStream(serverId, streamId, { disabled }),
};

export function CustomerAssignedStreamsPanel({
  open,
  customer,
  onClose,
  api = DEFAULT_API,
  showSessions = true,
  showRawData = true,
  sessionsApi,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  /** Defaults to the admin-scoped API (/customers/:id/streams) — pass the reseller-scoped equivalent to reuse this panel elsewhere. */
  api?: CustomerAssignedStreamsPanelApi;
  /** Whether to show the "sessions" action at all. */
  showSessions?: boolean;
  /** The raw sync JSON in the stream-details view is internal debugging info — the reseller portal passes false. */
  showRawData?: boolean;
  /**
   * When provided (the reseller portal), clicking "Sessions" opens an inline
   * read-only panel using this reseller-scoped endpoint. When omitted (the
   * admin default), it navigates to the full admin sessions page instead —
   * the admin portal has no equivalent inline panel need since it already
   * has a dedicated per-server sessions page.
   */
  sessionsApi?: (
    streamId: string,
    params: { page?: number; limit?: number; latestOnly?: boolean },
  ) => Promise<PaginatedResult<FlussonicStreamSession>>;
}) {
  const router = useRouter();
  const [streams, setStreams] = useState<FlussonicStreamDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewingStream, setViewingStream] = useState<FlussonicStream | null>(null);
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [sessionsStream, setSessionsStream] = useState<FlussonicStreamDirectoryEntry | null>(null);

  const load = useCallback(async () => {
    if (!customer) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await api.listCustomerStreams(customer.id);
      setStreams(result);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load assigned streams.');
    } finally {
      setIsLoading(false);
    }
  }, [customer, api]);

  useEffect(() => {
    if (!open || !customer) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [open, customer, load]);

  const streamActions = useStreamDisableActions(async (streamId, disabled) => {
    const stream = streams.find((s) => s.id === streamId);
    if (!stream || !api.setStreamDisabled) return;
    await api.setStreamDisabled(stream.server_id, streamId, disabled);
  }, load);

  async function handleView(stream: FlussonicStreamDirectoryEntry) {
    if (!api.getStreamDetails) return;
    setViewLoadingId(stream.id);
    setViewError(null);
    try {
      const full = await api.getStreamDetails(stream.server_id, stream.id);
      setViewingStream(full);
    } catch (err) {
      setViewError(err instanceof ApiError ? err.message : 'Failed to load stream details.');
    } finally {
      setViewLoadingId(null);
    }
  }

  function handleSessions(stream: FlussonicStreamDirectoryEntry) {
    if (sessionsApi) {
      setSessionsStream(stream);
      return;
    }
    router.push(
      `/dashboard/servers/${stream.server_id}/sessions?stream=${encodeURIComponent(stream.name)}`,
    );
  }

  return (
    <>
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
              <h2 className="text-base font-semibold text-gray-900">Assigned streams</h2>
              <p className="text-xs text-gray-500">{customer?.name}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={load}
                disabled={isLoading}
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
                aria-label="Refresh streams"
                title="Refresh"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {viewError && <p className="mb-3 text-sm text-red-600">{viewError}</p>}
            {streamActions.error && (
              <p className="mb-3 text-sm text-red-600">{streamActions.error}</p>
            )}

            {isLoading && (
              <p className="flex items-center gap-2 text-sm text-gray-400">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Loading streams…
              </p>
            )}

            {!isLoading && loadError && <p className="text-sm text-red-600">{loadError}</p>}

            {!isLoading && !loadError && streams.length === 0 && (
              <p className="text-sm text-gray-400">No streams assigned to this customer yet.</p>
            )}

            {!isLoading && !loadError && streams.length > 0 && (
              <ul className="space-y-1">
                {streams.map((stream) => (
                  <li
                    key={stream.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {stream.name}
                        {stream.title ? ` — ${stream.title}` : ''}
                      </p>
                      <p className="truncate text-xs text-gray-400">{stream.server_name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          STATUS_STYLES[stream.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {stream.status}
                      </span>
                      {stream.live_status && (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${liveStatusStyle(stream.live_status)}`}
                        >
                          {stream.live_status}
                        </span>
                      )}
                      {api.getStreamDetails && (
                        <button
                          onClick={() => handleView(stream)}
                          disabled={viewLoadingId === stream.id}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink disabled:opacity-60"
                          aria-label={`View ${stream.name}`}
                          title="View stream"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                      {showSessions && stream.has_active_order && (
                        <button
                          onClick={() => handleSessions(stream)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink"
                          aria-label={`View sessions for ${stream.name}`}
                          title="View sessions"
                        >
                          <UsersIcon className="h-4 w-4" />
                        </button>
                      )}
                      {api.setStreamDisabled && stream.has_active_order && (
                        <>
                          {stream.disabled ? (
                            <button
                              onClick={() => streamActions.start(stream.id)}
                              disabled={streamActions.busyId === stream.id}
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-60"
                              aria-label={`Start ${stream.name}`}
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
                                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                                aria-label={`Disable ${stream.name}`}
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
                                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-flu-pink disabled:opacity-60"
                                aria-label={`Restart ${stream.name}`}
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
                          )}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <StreamDetailsPanel
        open={viewingStream !== null}
        stream={viewingStream}
        onClose={() => setViewingStream(null)}
        showRawData={showRawData}
      />

      {sessionsApi && (
        <StreamSessionsPanel
          open={sessionsStream !== null}
          streamId={sessionsStream?.id ?? null}
          streamName={sessionsStream?.name ?? null}
          onClose={() => setSessionsStream(null)}
          listSessions={sessionsApi}
        />
      )}
    </>
  );
}
