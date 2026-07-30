import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStreamStartNotification1784800100015
  implements MigrationInterface
{
  name = 'AddStreamStartNotification1784800100015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Widen both enums to include the new "stream started" (disabled→enabled) event.
    await queryRunner.query(`
      ALTER TABLE notification_settings
      MODIFY event_type ENUM('stream_disable', 'stream_start', 'stream_restart', 'order_expiry') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE notifications
      MODIFY event_type ENUM('stream_disable', 'stream_start', 'stream_restart', 'order_expiry') NOT NULL
    `);

    // Seed the new toggle, disabled (a new capability never turns itself on).
    const now = Math.floor(Date.now() / 1000);
    await queryRunner.query(
      `
        INSERT INTO notification_settings (event_type, enabled, created_at, updated_at)
        VALUES ('stream_start', false, ?, ?)
      `,
      [now, now],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop any rows using the value before narrowing the enum back.
    await queryRunner.query(
      `DELETE FROM notification_settings WHERE event_type = 'stream_start'`,
    );
    await queryRunner.query(
      `DELETE FROM notifications WHERE event_type = 'stream_start'`,
    );
    await queryRunner.query(`
      ALTER TABLE notification_settings
      MODIFY event_type ENUM('stream_disable', 'stream_restart', 'order_expiry') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE notifications
      MODIFY event_type ENUM('stream_disable', 'stream_restart', 'order_expiry') NOT NULL
    `);
  }
}
