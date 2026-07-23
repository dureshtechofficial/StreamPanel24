import { apiFetch } from './api-client';
import type { FlussonicServerStat, FlussonicServerStatInput } from '@/types/flussonic-server-stat';
import type { PaginatedResult } from '@/types/pagination';

export interface ListServerStatsParams {
  page?: number;
  limit?: number;
}

export function listServerStats(serverId: string, params: ListServerStatsParams) {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 10));

  return apiFetch<PaginatedResult<FlussonicServerStat>>(
    `/flussonic-servers/${serverId}/stats?${query.toString()}`,
  );
}

export function createServerStat(serverId: string, input: FlussonicServerStatInput) {
  return apiFetch<FlussonicServerStat>(`/flussonic-servers/${serverId}/stats`, {
    method: 'POST',
    body: input,
  });
}

export function syncServerStats(serverId: string) {
  return apiFetch<FlussonicServerStat>(`/flussonic-servers/${serverId}/stats/sync`, {
    method: 'POST',
  });
}
