import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFlussonicServersTable1784572199332 implements MigrationInterface {
  name = 'CreateFlussonicServersTable1784572199332';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE flussonic_servers (
          id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

          -- Identification
          name                VARCHAR(100)        NOT NULL,           -- friendly label, e.g. "Nellai-Core-01"
          hostname            VARCHAR(255)        NOT NULL,           -- FQDN or IP used to reach the management API
          domain              VARCHAR(255)        NULL,               -- public-facing streaming domain, e.g. "cdn.example.com"
          port                SMALLINT UNSIGNED   NOT NULL DEFAULT 80,
          use_ssl             BOOLEAN             NOT NULL DEFAULT FALSE,

          -- API access
          api_username        VARCHAR(100)        NOT NULL,
          api_password_enc    VARCHAR(255)        NOT NULL,           -- encrypted, not plaintext
          api_base_path       VARCHAR(100)        NOT NULL DEFAULT '/streamer/api',
          api_access_token    VARCHAR(500)        NULL,               -- bearer/OAuth token, if using token auth (v4/v5)

          -- Version awareness (drives which adapter is used)
          flussonic_version   VARCHAR(20)         NULL,               -- e.g. "23.09", filled after first sync
          api_version_tag     ENUM('v3','v4','v5','custom') NOT NULL DEFAULT 'v3',

          -- Health / status tracking
          status              ENUM('active','inactive','maintenance','unreachable') NOT NULL DEFAULT 'active',

          created_at          BIGINT UNSIGNED     NOT NULL,           -- UTC unix timestamp (seconds), app-maintained
          updated_at          BIGINT UNSIGNED     NOT NULL,           -- UTC unix timestamp (seconds), app-maintained

          UNIQUE KEY uq_hostname_port (hostname, port),
          INDEX idx_status (status)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE flussonic_servers`);
  }
}
