import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderExpiryToSyncSchedules1784770100008 implements MigrationInterface {
  name = 'AddOrderExpiryToSyncSchedules1784770100008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sync_schedules
      MODIFY COLUMN sync_type ENUM('server_stats','streams','sessions','order_expiry') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE sync_schedule_runs
      MODIFY COLUMN sync_type ENUM('server_stats','streams','sessions','order_expiry') NOT NULL
    `);

    // Seeded enabled (unlike the other three, which default disabled) — an
    // hourly expiry sweep was already running unconditionally via a hardcoded
    // @Cron before this migration; seeding disabled would silently regress
    // that behavior until an admin opts back in via the settings page.
    const now = Math.floor(Date.now() / 1000);
    await queryRunner.query(
      `
        INSERT INTO sync_schedules (sync_type, enabled, manual_sync_enabled, cron_expression, created_at, updated_at)
        VALUES ('order_expiry', true, false, '0 * * * *', ?, ?)
      `,
      [now, now],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM sync_schedule_runs WHERE sync_type = 'order_expiry'`,
    );
    await queryRunner.query(
      `DELETE FROM sync_schedules WHERE sync_type = 'order_expiry'`,
    );
    await queryRunner.query(`
      ALTER TABLE sync_schedule_runs
      MODIFY COLUMN sync_type ENUM('server_stats','streams','sessions') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE sync_schedules
      MODIFY COLUMN sync_type ENUM('server_stats','streams','sessions') NOT NULL
    `);
  }
}
