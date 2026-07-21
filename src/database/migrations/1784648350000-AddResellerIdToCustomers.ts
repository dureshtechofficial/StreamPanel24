import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResellerIdToCustomers1784648350000 implements MigrationInterface {
  name = 'AddResellerIdToCustomers1784648350000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
      ADD COLUMN reseller_id BIGINT UNSIGNED NULL,
      ADD INDEX IDX_customers_reseller_id (reseller_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
      DROP INDEX IDX_customers_reseller_id,
      DROP COLUMN reseller_id
    `);
  }
}
