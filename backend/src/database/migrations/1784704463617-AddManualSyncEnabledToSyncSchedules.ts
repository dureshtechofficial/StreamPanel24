import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualSyncEnabledToSyncSchedules1784704463617 implements MigrationInterface {
  name = 'AddManualSyncEnabledToSyncSchedules1784704463617';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sync_schedules
      ADD COLUMN manual_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sync_schedules
      DROP COLUMN manual_sync_enabled
    `);
  }
}
