export interface WalletTopupSettings {
  enabled: boolean;
  minimum_amount: number;
}

export type WalletTopupActor = 'reseller' | 'customer';

/** Admin-scoped view of one actor's setting row (`GET/PATCH settings/wallet-topup`) — the portal-facing `WalletTopupSettings` above is the read-only subset a reseller/customer sees for themselves. */
export interface WalletTopupSetting {
  id: string;
  actor_type: WalletTopupActor;
  enabled: boolean;
  /** DECIMAL(10,2) as a string. */
  minimum_amount: string;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}

export interface UpdateWalletTopupSettingInput {
  enabled?: boolean;
  minimum_amount?: number;
}

export interface RazorpayOrderResponse {
  razorpay_order_id: string;
  /** Amount in paise, as returned by Razorpay. */
  amount: number;
  currency: string;
  /** Public key — safe to hand to the Checkout widget. */
  key_id: string;
}

export interface VerifyRazorpayPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
