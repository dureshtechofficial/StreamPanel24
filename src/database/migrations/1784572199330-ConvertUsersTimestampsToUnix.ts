import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertUsersTimestampsToUnix1784572199330 implements MigrationInterface {
  name = 'ConvertUsersTimestampsToUnix1784572199330';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN created_at_unix BIGINT UNSIGNED NULL,
        ADD COLUMN updated_at_unix BIGINT UNSIGNED NULL
    `);

    await queryRunner.query(`
      UPDATE users
      SET created_at_unix = UNIX_TIMESTAMP(created_at),
          updated_at_unix = UNIX_TIMESTAMP(updated_at)
    `);

    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN created_at,
        DROP COLUMN updated_at,
        CHANGE COLUMN created_at_unix created_at BIGINT UNSIGNED NOT NULL,
        CHANGE COLUMN updated_at_unix updated_at BIGINT UNSIGNED NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN created_at_dt DATETIME NULL,
        ADD COLUMN updated_at_dt DATETIME NULL
    `);

    await queryRunner.query(`
      UPDATE users
      SET created_at_dt = FROM_UNIXTIME(created_at),
          updated_at_dt = FROM_UNIXTIME(updated_at)
    `);

    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN created_at,
        DROP COLUMN updated_at,
        CHANGE COLUMN created_at_dt created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHANGE COLUMN updated_at_dt updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  }
}
