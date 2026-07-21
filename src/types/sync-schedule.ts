export type SyncType = 'server_stats' | 'streams' | 'sessions';

export interface SyncSchedule {
  id: string;
  sync_type: SyncType;
  enabled: boolean;
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
  cron_expression?: string;
}
