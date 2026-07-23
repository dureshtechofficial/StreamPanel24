import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderCancelSettingsTable1784705894611 implements MigrationInterface {
  name = 'CreateOrderCancelSettingsTable1784705894611';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE order_cancel_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        actor_type ENUM('admin','reseller','customer') NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        UNIQUE KEY uq_order_cancel_settings_actor_type (actor_type)
      ) ENGINE=InnoDB
    `);

    const now = Math.floor(Date.now() / 1000);
    await queryRunner.query(
      `INSERT INTO order_cancel_settings (actor_type, enabled, created_at, updated_at) VALUES (?, TRUE, ?, ?), (?, TRUE, ?, ?), (?, TRUE, ?, ?)`,
      ['admin', now, now, 'reseller', now, now, 'customer', now, now],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE order_cancel_settings`);
  }
}
