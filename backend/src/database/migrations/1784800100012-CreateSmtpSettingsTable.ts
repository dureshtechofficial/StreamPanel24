import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSmtpSettingsTable1784800100012 implements MigrationInterface {
  name = 'CreateSmtpSettingsTable1784800100012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE smtp_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT false,
        host VARCHAR(255) NOT NULL DEFAULT '',
        port SMALLINT UNSIGNED NOT NULL DEFAULT 587,
        secure BOOLEAN NOT NULL DEFAULT false,
        username VARCHAR(255) NULL,
        password_enc VARCHAR(500) NULL,
        from_email VARCHAR(255) NOT NULL DEFAULT '',
        from_name VARCHAR(255) NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL
      ) ENGINE=InnoDB
    `);

    // Seed the single config row (disabled until an admin fills it in).
    const now = Math.floor(Date.now() / 1000);
    await queryRunner.query(
      `
        INSERT INTO smtp_settings (enabled, host, port, secure, from_email, created_at, updated_at)
        VALUES (false, '', 587, false, '', ?, ?)
      `,
      [now, now],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE smtp_settings`);
  }
}
