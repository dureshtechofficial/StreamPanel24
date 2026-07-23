import { apiFetch } from './api-client';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { PaginatedResult } from '@/types/pagination';

export function listCustomerStreams(customerId: string) {
  return apiFetch<FlussonicStreamDirectoryEntry[]>(`/customers/${customerId}/streams`);
}

export function assignCustomerStreams(customerId: string, streamIds: string[]) {
  return apiFetch<FlussonicStreamDirectoryEntry[]>(`/customers/${customerId}/streams`, {
    method: 'PUT',
    body: { streamIds },
  });
}

export interface SearchAvailableStreamsParams {
  search?: string;
  availableForCustomerId?: string;
  page?: number;
  limit?: number;
}

export function searchAvailableStreams(params: SearchAvailableStreamsParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.availableForCustomerId) {
    query.set('availableForCustomerId', params.availableForCustomerId);
  }
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));

  return apiFetch<PaginatedResult<FlussonicStreamDirectoryEntry>>(
    `/flussonic-streams?${query.toString()}`,
  );
}
