export type OrderStatus = 'active' | 'expired' | 'cancelled' | 'suspended';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  plan_id: string;
  stream_id: string;
  customer_id: string;
  reseller_id: string | null;
  price: string;
  duration_days: number;
  max_streams: number;
  max_connections: number;
  playback_protocols: string[] | null;
  /** UTC unix timestamp (seconds) */
  effective_from: number;
  /** UTC unix timestamp (seconds) */
  effective_to: number;
  status: OrderStatus;
  payment_method: string;
  payment_status: PaymentStatus;
  currency: string;
  gateway_transaction_id: string | null;
  remark: string | null;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}

export interface CreateOrderInput {
  plan_id: string;
  stream_id: string;
  customer_id?: string;
  duration_days: number;
  price?: number;
  payment_method: string;
  payment_status?: PaymentStatus;
  remark?: string;
}

export interface UpdateOrderStatusInput {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  remark?: string;
}
