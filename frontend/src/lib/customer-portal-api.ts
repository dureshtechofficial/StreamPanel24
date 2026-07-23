import { customerApiFetch } from './customer-api-client';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { FlussonicStream } from '@/types/flussonic-stream';
import type { FlussonicStreamSession } from '@/types/flussonic-stream-session';
import type { PaginatedResult } from '@/types/pagination';

export function listMyStreams() {
  return customerApiFetch<FlussonicStreamDirectoryEntry[]>('/customer-auth/streams');
}

/** Full details (protocols, live stats, media tracks, inputs) for one of the customer's own streams. */
export function getMyStreamDetails(streamId: string) {
  return customerApiFetch<FlussonicStream>(`/customer-auth/streams/${streamId}`);
}

/** Disable/re-enable one of the customer's own streams (used for the "Disable"/"Restart" actions). */
export function setMyStreamDisabled(streamId: string, disabled: boolean) {
  return customerApiFetch<FlussonicStream>(`/customer-auth/streams/${streamId}/disabled`, {
    method: 'PATCH',
    body: { disabled },
  });
}

export interface ListStreamSessionsParams {
  page?: number;
  limit?: number;
  /** Only sessions touched by the server's most recent sync (i.e. still live as of last check). */
  latestOnly?: boolean;
}

/** Sessions for one of the customer's own streams — the backend 404s if it isn't currently assigned to them. */
export function listMyStreamSessions(streamId: string, params: ListStreamSessionsParams = {}) {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));
  if (params.latestOnly) query.set('latestOnly', 'true');

  return customerApiFetch<PaginatedResult<FlussonicStreamSession>>(
    `/customer-auth/streams/${streamId}/sessions?${query.toString()}`,
  );
}
