import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLatestStatCacheToFlussonicServers1784578147009 implements MigrationInterface {
  name = 'AddLatestStatCacheToFlussonicServers1784578147009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_servers
        ADD COLUMN last_total_clients INT UNSIGNED NULL,
        ADD COLUMN last_uptime_seconds BIGINT UNSIGNED NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_servers
        DROP COLUMN last_total_clients,
        DROP COLUMN last_uptime_seconds
    `);
  }
}
