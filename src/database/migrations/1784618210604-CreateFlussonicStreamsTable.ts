import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFlussonicStreamsTable1784618210604 implements MigrationInterface {
  name = 'CreateFlussonicStreamsTable1784618210604';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE flussonic_streams (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        flussonic_server_id BIGINT UNSIGNED NOT NULL,
        ingest_domain VARCHAR(255) NULL,
        config_json JSON NOT NULL,
        status ENUM('active','inactive','deleted') NOT NULL DEFAULT 'active',
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        deleted_at BIGINT UNSIGNED NULL,
        INDEX IDX_flussonic_streams_server (flussonic_server_id),
        INDEX IDX_flussonic_streams_status (status),
        CONSTRAINT FK_flussonic_streams_server
          FOREIGN KEY (flussonic_server_id) REFERENCES flussonic_servers(id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE flussonic_streams`);
  }
}
