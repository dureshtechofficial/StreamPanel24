export type OrderCancelActor = 'admin' | 'reseller' | 'customer';

export interface OrderCancelSetting {
  id: string;
  actor_type: OrderCancelActor;
  enabled: boolean;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}
