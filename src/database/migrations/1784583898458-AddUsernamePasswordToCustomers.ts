import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernamePasswordToCustomers1784583898458 implements MigrationInterface {
  name = 'AddUsernamePasswordToCustomers1784583898458';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
        ADD COLUMN username VARCHAR(100) NULL,
        ADD COLUMN password_hash VARCHAR(255) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE customers
        ADD UNIQUE INDEX IDX_customers_username (username)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
        DROP INDEX IDX_customers_username
    `);
    await queryRunner.query(`
      ALTER TABLE customers
        DROP COLUMN username,
        DROP COLUMN password_hash
    `);
  }
}
