import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiVersionTag } from '../enums/api-version-tag.enum';
import { FlussonicServerStatus } from '../enums/flussonic-server-status.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

@Entity('flussonic_servers')
export class FlussonicServer {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  // Identification
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  hostname: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  domain: string | null;

  @Column({ type: 'smallint', unsigned: true, default: 80 })
  port: number;

  @Column({ type: 'boolean', default: false })
  use_ssl: boolean;

  // API access
  @Column({ type: 'varchar', length: 100 })
  api_username: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  api_password_enc: string;

  @Column({ type: 'varchar', length: 100, default: '/streamer/api' })
  api_base_path: string;

  @Exclude()
  @Column({ type: 'varchar', length: 500, nullable: true })
  api_access_token: string | null;

  // Version awareness (drives which adapter is used)
  @Column({ type: 'varchar', length: 20, nullable: true })
  flussonic_version: string | null;

  @Column({ type: 'enum', enum: ApiVersionTag, default: ApiVersionTag.V3 })
  api_version_tag: ApiVersionTag;

  // Health / status tracking
  @Index()
  @Column({
    type: 'enum',
    enum: FlussonicServerStatus,
    default: FlussonicServerStatus.ACTIVE,
  })
  status: FlussonicServerStatus;

  /** Cached from the most recent successful sync (config/stats' total_clients/uptime). */
  @Column({ type: 'int', unsigned: true, nullable: true })
  last_total_clients: number | null;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    transformer: unixTimestampTransformer,
  })
  last_uptime_seconds: number | null;

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
