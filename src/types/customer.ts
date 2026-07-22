export type CustomerStatus = 'active' | 'suspended' | 'closed';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  username: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  /** DECIMAL(10,2) as a string, mutated only via the wallet topup endpoint. */
  wallet_balance: string;
  /** Which reseller manages this customer, if any — admin-only field. */
  reseller_id: string | null;
  status: CustomerStatus;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone: string;
  username: string;
  /** Only sent when creating, or when changing it on edit (blank = unchanged). */
  password?: string;
  company_name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status?: CustomerStatus;
  /** Admin-only: null explicitly unassigns the reseller, undefined leaves it untouched. */
  reseller_id?: string | null;
}
