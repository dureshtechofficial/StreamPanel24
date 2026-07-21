import { apiFetch } from './api-client';
import type { FlussonicStreamSession } from '@/types/flussonic-stream-session';
import type { PaginatedResult } from '@/types/pagination';

export interface ListStreamSessionsParams {
  search?: string;
  /** Only sessions touched by the server's most recent sync (i.e. still live as of last check). */
  latestOnly?: boolean;
  page?: number;
  limit?: number;
}

export function listStreamSessions(serverId: string, params: ListStreamSessionsParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.latestOnly) query.set('latestOnly', 'true');
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));

  return apiFetch<PaginatedResult<FlussonicStreamSession>>(
    `/flussonic-servers/${serverId}/sessions?${query.toString()}`,
  );
}

export interface SyncSessionsSummary {
  total: number;
  created: number;
  updated: number;
}

export function syncStreamSessions(serverId: string) {
  return apiFetch<SyncSessionsSummary>(`/flussonic-servers/${serverId}/sessions/sync`, {
    method: 'POST',
  });
}
