import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedStatusToFlussonicServers1784574309054 implements MigrationInterface {
  name = 'AddDeletedStatusToFlussonicServers1784574309054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_servers
        MODIFY COLUMN status ENUM('active','inactive','maintenance','unreachable','deleted') NOT NULL DEFAULT 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE flussonic_servers SET status = 'inactive' WHERE status = 'deleted'
    `);
    await queryRunner.query(`
      ALTER TABLE flussonic_servers
        MODIFY COLUMN status ENUM('active','inactive','maintenance','unreachable') NOT NULL DEFAULT 'active'
    `);
  }
}
