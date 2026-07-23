import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSyncScheduleRunsTable1784639387157 implements MigrationInterface {
  name = 'CreateSyncScheduleRunsTable1784639387157';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sync_schedule_runs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sync_type ENUM('server_stats','streams','sessions') NOT NULL,
        ran_at BIGINT UNSIGNED NOT NULL,
        success BOOLEAN NOT NULL,
        summary JSON NOT NULL,
        INDEX IDX_sync_schedule_runs_type_ran_at (sync_type, ran_at)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE sync_schedule_runs`);
  }
}
