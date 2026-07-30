import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationEvent } from '../enums/notification-event.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

/**
 * Append-only log of every notification the app tried to send. A row is written
 * even when the email is skipped (no address) or fails (SMTP error), so the
 * admin's notifications panel is a truthful record of what happened, not just
 * what succeeded. Rows are never edited or deleted.
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Index()
  @Column({ type: 'enum', enum: NotificationEvent })
  event_type: NotificationEvent;

  /** The customer this was about, if any — nullable so a row survives even if the customer is later deleted. */
  @Index()
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  customer_id: string | null;

  /** Address the email was (attempted to be) sent to; null when skipped for a missing address. */
  @Column({ type: 'varchar', length: 150, nullable: true })
  recipient_email: string | null;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: NotificationStatus })
  status: NotificationStatus;

  /** Why it was skipped/failed, if it was — null on a successful send. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  error: string | null;

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
