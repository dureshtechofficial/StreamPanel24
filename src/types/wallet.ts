export type WalletTransactionType = 'topup';

export interface WalletTransaction {
  id: string;
  reseller_id: string;
  type: WalletTransactionType;
  /** DECIMAL(10,2) as a string. */
  amount: string;
  /** DECIMAL(10,2) as a string — the resulting balance right after this transaction. */
  balance_after: string;
  remark: string | null;
  created_by_admin_id: string | null;
  /** UTC unix timestamp (seconds) */
  created_at: number;
}

export interface TopupWalletInput {
  amount: number;
  remark?: string;
}
