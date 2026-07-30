export type SyncType = 'server_stats' | 'streams' | 'order_expiry';

export interface SyncSchedule {
  id: string;
  sync_type: SyncType;
  enabled: boolean;
  /** Gates the manual "Sync"/"Sync all" buttons for this type — independent of `enabled`, which only gates the cron. */
  manual_sync_enabled: boolean;
  cron_expression: string;
  /** UTC unix timestamp (seconds) */
  last_run_at: number | null;
  last_run_summary: Record<string, unknown> | null;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}

export interface UpdateSyncScheduleInput {
  enabled?: boolean;
  manual_sync_enabled?: boolean;
  cron_expression?: string;
}

export interface SyncScheduleRun {
  id: string;
  sync_type: SyncType;
  /** UTC unix timestamp (seconds) */
  ran_at: number;
  success: boolean;
  summary: Record<string, unknown>;
}
