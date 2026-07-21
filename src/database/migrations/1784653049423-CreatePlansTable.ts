import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlansTable1784653049423 implements MigrationInterface {
  name = 'CreatePlansTable1784653049423';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE plans (
          id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

          name                  VARCHAR(100)        NOT NULL,
          description           VARCHAR(255)        NULL,

          mrp                   DECIMAL(10,2)       NOT NULL,
          customer_price        DECIMAL(10,2)       NOT NULL,
          reseller_percentage   DECIMAL(5,2)        NOT NULL DEFAULT 0,
          reseller_price        DECIMAL(10,2)       NOT NULL,

          max_streams           INT UNSIGNED        NOT NULL DEFAULT 1,
          max_connections       INT UNSIGNED        NOT NULL DEFAULT 1,
          playback_protocols    JSON                NULL,

          show_customer         BOOLEAN             NOT NULL DEFAULT TRUE,
          show_reseller         BOOLEAN             NOT NULL DEFAULT TRUE,

          status                ENUM('active','inactive','deleted') NOT NULL DEFAULT 'active',

          created_at            BIGINT UNSIGNED     NOT NULL,
          updated_at            BIGINT UNSIGNED     NOT NULL,

          INDEX idx_plans_status (status)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE plans`);
  }
}
