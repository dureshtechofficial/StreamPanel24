import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFlussonicServerStatsTable1784572199333 implements MigrationInterface {
  name = 'CreateFlussonicServerStatsTable1784572199333';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE flussonic_server_stats (
          id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          server_id           BIGINT UNSIGNED     NOT NULL,           -- FK -> flussonic_servers.id (was "server_uuid CHAR(36)", but servers use a bigint id, not a uuid)

          cpu_usage           DECIMAL(5,2)        NULL,
          ram_usage_mb        INT UNSIGNED        NULL,
          disk_usage_gb       INT UNSIGNED        NULL,
          network_in_mbps     DECIMAL(10,2)       NULL,
          network_out_mbps    DECIMAL(10,2)       NULL,
          active_streams      INT UNSIGNED        NULL,
          active_viewers      INT UNSIGNED        NULL,
          active_publishers   INT UNSIGNED        NULL,
          uptime_seconds      BIGINT UNSIGNED     NULL,

          created_at          BIGINT UNSIGNED     NOT NULL,           -- UTC unix timestamp (seconds), app-maintained

          INDEX idx_server_id (server_id),
          INDEX idx_created_at (created_at),
          CONSTRAINT fk_server_stats_server FOREIGN KEY (server_id)
              REFERENCES flussonic_servers(id) ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE flussonic_server_stats`);
  }
}
