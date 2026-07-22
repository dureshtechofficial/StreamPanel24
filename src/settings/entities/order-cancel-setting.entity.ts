import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderCancelActor } from '../enums/order-cancel-actor.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

/**
 * One row per actor type — whether admin/reseller/customer is currently
 * allowed to cancel an order at all. Seeded with all three enabled by
 * migration (matches the behavior before this setting existed).
 */
@Entity('order_cancel_settings')
export class OrderCancelSetting {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'enum', enum: OrderCancelActor, unique: true })
  actor_type: OrderCancelActor;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

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
