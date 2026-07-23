import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomersTable1784570407593 implements MigrationInterface {
  name = 'CreateCustomersTable1784570407593';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE customers (
          id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

          name                VARCHAR(150)        NOT NULL,
          email               VARCHAR(150)        NULL,
          phone               VARCHAR(20)         NOT NULL,
          company_name        VARCHAR(150)        NULL,

          address             VARCHAR(255)        NULL,
          city                VARCHAR(100)        NULL,
          state               VARCHAR(100)        NULL,
          pincode             VARCHAR(10)         NULL,

          status              ENUM('active','suspended','closed') NOT NULL DEFAULT 'active',

          created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

          UNIQUE KEY uq_phone (phone),
          INDEX idx_status (status)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE customers`);
  }
}
