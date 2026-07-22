import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletBalanceToCustomers1784760100006 implements MigrationInterface {
  name = 'AddWalletBalanceToCustomers1784760100006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
      ADD COLUMN wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
      DROP COLUMN wallet_balance
    `);
  }
}
