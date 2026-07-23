import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a stream identity snapshot to orders (name/title/ingest_domain),
 * captured at purchase time (OrdersService.create) — same reasoning as the
 * customer/plan invoicing snapshot: a stream can be renamed, reconfigured,
 * or reassigned to a different customer later without altering a past
 * order's record of what was actually billed. Existing rows are backfilled
 * from the *current* flussonic_streams data (best-effort reconstruction).
 */
export class AddStreamSnapshotToOrders1784750100005 implements MigrationInterface {
  name = 'AddStreamSnapshotToOrders1784750100005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN stream_name VARCHAR(150) NULL,
      ADD COLUMN stream_title VARCHAR(255) NULL,
      ADD COLUMN stream_ingest_domain VARCHAR(255) NULL
    `);

    await queryRunner.query(`
      UPDATE orders o
      JOIN flussonic_streams s ON s.id = o.stream_id
      SET o.stream_name = JSON_UNQUOTE(JSON_EXTRACT(s.config_json, '$.name')),
          o.stream_title = JSON_UNQUOTE(JSON_EXTRACT(s.config_json, '$.title')),
          o.stream_ingest_domain = s.ingest_domain
    `);
    // A handful of orders may reference a stream id that no longer resolves
    // — fall back to a placeholder rather than leaving the NOT NULL column null.
    await queryRunner.query(`
      UPDATE orders
      SET stream_name = COALESCE(stream_name, 'Unknown stream')
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      MODIFY COLUMN stream_name VARCHAR(150) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN stream_name,
      DROP COLUMN stream_title,
      DROP COLUMN stream_ingest_domain
    `);
  }
}
