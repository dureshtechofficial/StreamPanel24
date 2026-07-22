export type CustomerActionActor = 'admin' | 'reseller';
export type CustomerAction = 'edit' | 'delete' | 'assign';

export interface CustomerActionSetting {
  id: string;
  actor_type: CustomerActionActor;
  action: CustomerAction;
  enabled: boolean;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}
