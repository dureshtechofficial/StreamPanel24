import { apiFetch } from './api-client';
import type {
  CreateOrderInput,
  Order,
  OrderStatus,
  PaymentStatus,
  UpdateOrderStatusInput,
} from '@/types/order';
import type { PaginatedResult } from '@/types/pagination';

export interface ListOrdersParams {
  customerId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  page?: number;
  limit?: number;
}

export function listOrders(params: ListOrdersParams = {}) {
  const query = new URLSearchParams();
  if (params.customerId) query.set('customerId', params.customerId);
  if (params.status) query.set('status', params.status);
  if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));

  return apiFetch<PaginatedResult<Order>>(`/orders?${query.toString()}`);
}

/** Convenience: every order for one customer, unpaginated (used by the OrdersPanel). */
export async function listOrdersForCustomer(customerId: string): Promise<Order[]> {
  const result = await listOrders({ customerId, limit: 100 });
  return result.items;
}

export function createOrder(customerId: string, input: CreateOrderInput) {
  return apiFetch<Order>('/orders', {
    method: 'POST',
    body: { ...input, customer_id: customerId },
  });
}

export function updateOrderStatus(orderId: string, input: UpdateOrderStatusInput) {
  return apiFetch<Order>(`/orders/${orderId}`, { method: 'PATCH', body: input });
}

export function cancelOrder(orderId: string) {
  return updateOrderStatus(orderId, { status: 'cancelled' });
}
