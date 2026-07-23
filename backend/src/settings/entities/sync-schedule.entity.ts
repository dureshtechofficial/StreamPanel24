import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SyncType } from '../enums/sync-type.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

/**
 * One configurable cron schedule per sync type (server stats / streams /
 * sessions), applied across every non-deleted server when it fires — not
 * per-server. Seeded with one disabled row per `SyncType` by migration.
 */
@Entity('sync_schedules')
export class SyncSchedule {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'enum', enum: SyncType, unique: true })
  sync_type: SyncType;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  /** Gates the frontend's manual "Sync"/"Sync all" buttons for this type — independent of `enabled`, which only gates the cron. */
  @Column({ type: 'boolean', default: true })
  manual_sync_enabled: boolean;

  @Column({ type: 'varchar', length: 100, default: '*/15 * * * *' })
  cron_expression: string;

  /** UTC unix timestamp (seconds) of the last time this schedule actually fired. */
  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    transformer: unixTimestampTransformer,
  })
  last_run_at: number | null;

  /** Whatever the underlying sync-all-servers call returned (or `{ error }` if it threw). */
  @Column({ type: 'json', nullable: true })
  last_run_summary: Record<string, unknown> | null;

  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  created_at: number;

  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  updated_at: number;

  @BeforeInsert()
  setTimestampsOnInsert() {
    const now = nowUnixSeconds();
    this.created_at = now;
    this.updated_at = now;
  }

  @BeforeUpdate()
  setTimestampOnUpdate() {
    this.updated_at = nowUnixSeconds();
  }
}
