import { customerApiFetch } from './customer-api-client';
import type { Order } from '@/types/order';

export function listMyOrders() {
  return customerApiFetch<Order[]>('/customer-auth/orders');
}

export function cancelMyOrder(orderId: string) {
  return customerApiFetch<Order>(`/customer-auth/orders/${orderId}/cancel`, {
    method: 'PATCH',
  });
}

export async function isCustomerOrderCancelEnabled(): Promise<boolean> {
  const result = await customerApiFetch<{ enabled: boolean }>(
    '/customer-auth/settings/order-cancel-enabled',
  );
  return result.enabled;
}
