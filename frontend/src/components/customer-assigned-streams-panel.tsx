'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listCustomerStreams } from '@/lib/customer-streams-api';
import { getStream, restartStream, updateStream } from '@/lib/flussonic-streams-api';
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
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-muted text-muted-foreground',
};

export interface CustomerAssignedStreamsPanelApi {
  listCustomerStreams: (customerId: string) => Promise<FlussonicStreamDirectoryEntry[]>;
  /** Omit to hide the "view details" action entirely (shown whenever this is provided). */
  getStreamDetails?: (serverId: string, streamId: string) => Promise<FlussonicStream>;
  /** Omit to hide the "disable"/"restart" actions entirely (shown whenever this is provided). */
  setStreamDisabled?: (serverId: string, streamId: string, disabled: boolean) => Promise<unknown>;
  /** Dedicated restart endpoint (one call, one "restarted" notification). Falls back to disable+re-enable when omitted. */
  restartStream?: (serverId: string, streamId: string) => Promise<unknown>;
}

const DEFAULT_API: CustomerAssignedStreamsPanelApi = {
  listCustomerStreams,
  getStreamDetails: getStream,
  setStreamDisabled: (serverId, streamId, disabled) =>
    updateStream(serverId, streamId, { disabled }),
  restartStream: (serverId, streamId) => restartStream(serverId, streamId),
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
    params: { page?: number; limit?: number },
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

  const streamActions = useStreamDisableActions(
    async (streamId, disabled) => {
      const stream = streams.find((s) => s.id === streamId);
      if (!stream || !api.setStreamDisabled) return;
      await api.setStreamDisabled(stream.server_id, streamId, disabled);
    },
    load,
    api.restartStream
      ? async (streamId) => {
          const stream = streams.find((s) => s.id === streamId);
          if (!stream || !api.restartStream) return;
          await api.restartStream(stream.server_id, streamId);
        }
      : undefined,
  );

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
      <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
        <SheetContent size="lg" showClose={false}>
          <div className="flex items-center justify-between border-b border-border bg-subtle/50 px-6 py-4">
            <div>
              <SheetTitle className="text-base">Assigned streams</SheetTitle>
              <SheetDescription>{customer?.name}</SheetDescription>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={load}
                disabled={isLoading}
                className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-muted-foreground disabled:cursor-not-allowed"
                aria-label="Refresh streams"
                title="Refresh"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground"
                aria-label="Close panel"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {viewError && <p className="mb-3 text-sm text-danger">{viewError}</p>}
            {streamActions.error && (
              <p className="mb-3 text-sm text-danger">{streamActions.error}</p>
            )}

            {isLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground/70">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Loading streams…
              </p>
            )}

            {!isLoading && loadError && <p className="text-sm text-danger">{loadError}</p>}

            {!isLoading && !loadError && streams.length === 0 && (
              <p className="text-sm text-muted-foreground/70">No streams assigned to this customer yet.</p>
            )}

            {!isLoading && !loadError && streams.length > 0 && (
              <ul className="space-y-1">
                {streams.map((stream) => (
                  <li
                    key={stream.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {stream.name}
                        {stream.title ? ` — ${stream.title}` : ''}
                      </p>
                      <p className="truncate text-xs text-muted-foreground/70">{stream.server_name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          STATUS_STYLES[stream.status] ?? 'bg-muted text-muted-foreground'
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
                          className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary disabled:opacity-60"
                          aria-label={`View ${stream.name}`}
                          title="View stream"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                      {showSessions && stream.has_active_order && (
                        <button
                          onClick={() => handleSessions(stream)}
                          className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary"
                          aria-label={`View sessions for ${stream.name}`}
                          title="View sessions"
                        >
                          <UsersIcon className="h-4 w-4" />
                        </button>
                      )}
                      {stream.blocked && (
                        <span
                          className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger"
                          title="Blocked by an administrator"
                        >
                          Blocked
                        </span>
                      )}
                      {api.setStreamDisabled && stream.has_active_order && !stream.blocked && (
                        <>
                          {stream.disabled ? (
                            <button
                              onClick={() => streamActions.start(stream.id)}
                              disabled={streamActions.busyId === stream.id}
                              className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-success-soft hover:text-success disabled:opacity-60"
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
                                className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
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
                                className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-primary disabled:opacity-60"
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
        </SheetContent>
      </Sheet>

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
