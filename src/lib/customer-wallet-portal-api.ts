import { customerApiFetch } from './customer-api-client';
import type { CustomerWalletTransaction } from '@/types/wallet';
import type {
  RazorpayOrderResponse,
  VerifyRazorpayPaymentInput,
  WalletTopupSettings,
} from '@/types/razorpay';
import type { PaginatedResult } from '@/types/pagination';

export function getMyWalletBalance() {
  return customerApiFetch<{ wallet_balance: string }>('/customer-auth/wallet');
}

export function getMyWalletTopupSettings() {
  return customerApiFetch<WalletTopupSettings>('/customer-auth/wallet/topup-settings');
}

export function createMyRazorpayOrder(amount: number) {
  return customerApiFetch<RazorpayOrderResponse>('/customer-auth/wallet/razorpay/order', {
    method: 'POST',
    body: { amount },
  });
}

export function verifyMyRazorpayPayment(input: VerifyRazorpayPaymentInput) {
  return customerApiFetch<{ wallet_balance: string }>(
    '/customer-auth/wallet/razorpay/verify',
    { method: 'POST', body: input },
  );
}

export function listMyWalletTransactions(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return customerApiFetch<PaginatedResult<CustomerWalletTransaction>>(
    `/customer-auth/wallet/transactions${qs ? `?${qs}` : ''}`,
  );
}
