import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedStatusToCustomers1784574309053 implements MigrationInterface {
  name = 'AddDeletedStatusToCustomers1784574309053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
        MODIFY COLUMN status ENUM('active','suspended','closed','deleted') NOT NULL DEFAULT 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE customers SET status = 'closed' WHERE status = 'deleted'
    `);
    await queryRunner.query(`
      ALTER TABLE customers
        MODIFY COLUMN status ENUM('active','suspended','closed') NOT NULL DEFAULT 'active'
    `);
  }
}
