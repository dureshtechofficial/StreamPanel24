import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * reseller_price was originally computed off `mrp` (the list/ceiling price);
 * it should have been off `customer_price` (what a direct customer actually
 * pays) — a 20% reseller_percentage on a plan with mrp 1200 / customer_price
 * 1000 should discount to 800, not 960. This recomputes every existing row
 * with the corrected formula; new rows already use it via
 * PlansService.computeResellerPrice.
 */
export class RecomputeResellerPriceFromCustomerPrice1784730100003 implements MigrationInterface {
  name = 'RecomputeResellerPriceFromCustomerPrice1784730100003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans
      SET reseller_price = GREATEST(0, ROUND(customer_price * (1 - reseller_percentage / 100), 2))
    `);
  }

  public async down(): Promise<void> {
    // Not reversible — the pre-migration mrp-based values aren't recoverable
    // (customer_price/mrp/reseller_percentage may have changed since).
  }
}
