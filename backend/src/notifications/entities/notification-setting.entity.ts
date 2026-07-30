import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationEvent } from '../enums/notification-event.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

/**
 * One row per notification event (stream disable / restart / order expiry) —
 * whether a customer email is sent when that event fires. Seeded with all
 * three disabled by migration (matches "no email was sent before this setting
 * existed").
 */
@Entity('notification_settings')
export class NotificationSetting {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'enum', enum: NotificationEvent })
  event_type: NotificationEvent;

  @Column({ type: 'boolean', default: false })
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
