import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResellersTable1784648279946 implements MigrationInterface {
  name = 'CreateResellersTable1784648279946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE resellers (
          id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

          name                VARCHAR(150)        NOT NULL,
          email               VARCHAR(150)        NULL,
          phone               VARCHAR(20)         NOT NULL,
          username            VARCHAR(100)        NULL,
          password_hash       VARCHAR(255)        NULL,
          company_name        VARCHAR(150)        NULL,

          address             VARCHAR(255)        NULL,
          city                VARCHAR(100)        NULL,
          state               VARCHAR(100)        NULL,
          pincode             VARCHAR(10)         NULL,

          status              ENUM('active','suspended','closed','deleted') NOT NULL DEFAULT 'active',

          created_at          BIGINT UNSIGNED     NOT NULL,
          updated_at          BIGINT UNSIGNED     NOT NULL,

          UNIQUE KEY uq_resellers_phone (phone),
          UNIQUE KEY uq_resellers_username (username),
          INDEX idx_resellers_status (status)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE resellers`);
  }
}
