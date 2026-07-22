import { apiFetch } from './api-client';
import type {
  CustomerAction,
  CustomerActionActor,
  CustomerActionSetting,
} from '@/types/customer-action-setting';

export function listCustomerActionSettings() {
  return apiFetch<CustomerActionSetting[]>('/settings/customer-actions');
}

export function updateCustomerActionSetting(
  actorType: CustomerActionActor,
  action: CustomerAction,
  enabled: boolean,
) {
  return apiFetch<CustomerActionSetting>(
    `/settings/customer-actions/${actorType}/${action}`,
    { method: 'PATCH', body: { enabled } },
  );
}
