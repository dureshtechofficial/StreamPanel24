import { apiFetch } from './api-client';
import type { Customer, CustomerInput, CustomerStatus } from '@/types/customer';
import type { PaginatedResult } from '@/types/pagination';

export interface ListCustomersParams {
  search?: string;
  status?: CustomerStatus | '';
  page?: number;
  limit?: number;
}

export function listCustomers(params: ListCustomersParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 10));

  return apiFetch<PaginatedResult<Customer>>(`/customers?${query.toString()}`);
}

export function createCustomer(input: CustomerInput) {
  return apiFetch<Customer>('/customers', { method: 'POST', body: input });
}

export function updateCustomer(id: string, input: Partial<CustomerInput>) {
  return apiFetch<Customer>(`/customers/${id}`, { method: 'PATCH', body: input });
}

export function deleteCustomer(id: string) {
  return apiFetch<void>(`/customers/${id}`, { method: 'DELETE' });
}
