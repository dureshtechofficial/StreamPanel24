import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSyncSchedulesTable1784636899106 implements MigrationInterface {
  name = 'CreateSyncSchedulesTable1784636899106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sync_schedules (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sync_type ENUM('server_stats','streams','sessions') NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT false,
        cron_expression VARCHAR(100) NOT NULL DEFAULT '*/15 * * * *',
        last_run_at BIGINT UNSIGNED NULL,
        last_run_summary JSON NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        UNIQUE INDEX IDX_sync_schedules_type (sync_type)
      ) ENGINE=InnoDB
    `);

    const now = Math.floor(Date.now() / 1000);
    await queryRunner.query(
      `
        INSERT INTO sync_schedules (sync_type, enabled, cron_expression, created_at, updated_at)
        VALUES
          ('server_stats', false, '*/15 * * * *', ?, ?),
          ('streams', false, '*/15 * * * *', ?, ?),
          ('sessions', false, '*/15 * * * *', ?, ?)
      `,
      [now, now, now, now, now, now],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE sync_schedules`);
  }
}
