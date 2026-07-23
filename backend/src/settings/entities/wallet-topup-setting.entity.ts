import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WalletTopupActor } from '../enums/wallet-topup-actor.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

/**
 * One row per actor type (reseller/customer — admin has no wallet of its
 * own) — whether self-service Razorpay wallet top-up is currently enabled,
 * and the minimum amount allowed per top-up. Seeded disabled by migration:
 * unlike order-cancel (which preserves pre-existing "always allowed"
 * behavior), there is no pre-existing top-up behavior to preserve, so a
 * brand-new capability like this defaults off until an admin opts in.
 */
@Entity('wallet_topup_settings')
export class WalletTopupSetting {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'enum', enum: WalletTopupActor, unique: true })
  actor_type: WalletTopupActor;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '100.00' })
  minimum_amount: string;

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
