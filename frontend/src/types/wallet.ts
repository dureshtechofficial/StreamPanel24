export type WalletTransactionType = 'topup' | 'order_payment';

interface BaseWalletTransaction {
  id: string;
  type: WalletTransactionType;
  /** DECIMAL(10,2) as a string, signed (negative for a debit). */
  amount: string;
  /** DECIMAL(10,2) as a string — the resulting balance right after this transaction. */
  balance_after: string;
  remark: string | null;
  created_by_admin_id: string | null;
  /** The order this charge/refund belongs to (type = order_payment only), null otherwise. */
  order_id: string | null;
  /** Razorpay's payment id (type = topup via self-service top-up only), null otherwise. */
  razorpay_payment_id: string | null;
  /** UTC unix timestamp (seconds) */
  created_at: number;
}

export interface WalletTransaction extends BaseWalletTransaction {
  reseller_id: string;
}

/** Same shape as `WalletTransaction` but for a customer's own wallet — a separate table (`customer_wallet_transactions`) on the backend, mirroring the reseller ledger. */
export interface CustomerWalletTransaction extends BaseWalletTransaction {
  customer_id: string;
}

export interface TopupWalletInput {
  amount: number;
  remark?: string;
}
