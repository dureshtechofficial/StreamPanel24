import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyncedAtToFlussonicStreamSessions1784634429270 implements MigrationInterface {
  name = 'AddSyncedAtToFlussonicStreamSessions1784634429270';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_stream_sessions
        ADD COLUMN synced_at BIGINT UNSIGNED NULL AFTER ipwhois_json
    `);
    // Backfill existing rows with their last-known updated_at (best available
    // approximation of "when we last saw this session") before making it required.
    await queryRunner.query(`
      UPDATE flussonic_stream_sessions
        SET synced_at = COALESCE(updated_at, UNIX_TIMESTAMP())
        WHERE synced_at IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE flussonic_stream_sessions
        MODIFY COLUMN synced_at BIGINT UNSIGNED NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE flussonic_stream_sessions
        ADD INDEX IDX_fss_synced_at (synced_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_stream_sessions
        DROP INDEX IDX_fss_synced_at
    `);
    await queryRunner.query(`
      ALTER TABLE flussonic_stream_sessions
        DROP COLUMN synced_at
    `);
  }
}
