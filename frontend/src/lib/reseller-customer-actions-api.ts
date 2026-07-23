import { resellerApiFetch } from './reseller-api-client';

export interface ResellerCustomerActionFlags {
  edit: boolean;
  delete: boolean;
  assign: boolean;
}

export function getMyCustomerActionFlags() {
  return resellerApiFetch<ResellerCustomerActionFlags>(
    '/reseller-auth/settings/customer-actions',
  );
}
