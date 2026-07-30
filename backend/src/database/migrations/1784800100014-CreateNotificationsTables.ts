import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTables1784800100014 implements MigrationInterface {
  name = 'CreateNotificationsTables1784800100014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Per-event toggle: whether a customer email is sent when the event fires.
    await queryRunner.query(`
      CREATE TABLE notification_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        event_type ENUM('stream_disable', 'stream_restart', 'order_expiry') NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT false,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        UNIQUE KEY uq_notification_event (event_type)
      ) ENGINE=InnoDB
    `);

    // Append-only log of every attempt (sent / failed / skipped).
    await queryRunner.query(`
      CREATE TABLE notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        event_type ENUM('stream_disable', 'stream_restart', 'order_expiry') NOT NULL,
        customer_id BIGINT UNSIGNED NULL,
        recipient_email VARCHAR(150) NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        status ENUM('sent', 'failed', 'skipped') NOT NULL,
        error VARCHAR(500) NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        KEY idx_notifications_event (event_type),
        KEY idx_notifications_customer (customer_id),
        KEY idx_notifications_created_at (created_at)
      ) ENGINE=InnoDB
    `);

    // Seed the three event toggles, all disabled (no email was sent before this
    // feature existed — a new capability must not silently turn itself on).
    const now = Math.floor(Date.now() / 1000);
    await queryRunner.query(
      `
        INSERT INTO notification_settings (event_type, enabled, created_at, updated_at)
        VALUES ('stream_disable', false, ?, ?),
               ('stream_restart', false, ?, ?),
               ('order_expiry', false, ?, ?)
      `,
      [now, now, now, now, now, now],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE notifications`);
    await queryRunner.query(`DROP TABLE notification_settings`);
  }
}
