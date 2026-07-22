import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderPaymentToWalletTransactions1784720100002 implements MigrationInterface {
  name = 'AddOrderPaymentToWalletTransactions1784720100002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE wallet_transactions
      MODIFY COLUMN type ENUM('topup', 'order_payment') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE wallet_transactions
      ADD COLUMN order_id BIGINT UNSIGNED NULL,
      ADD INDEX idx_wallet_transactions_order_id (order_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE wallet_transactions
      DROP INDEX idx_wallet_transactions_order_id,
      DROP COLUMN order_id
    `);
    await queryRunner.query(`
      ALTER TABLE wallet_transactions
      MODIFY COLUMN type ENUM('topup') NOT NULL
    `);
  }
}
