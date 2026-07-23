import { resellerApiFetch } from './reseller-api-client';
import type { Customer, CustomerInput, CustomerStatus } from '@/types/customer';
import type { PaginatedResult } from '@/types/pagination';

export interface ListMyCustomersParams {
  search?: string;
  status?: CustomerStatus | '';
  page?: number;
  limit?: number;
}

export function listMyCustomers(params: ListMyCustomersParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 10));

  return resellerApiFetch<PaginatedResult<Customer>>(
    `/reseller-auth/customers?${query.toString()}`,
  );
}

export function createMyCustomer(input: CustomerInput) {
  return resellerApiFetch<Customer>('/reseller-auth/customers', {
    method: 'POST',
    body: input,
  });
}

export function updateMyCustomer(id: string, input: Partial<CustomerInput>) {
  return resellerApiFetch<Customer>(`/reseller-auth/customers/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteMyCustomer(id: string) {
  return resellerApiFetch<void>(`/reseller-auth/customers/${id}`, { method: 'DELETE' });
}
