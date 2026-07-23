import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWalletTransactionsTable1784710953348 implements MigrationInterface {
  name = 'CreateWalletTransactionsTable1784710953348';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE wallet_transactions (
        id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        reseller_id           BIGINT UNSIGNED NOT NULL,
        type                  ENUM('topup') NOT NULL,
        amount                DECIMAL(10,2) NOT NULL,
        balance_after         DECIMAL(10,2) NOT NULL,
        remark                VARCHAR(255) NULL,
        created_by_admin_id   VARCHAR(36) NULL,
        created_at            BIGINT UNSIGNED NOT NULL,
        INDEX idx_wallet_transactions_reseller_id (reseller_id),
        INDEX idx_wallet_transactions_created_at (created_at)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE wallet_transactions`);
  }
}
