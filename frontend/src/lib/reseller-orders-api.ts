import { resellerApiFetch } from './reseller-api-client';
import type { CreateOrderInput, Order, UpdateOrderStatusInput } from '@/types/order';

export function listMyCustomerOrders(customerId: string) {
  return resellerApiFetch<Order[]>(`/reseller-auth/customers/${customerId}/orders`);
}

export function createMyCustomerOrder(customerId: string, input: CreateOrderInput) {
  return resellerApiFetch<Order>(`/reseller-auth/customers/${customerId}/orders`, {
    method: 'POST',
    body: input,
  });
}

export function updateMyCustomerOrderStatus(
  customerId: string,
  orderId: string,
  input: UpdateOrderStatusInput,
) {
  return resellerApiFetch<Order>(`/reseller-auth/customers/${customerId}/orders/${orderId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function cancelMyCustomerOrder(customerId: string, orderId: string) {
  return updateMyCustomerOrderStatus(customerId, orderId, { status: 'cancelled' });
}

export async function isResellerOrderCancelEnabled(): Promise<boolean> {
  const result = await resellerApiFetch<{ enabled: boolean }>(
    '/reseller-auth/settings/order-cancel-enabled',
  );
  return result.enabled;
}
