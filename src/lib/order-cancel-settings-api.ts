import { apiFetch } from './api-client';
import type { OrderCancelActor, OrderCancelSetting } from '@/types/order-cancel-setting';

export function listOrderCancelSettings() {
  return apiFetch<OrderCancelSetting[]>('/settings/order-cancel');
}

export function updateOrderCancelSetting(actorType: OrderCancelActor, enabled: boolean) {
  return apiFetch<OrderCancelSetting>(`/settings/order-cancel/${actorType}`, {
    method: 'PATCH',
    body: { enabled },
  });
}
