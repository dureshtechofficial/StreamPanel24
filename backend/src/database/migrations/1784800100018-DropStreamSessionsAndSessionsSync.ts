import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stream sessions are no longer stored — they're read live from Flussonic on
 * every request. Drops the `flussonic_stream_sessions` table and removes the
 * now-meaningless `sessions` sync schedule (its historical run-log rows are
 * left intact). The `sessions` value is left in the enum columns so those old
 * run-log rows stay readable.
 */
export class DropStreamSessionsAndSessionsSync1784800100018
  implements MigrationInterface
{
  name = 'DropStreamSessionsAndSessionsSync1784800100018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS flussonic_stream_sessions`);
    await queryRunner.query(
      `DELETE FROM sync_schedules WHERE sync_type = 'sessions'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the sessions table (final schema: synced_at present, ipwhois_json gone).
    await queryRunner.query(`
      CREATE TABLE flussonic_stream_sessions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        flussonic_stream_id BIGINT UNSIGNED NULL,
        session_uuid VARCHAR(64) NOT NULL,
        stream_name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NULL,
        ip VARCHAR(45) NULL,
        started_at BIGINT UNSIGNED NULL,
        proto VARCHAR(20) NULL,
        updated_at BIGINT UNSIGNED NULL,
        country VARCHAR(10) NULL,
        synced_at BIGINT UNSIGNED NOT NULL,
        UNIQUE INDEX IDX_fss_session_uuid (session_uuid),
        INDEX IDX_fss_stream (flussonic_stream_id),
        INDEX IDX_fss_synced_at (synced_at),
        CONSTRAINT FK_fss_stream FOREIGN KEY (flussonic_stream_id)
          REFERENCES flussonic_streams(id)
      ) ENGINE=InnoDB
    `);

    // Re-seed the sessions sync schedule (disabled), matching the original seed shape.
    const now = Math.floor(Date.now() / 1000);
    await queryRunner.query(
      `INSERT INTO sync_schedules
        (sync_type, enabled, manual_sync_enabled, cron_expression, created_at, updated_at)
       VALUES ('sessions', false, true, '*/15 * * * *', ?, ?)`,
      [now, now],
    );
  }
}
