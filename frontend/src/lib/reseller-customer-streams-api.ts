import { resellerApiFetch } from './reseller-api-client';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { FlussonicStream } from '@/types/flussonic-stream';
import type { FlussonicStreamSession } from '@/types/flussonic-stream-session';
import type { PaginatedResult } from '@/types/pagination';

export function listMyCustomerStreams(customerId: string) {
  return resellerApiFetch<FlussonicStreamDirectoryEntry[]>(
    `/reseller-auth/customers/${customerId}/streams`,
  );
}

/**
 * Full details (protocols, live stats, media tracks, inputs) for one stream —
 * the backend 404s unless it's currently assigned to one of the reseller's
 * own customers. Takes `serverId` only to match the admin-scoped `getStream`
 * signature (`CustomerAssignedStreamsPanelApi.getStreamDetails`); unused here
 * since the reseller-scoped route resolves the stream directly by id.
 */
export function getMyStreamDetails(_serverId: string, streamId: string) {
  return resellerApiFetch<FlussonicStream>(`/reseller-auth/streams/${streamId}`);
}

/**
 * Disable/re-enable one stream (used for the "Disable"/"Restart" actions) —
 * the backend 404s unless it's currently assigned to one of the reseller's
 * own customers. `serverId` is unused, kept only to match the shared action
 * button signature used across portals.
 */
export function setMyStreamDisabled(_serverId: string, streamId: string, disabled: boolean) {
  return resellerApiFetch<FlussonicStream>(`/reseller-auth/streams/${streamId}/disabled`, {
    method: 'PATCH',
    body: { disabled },
  });
}

/** `_serverId` is accepted (and ignored) to match the panel's restart signature; the portal route is stream-scoped. */
export function restartMyStream(_serverId: string, streamId: string) {
  return resellerApiFetch<FlussonicStream>(
    `/reseller-auth/streams/${streamId}/restart`,
    { method: 'POST' },
  );
}

export function assignMyCustomerStreams(customerId: string, streamIds: string[]) {
  return resellerApiFetch<FlussonicStreamDirectoryEntry[]>(
    `/reseller-auth/customers/${customerId}/streams`,
    { method: 'PUT', body: { streamIds } },
  );
}

export interface SearchAvailableStreamsParams {
  search?: string;
  availableForCustomerId?: string;
  page?: number;
  limit?: number;
}

export function searchMyAvailableStreams(params: SearchAvailableStreamsParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.availableForCustomerId) {
    query.set('availableForCustomerId', params.availableForCustomerId);
  }
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));

  return resellerApiFetch<PaginatedResult<FlussonicStreamDirectoryEntry>>(
    `/reseller-auth/streams?${query.toString()}`,
  );
}

export interface ListStreamSessionsParams {
  page?: number;
  limit?: number;
}

/** Live sessions for one stream — the backend 404s unless it's currently assigned to one of the reseller's own customers. */
export function listMyStreamSessions(streamId: string, params: ListStreamSessionsParams = {}) {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));

  return resellerApiFetch<PaginatedResult<FlussonicStreamSession>>(
    `/reseller-auth/streams/${streamId}/sessions?${query.toString()}`,
  );
}
