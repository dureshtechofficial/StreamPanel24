import { apiFetch } from './api-client';
import type {
  FlussonicStream,
  FlussonicStreamInput,
  FlussonicStreamStatus,
} from '@/types/flussonic-stream';
import type { PaginatedResult } from '@/types/pagination';

export interface ListStreamsParams {
  search?: string;
  status?: FlussonicStreamStatus | '';
  page?: number;
  limit?: number;
}

export function listStreams(serverId: string, params: ListStreamsParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 10));

  return apiFetch<PaginatedResult<FlussonicStream>>(
    `/flussonic-servers/${serverId}/streams?${query.toString()}`,
  );
}

export function getStream(serverId: string, id: string) {
  return apiFetch<FlussonicStream>(`/flussonic-servers/${serverId}/streams/${id}`);
}

export function createStream(serverId: string, input: FlussonicStreamInput) {
  return apiFetch<FlussonicStream>(`/flussonic-servers/${serverId}/streams`, {
    method: 'POST',
    body: input,
  });
}

export function updateStream(
  serverId: string,
  id: string,
  input: Partial<Omit<FlussonicStreamInput, 'name'>>,
) {
  return apiFetch<FlussonicStream>(`/flussonic-servers/${serverId}/streams/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteStream(serverId: string, id: string) {
  return apiFetch<void>(`/flussonic-servers/${serverId}/streams/${id}`, {
    method: 'DELETE',
  });
}
