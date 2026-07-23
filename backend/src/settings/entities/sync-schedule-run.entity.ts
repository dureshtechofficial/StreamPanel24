import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { SyncType } from '../enums/sync-type.enum';
import { unixTimestampTransformer } from '../../common/utils/unix-timestamp.util';

/**
 * A permanent log of every cron firing for a sync type — unlike
 * `SyncSchedule.last_run_at`/`last_run_summary` (which only ever hold the
 * most recent run), rows here are never overwritten or deleted, so the
 * settings page can show run history over time.
 */
@Entity('sync_schedule_runs')
export class SyncScheduleRun {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Index()
  @Column({ type: 'enum', enum: SyncType })
  sync_type: SyncType;

  /** UTC unix timestamp (seconds) this run fired. */
  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  ran_at: number;

  /** False if the underlying sync-all-servers call threw (see `summary.error` for why). */
  @Column({ type: 'boolean' })
  success: boolean;

  /** Whatever the underlying sync-all-servers call returned, or `{ error }` if it threw. */
  @Column({ type: 'json' })
  summary: Record<string, unknown>;
}
