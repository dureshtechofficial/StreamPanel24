import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyncFieldsToFlussonicServerStats1784575954392 implements MigrationInterface {
  name = 'AddSyncFieldsToFlussonicServerStats1784575954392';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_server_stats
        ADD COLUMN total_streams      INT UNSIGNED  NULL,
        ADD COLUMN total_clients      INT UNSIGNED  NULL,
        ADD COLUMN memory_usage_percent DECIMAL(5,2) NULL,
        ADD COLUMN scheduler_load     INT UNSIGNED  NULL,
        ADD COLUMN streamer_status    VARCHAR(20)   NULL,
        ADD COLUMN server_version     VARCHAR(20)   NULL,
        ADD COLUMN raw_response       JSON          NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_server_stats
        DROP COLUMN total_streams,
        DROP COLUMN total_clients,
        DROP COLUMN memory_usage_percent,
        DROP COLUMN scheduler_load,
        DROP COLUMN streamer_status,
        DROP COLUMN server_version,
        DROP COLUMN raw_response
    `);
  }
}
