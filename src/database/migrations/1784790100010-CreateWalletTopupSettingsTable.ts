import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWalletTopupSettingsTable1784790100010 implements MigrationInterface {
  name = 'CreateWalletTopupSettingsTable1784790100010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE wallet_topup_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        actor_type ENUM('reseller','customer') NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT false,
        minimum_amount DECIMAL(10,2) NOT NULL DEFAULT '100.00',
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        UNIQUE INDEX IDX_wallet_topup_settings_actor (actor_type)
      ) ENGINE=InnoDB
    `);

    const now = Math.floor(Date.now() / 1000);
    await queryRunner.query(
      `
        INSERT INTO wallet_topup_settings (actor_type, enabled, minimum_amount, created_at, updated_at)
        VALUES
          ('reseller', false, '100.00', ?, ?),
          ('customer', false, '100.00', ?, ?)
      `,
      [now, now, now, now],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE wallet_topup_settings`);
  }
}
