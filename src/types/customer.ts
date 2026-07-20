export type CustomerStatus = 'active' | 'suspended' | 'closed';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  company_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
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
  company_name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status?: CustomerStatus;
}
