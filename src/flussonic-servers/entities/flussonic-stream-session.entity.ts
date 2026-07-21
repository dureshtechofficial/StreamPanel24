import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { unixTimestampTransformer } from '../../common/utils/unix-timestamp.util';

/**
 * A viewer/publisher session pulled from Flussonic's real `GET sessions`
 * endpoint. Rows are upserted by `session_uuid` on each sync (one row per
 * real session, refreshed while it's ongoing) — this is a log of sessions
 * we've observed, not something created/edited through this app directly.
 */
@Entity('flussonic_stream_sessions')
export class FlussonicStreamSession {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  /** Null if the session's stream name didn't match any known local stream. */
  @Index()
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  flussonic_stream_id: string | null;

  /** Flussonic's own session id (its `sessions[].id`). */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  session_uuid: string;

  @Column({ type: 'varchar', length: 255 })
  stream_name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  type: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  /** UTC unix timestamp (seconds) — converted from Flussonic's millisecond value. */
  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    transformer: unixTimestampTransformer,
  })
  started_at: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  proto: string | null;

  /** UTC unix timestamp (seconds) — Flussonic's own session `updated_at`, converted from milliseconds. */
  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    transformer: unixTimestampTransformer,
  })
  updated_at: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  country: string | null;

  /** Full response from the ipwho.is lookup for `ip`, fetched once when the session is first seen. */
  @Column({ type: 'json', nullable: true })
  ipwhois_json: Record<string, unknown> | null;

  /**
   * UTC unix timestamp (seconds) of the sync run that last touched this row —
   * one value captured per `syncFromFlussonic` call, stamped on every session
   * it creates/updates. A row whose `synced_at` is older than a server's most
   * recent sync means Flussonic no longer reported it (the session ended).
   */
  @Index()
  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  synced_at: number;
}
