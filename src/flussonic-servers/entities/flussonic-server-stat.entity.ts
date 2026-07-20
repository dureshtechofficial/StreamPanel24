import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

@Entity('flussonic_server_stats')
export class FlussonicServerStat {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  server_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  cpu_usage: string | null;

  /** Percentage (0-100), as reported by config/stats' "memory_usage" — not MB. */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  memory_usage_percent: string | null;

  /** Legacy/manual-entry field; synced samples populate memory_usage_percent instead. */
  @Column({ type: 'int', unsigned: true, nullable: true })
  ram_usage_mb: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  disk_usage_gb: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  network_in_mbps: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  network_out_mbps: string | null;

  /** Currently-online streams ("online_streams" from config/stats). */
  @Column({ type: 'int', unsigned: true, nullable: true })
  active_streams: number | null;

  /** Total configured streams ("total_streams"), online or not. */
  @Column({ type: 'int', unsigned: true, nullable: true })
  total_streams: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  active_viewers: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  active_publishers: number | null;

  /** "total_clients" from config/stats — combined viewers + publishers + API clients. */
  @Column({ type: 'int', unsigned: true, nullable: true })
  total_clients: number | null;

  /** Scheduler/transcoder load percentage ("scheduler_load"). */
  @Column({ type: 'int', unsigned: true, nullable: true })
  scheduler_load: number | null;

  /** Flussonic's own process state ("streamer_status", e.g. "running"). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  streamer_status: string | null;

  /** Flussonic build version at the time of this sample ("server_version", e.g. "24.03"). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  server_version: string | null;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    transformer: unixTimestampTransformer,
  })
  uptime_seconds: number | null;

  /** Full config/stats response for this sample, for fields we don't have a dedicated column for yet. */
  @Column({ type: 'json', nullable: true })
  raw_response: Record<string, unknown> | null;

  /** UTC unix timestamp (seconds) this sample was recorded. Set by the app, not MySQL. */
  @Index()
  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  created_at: number;

  @BeforeInsert()
  setTimestampOnInsert() {
    this.created_at = nowUnixSeconds();
  }
}
