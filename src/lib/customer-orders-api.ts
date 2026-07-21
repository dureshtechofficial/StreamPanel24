import { customerApiFetch } from './customer-api-client';
import type { Order } from '@/types/order';

export function listMyOrders() {
  return customerApiFetch<Order[]>('/customer-auth/orders');
}
