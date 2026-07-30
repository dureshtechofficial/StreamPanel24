import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastNotifiedDisabledToStreams1784800100016
  implements MigrationInterface
{
  name = 'AddLastNotifiedDisabledToStreams1784800100016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Memory of the disabled-state a stream disable/start notification was last
    // sent for — used to dedupe repeat emails for the same state. NULL = none
    // processed yet (existing rows), so the first real transition still emails.
    await queryRunner.query(`
      ALTER TABLE flussonic_streams
      ADD COLUMN last_notified_disabled TINYINT(1) NULL DEFAULT NULL AFTER status
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_streams
      DROP COLUMN last_notified_disabled
    `);
  }
}
