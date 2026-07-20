import { apiFetch } from './api-client';
import type {
  FlussonicServer,
  FlussonicServerInput,
  FlussonicServerStatus,
} from '@/types/flussonic-server';
import type { PaginatedResult } from '@/types/pagination';

export interface ListServersParams {
  search?: string;
  status?: FlussonicServerStatus | '';
  page?: number;
  limit?: number;
}

export function listServers(params: ListServersParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 10));

  return apiFetch<PaginatedResult<FlussonicServer>>(`/flussonic-servers?${query.toString()}`);
}

export function getServer(id: string) {
  return apiFetch<FlussonicServer>(`/flussonic-servers/${id}`);
}

export function createServer(input: FlussonicServerInput) {
  return apiFetch<FlussonicServer>('/flussonic-servers', { method: 'POST', body: input });
}

export function updateServer(id: string, input: Partial<FlussonicServerInput>) {
  return apiFetch<FlussonicServer>(`/flussonic-servers/${id}`, { method: 'PATCH', body: input });
}

export function deleteServer(id: string) {
  return apiFetch<void>(`/flussonic-servers/${id}`, { method: 'DELETE' });
}

export interface SyncAllResult {
  serverId: string;
  name: string;
  ok: boolean;
  error?: string;
}

export interface SyncAllSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: SyncAllResult[];
}

export function syncAllServers() {
  return apiFetch<SyncAllSummary>('/flussonic-servers/sync-all', { method: 'POST' });
}
