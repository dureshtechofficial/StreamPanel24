import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerWalletTransactionsTable1784760100007 implements MigrationInterface {
  name = 'CreateCustomerWalletTransactionsTable1784760100007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE customer_wallet_transactions (
        id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        customer_id           BIGINT UNSIGNED NOT NULL,
        type                  ENUM('topup', 'order_payment') NOT NULL,
        amount                DECIMAL(10,2) NOT NULL,
        balance_after         DECIMAL(10,2) NOT NULL,
        remark                VARCHAR(255) NULL,
        created_by_admin_id   VARCHAR(36) NULL,
        order_id              BIGINT UNSIGNED NULL,
        created_at            BIGINT UNSIGNED NOT NULL,
        INDEX idx_customer_wallet_transactions_customer_id (customer_id),
        INDEX idx_customer_wallet_transactions_order_id (order_id),
        INDEX idx_customer_wallet_transactions_created_at (created_at)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE customer_wallet_transactions`);
  }
}
