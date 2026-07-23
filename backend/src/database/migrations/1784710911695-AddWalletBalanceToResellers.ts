import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletBalanceToResellers1784710911695 implements MigrationInterface {
  name = 'AddWalletBalanceToResellers1784710911695';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE resellers
      ADD COLUMN wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE resellers
      DROP COLUMN wallet_balance
    `);
  }
}
