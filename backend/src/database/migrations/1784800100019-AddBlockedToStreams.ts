import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin "block" lock on a stream — forces it disabled and hides the
 * disable/start/restart controls in the reseller/customer portals until an
 * admin unblocks it.
 */
export class AddBlockedToStreams1784800100019 implements MigrationInterface {
  name = 'AddBlockedToStreams1784800100019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE flussonic_streams ADD COLUMN blocked TINYINT(1) NOT NULL DEFAULT 0 AFTER last_notified_disabled`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE flussonic_streams DROP COLUMN blocked`,
    );
  }
}
