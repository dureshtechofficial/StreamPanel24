import { MigrationInterface, QueryRunner } from 'typeorm';

const NEW_ENUM = `ENUM('stream_disable', 'stream_start', 'stream_restart', 'order_expiry', 'order_expiry_reminder')`;
const OLD_ENUM = `ENUM('stream_disable', 'stream_start', 'stream_restart', 'order_expiry')`;

export class AddOrderExpiryReminder1784800100017
  implements MigrationInterface
{
  name = 'AddOrderExpiryReminder1784800100017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Widen both notification enums to include the pre-expiry payment reminder.
    await queryRunner.query(
      `ALTER TABLE notification_settings MODIFY event_type ${NEW_ENUM} NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE notifications MODIFY event_type ${NEW_ENUM} NOT NULL`,
    );

    // Seed the new toggle, disabled.
    const now = Math.floor(Date.now() / 1000);
    await queryRunner.query(
      `INSERT INTO notification_settings (event_type, enabled, created_at, updated_at)
       VALUES ('order_expiry_reminder', false, ?, ?)`,
      [now, now],
    );

    // Per-order memory so a reminder goes out at most once per calendar day.
    await queryRunner.query(
      `ALTER TABLE orders ADD COLUMN last_expiry_reminder_at BIGINT UNSIGNED NULL DEFAULT NULL AFTER remark`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE orders DROP COLUMN last_expiry_reminder_at`,
    );
    await queryRunner.query(
      `DELETE FROM notification_settings WHERE event_type = 'order_expiry_reminder'`,
    );
    await queryRunner.query(
      `DELETE FROM notifications WHERE event_type = 'order_expiry_reminder'`,
    );
    await queryRunner.query(
      `ALTER TABLE notification_settings MODIFY event_type ${OLD_ENUM} NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE notifications MODIFY event_type ${OLD_ENUM} NOT NULL`,
    );
  }
}
