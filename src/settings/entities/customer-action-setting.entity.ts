import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerActionActor } from '../enums/customer-action-actor.enum';
import { CustomerAction } from '../enums/customer-action.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

/**
 * One row per (actor_type, action) — whether admin/reseller is currently
 * allowed to edit/delete/assign-streams on a customer. Seeded with all six
 * combinations enabled by migration (matches behavior before this setting
 * existed).
 */
@Entity('customer_action_settings')
@Index(['actor_type', 'action'], { unique: true })
export class CustomerActionSetting {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'enum', enum: CustomerActionActor })
  actor_type: CustomerActionActor;

  @Column({ type: 'enum', enum: CustomerAction })
  action: CustomerAction;

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
