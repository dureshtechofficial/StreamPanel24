import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLiveStatsJsonToFlussonicStreams1784624390551 implements MigrationInterface {
  name = 'AddLiveStatsJsonToFlussonicStreams1784624390551';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_streams
        ADD COLUMN live_stats_json JSON NULL AFTER config_json
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_streams
        DROP COLUMN live_stats_json
    `);
  }
}
