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
  /** Plan/customer details snapshotted at purchase time, for invoicing — frozen even if the plan/customer is later edited or renamed. */
  plan_name: string;
  plan_description: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_company_name: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_pincode: string | null;
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

/** Order enriched with readable stream/server/reseller labels — returned by the admin reports endpoint only. Customer/plan names are already on `Order` itself (the invoicing snapshot). */
export interface OrderReportEntry extends Order {
  stream_name: string;
  server_name: string;
  reseller_name: string | null;
}

export interface OrdersSummary {
  totalOrders: number;
  /** Sum of `price` across every order matching the filter, regardless of payment_status. */
  totalValue: string;
  /** Sum of `price` across only payment_status = 'paid' orders — actual realized revenue. */
  paidRevenue: string;
}
