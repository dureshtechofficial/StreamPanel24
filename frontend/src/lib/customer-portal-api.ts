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

/** Disable/re-enable one of the customer's own streams (used for the "Disable" action). */
export function setMyStreamDisabled(streamId: string, disabled: boolean) {
  return customerApiFetch<FlussonicStream>(`/customer-auth/streams/${streamId}/disabled`, {
    method: 'PATCH',
    body: { disabled },
  });
}

/** Restart one of the customer's own streams (one call, one "restarted" notification). */
export function restartMyStream(streamId: string) {
  return customerApiFetch<FlussonicStream>(
    `/customer-auth/streams/${streamId}/restart`,
    { method: 'POST' },
  );
}

export interface ListStreamSessionsParams {
  page?: number;
  limit?: number;
}

/** Live sessions for one of the customer's own streams — the backend 404s if it isn't currently assigned to them. */
export function listMyStreamSessions(streamId: string, params: ListStreamSessionsParams = {}) {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));

  return customerApiFetch<PaginatedResult<FlussonicStreamSession>>(
    `/customer-auth/streams/${streamId}/sessions?${query.toString()}`,
  );
}
