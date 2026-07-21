import { resellerApiFetch } from './reseller-api-client';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { PaginatedResult } from '@/types/pagination';

export function listMyCustomerStreams(customerId: string) {
  return resellerApiFetch<FlussonicStreamDirectoryEntry[]>(
    `/reseller-auth/customers/${customerId}/streams`,
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
