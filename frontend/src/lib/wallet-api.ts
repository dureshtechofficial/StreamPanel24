import { apiFetch } from './api-client';
import type { TopupWalletInput, WalletTransaction } from '@/types/wallet';
import type { PaginatedResult } from '@/types/pagination';

export function getResellerWalletBalance(resellerId: string) {
  return apiFetch<{ wallet_balance: string }>(`/resellers/${resellerId}/wallet`);
}

export function topUpResellerWallet(resellerId: string, input: TopupWalletInput) {
  return apiFetch<WalletTransaction>(`/resellers/${resellerId}/wallet/topup`, {
    method: 'POST',
    body: input,
  });
}

export function listResellerWalletTransactions(
  resellerId: string,
  params: { page?: number; limit?: number } = {},
) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiFetch<PaginatedResult<WalletTransaction>>(
    `/resellers/${resellerId}/wallet/transactions${qs ? `?${qs}` : ''}`,
  );
}
