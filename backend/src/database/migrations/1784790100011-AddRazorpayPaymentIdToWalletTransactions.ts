import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRazorpayPaymentIdToWalletTransactions1784790100011 implements MigrationInterface {
  name = 'AddRazorpayPaymentIdToWalletTransactions1784790100011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE wallet_transactions
      ADD COLUMN razorpay_payment_id VARCHAR(64) NULL,
      ADD UNIQUE INDEX IDX_wallet_transactions_razorpay_payment_id (razorpay_payment_id)
    `);
    await queryRunner.query(`
      ALTER TABLE customer_wallet_transactions
      ADD COLUMN razorpay_payment_id VARCHAR(64) NULL,
      ADD UNIQUE INDEX IDX_customer_wallet_transactions_razorpay_payment_id (razorpay_payment_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_wallet_transactions
      DROP INDEX IDX_customer_wallet_transactions_razorpay_payment_id,
      DROP COLUMN razorpay_payment_id
    `);
    await queryRunner.query(`
      ALTER TABLE wallet_transactions
      DROP INDEX IDX_wallet_transactions_razorpay_payment_id,
      DROP COLUMN razorpay_payment_id
    `);
  }
}
