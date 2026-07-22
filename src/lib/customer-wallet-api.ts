import { apiFetch } from './api-client';
import type { CustomerWalletTransaction, TopupWalletInput } from '@/types/wallet';
import type { PaginatedResult } from '@/types/pagination';

export function getCustomerWalletBalance(customerId: string) {
  return apiFetch<{ wallet_balance: string }>(`/customers/${customerId}/wallet`);
}

export function topUpCustomerWallet(customerId: string, input: TopupWalletInput) {
  return apiFetch<CustomerWalletTransaction>(`/customers/${customerId}/wallet/topup`, {
    method: 'POST',
    body: input,
  });
}

export function listCustomerWalletTransactions(
  customerId: string,
  params: { page?: number; limit?: number } = {},
) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiFetch<PaginatedResult<CustomerWalletTransaction>>(
    `/customers/${customerId}/wallet/transactions${qs ? `?${qs}` : ''}`,
  );
}
