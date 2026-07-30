import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FlussonicStreamStatus } from '../enums/flussonic-stream-status.enum';
import type { FlussonicStreamConfig } from '../interfaces/flussonic-stream-config.interface';
import type { FlussonicLiveStream } from '../interfaces/flussonic-live-stream.interface';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

@Entity('flussonic_streams')
export class FlussonicStream {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  flussonic_server_id: string;

  /** Which customer this stream is assigned to, if any — a customer has many streams, a stream at most one customer. */
  @Index()
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  customer_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ingest_domain: string | null;

  /** The exact payload submitted to/returned by Flussonic's `PUT /streams/urlencode(name)` — see FlussonicStreamConfig. */
  @Column({ type: 'json' })
  config_json: FlussonicStreamConfig;

  /** Raw per-stream object from Flussonic's real `GET streams` (live stats, media info, etc.) — set by FlussonicStreamsService.syncFromFlussonic, untouched by create/update. */
  @Column({ type: 'json', nullable: true })
  live_stats_json: FlussonicLiveStream | null;

  @Index()
  @Column({
    type: 'enum',
    enum: FlussonicStreamStatus,
    default: FlussonicStreamStatus.ACTIVE,
  })
  status: FlussonicStreamStatus;

  /**
   * The disabled-state (true = disabled, false = enabled) for which a stream
   * disable/start notification was last sent — the "memory of the previous
   * state" used to dedupe: re-applying the same state never re-emails. NULL
   * means no such notification has been processed yet. See
   * FlussonicStreamsService.update().
   */
  @Column({ type: 'boolean', nullable: true, default: null })
  last_notified_disabled: boolean | null;

  /**
   * Admin lock. When true the stream is administratively blocked: it is forced
   * to Flussonic `disabled: true` and cannot be enabled/started/restarted (by
   * anyone) until an admin unblocks it — the reseller/customer portals hide
   * those controls entirely. Distinct from `config_json.disabled`, which is the
   * ordinary on/off state.
   */
  @Column({ type: 'boolean', default: false })
  blocked: boolean;

  /** UTC unix timestamp (seconds). Set by the app, not MySQL — see @BeforeInsert/@BeforeUpdate below. */
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

  /** Set only when soft-deleted — see FlussonicStreamsService.remove(). */
  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    transformer: unixTimestampTransformer,
  })
  deleted_at: number | null;

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
