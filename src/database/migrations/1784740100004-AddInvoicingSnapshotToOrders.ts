import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a customer/plan invoicing snapshot to orders — captured once at
 * purchase time (OrdersService.create), same reasoning as the existing
 * price/duration_days/max_streams snapshot: a later rename/edit to the
 * customer or plan must never alter a past invoice. Existing rows are
 * backfilled from the *current* customers/plans tables as a best-effort
 * reconstruction (soft-deleted rows are still joined, since they're never
 * physically removed) — new orders from here on capture the true
 * point-in-time values.
 */
export class AddInvoicingSnapshotToOrders1784740100004 implements MigrationInterface {
  name = 'AddInvoicingSnapshotToOrders1784740100004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN plan_name VARCHAR(100) NULL,
      ADD COLUMN plan_description VARCHAR(255) NULL,
      ADD COLUMN customer_name VARCHAR(150) NULL,
      ADD COLUMN customer_email VARCHAR(150) NULL,
      ADD COLUMN customer_phone VARCHAR(20) NULL,
      ADD COLUMN customer_company_name VARCHAR(150) NULL,
      ADD COLUMN customer_address VARCHAR(255) NULL,
      ADD COLUMN customer_city VARCHAR(100) NULL,
      ADD COLUMN customer_state VARCHAR(100) NULL,
      ADD COLUMN customer_pincode VARCHAR(10) NULL
    `);

    await queryRunner.query(`
      UPDATE orders o
      JOIN plans p ON p.id = o.plan_id
      SET o.plan_name = p.name,
          o.plan_description = p.description
    `);
    await queryRunner.query(`
      UPDATE orders o
      JOIN customers c ON c.id = o.customer_id
      SET o.customer_name = c.name,
          o.customer_email = c.email,
          o.customer_phone = c.phone,
          o.customer_company_name = c.company_name,
          o.customer_address = c.address,
          o.customer_city = c.city,
          o.customer_state = c.state,
          o.customer_pincode = c.pincode
    `);
    // A handful of orders may reference a plan/customer id that no longer
    // resolves (e.g. pre-existing data inconsistency) — fall back to a
    // placeholder rather than leaving the NOT NULL columns null.
    await queryRunner.query(`
      UPDATE orders
      SET plan_name = COALESCE(plan_name, 'Unknown plan'),
          customer_name = COALESCE(customer_name, 'Unknown customer'),
          customer_phone = COALESCE(customer_phone, '')
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      MODIFY COLUMN plan_name VARCHAR(100) NOT NULL,
      MODIFY COLUMN customer_name VARCHAR(150) NOT NULL,
      MODIFY COLUMN customer_phone VARCHAR(20) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN plan_name,
      DROP COLUMN plan_description,
      DROP COLUMN customer_name,
      DROP COLUMN customer_email,
      DROP COLUMN customer_phone,
      DROP COLUMN customer_company_name,
      DROP COLUMN customer_address,
      DROP COLUMN customer_city,
      DROP COLUMN customer_state,
      DROP COLUMN customer_pincode
    `);
  }
}
