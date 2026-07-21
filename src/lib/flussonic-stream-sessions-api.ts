import { apiFetch } from './api-client';
import type { FlussonicStreamSession } from '@/types/flussonic-stream-session';
import type { PaginatedResult } from '@/types/pagination';

export interface ListStreamSessionsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function listStreamSessions(serverId: string, params: ListStreamSessionsParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
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
