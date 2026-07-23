import { resellerApiFetch } from './reseller-api-client';
import type { WalletTransaction } from '@/types/wallet';
import type {
  RazorpayOrderResponse,
  VerifyRazorpayPaymentInput,
  WalletTopupSettings,
} from '@/types/razorpay';
import type { PaginatedResult } from '@/types/pagination';

export function getMyWalletBalance() {
  return resellerApiFetch<{ wallet_balance: string }>('/reseller-auth/wallet');
}

export function getMyWalletTopupSettings() {
  return resellerApiFetch<WalletTopupSettings>('/reseller-auth/wallet/topup-settings');
}

export function createMyRazorpayOrder(amount: number) {
  return resellerApiFetch<RazorpayOrderResponse>('/reseller-auth/wallet/razorpay/order', {
    method: 'POST',
    body: { amount },
  });
}

export function verifyMyRazorpayPayment(input: VerifyRazorpayPaymentInput) {
  return resellerApiFetch<{ wallet_balance: string }>(
    '/reseller-auth/wallet/razorpay/verify',
    { method: 'POST', body: input },
  );
}

export function listMyWalletTransactions(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return resellerApiFetch<PaginatedResult<WalletTransaction>>(
    `/reseller-auth/wallet/transactions${qs ? `?${qs}` : ''}`,
  );
}
