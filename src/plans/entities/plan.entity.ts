import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlanStatus } from '../enums/plan-status.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  /** List/ceiling price. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  mrp: string;

  /** Price charged to a direct (non-reseller) customer. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  customer_price: string;

  /** Source of truth for the reseller discount — reseller_price is recomputed from this + customer_price on every save. */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  reseller_percentage: string;

  /** = customer_price * (1 - reseller_percentage / 100). Never client-settable directly — see PlansService. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reseller_price: string;

  /** Subscription length in days — snapshotted onto every order created from this plan; Order.duration_days is no longer client-supplied. */
  @Column({ type: 'int', unsigned: true, default: 30 })
  duration_days: number;

  @Column({ type: 'int', unsigned: true, default: 1 })
  max_streams: number;

  @Column({ type: 'int', unsigned: true, default: 1 })
  max_connections: number;

  /** Allowed protocol keys, e.g. ["hls","rtmp","dash"] — same keys as FlussonicStreamConfig.protocols. */
  @Column({ type: 'json', nullable: true })
  playback_protocols: string[] | null;

  @Column({ type: 'boolean', default: true })
  show_customer: boolean;

  @Column({ type: 'boolean', default: true })
  show_reseller: boolean;

  @Index()
  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.ACTIVE,
  })
  status: PlanStatus;

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
