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

  @Column({ type: 'int', unsigned: true, nullable: true })
  ram_usage_mb: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  disk_usage_gb: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  network_in_mbps: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  network_out_mbps: string | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  active_streams: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  active_viewers: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  active_publishers: number | null;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    transformer: unixTimestampTransformer,
  })
  uptime_seconds: number | null;

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
