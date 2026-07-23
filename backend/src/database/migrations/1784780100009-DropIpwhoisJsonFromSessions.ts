import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropIpwhoisJsonFromSessions1784780100009 implements MigrationInterface {
  name = 'DropIpwhoisJsonFromSessions1784780100009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_stream_sessions
      DROP COLUMN ipwhois_json
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_stream_sessions
      ADD COLUMN ipwhois_json JSON NULL
    `);
  }
}
