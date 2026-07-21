export type PlanStatus = 'active' | 'inactive';

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  mrp: string;
  customer_price: string;
  reseller_percentage: string;
  reseller_price: string;
  max_streams: number;
  max_connections: number;
  playback_protocols: string[] | null;
  show_customer: boolean;
  show_reseller: boolean;
  status: PlanStatus;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}

export interface PlanInput {
  name: string;
  description?: string;
  mrp: number;
  customer_price: number;
  reseller_percentage: number;
  max_streams?: number;
  max_connections?: number;
  playback_protocols?: string[];
  show_customer?: boolean;
  show_reseller?: boolean;
  status?: PlanStatus;
}
