import { apiFetch } from './api-client';
import type { Reseller, ResellerInput, ResellerStatus } from '@/types/reseller';
import type { PaginatedResult } from '@/types/pagination';

export interface ListResellersParams {
  search?: string;
  status?: ResellerStatus | '';
  page?: number;
  limit?: number;
}

export function listResellers(params: ListResellersParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 10));

  return apiFetch<PaginatedResult<Reseller>>(`/resellers?${query.toString()}`);
}

export function createReseller(input: ResellerInput) {
  return apiFetch<Reseller>('/resellers', { method: 'POST', body: input });
}

export function updateReseller(id: string, input: Partial<ResellerInput>) {
  return apiFetch<Reseller>(`/resellers/${id}`, { method: 'PATCH', body: input });
}

export function deleteReseller(id: string) {
  return apiFetch<void>(`/resellers/${id}`, { method: 'DELETE' });
}
