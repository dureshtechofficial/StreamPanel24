import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFlussonicStreamSessionsTable1784632569105 implements MigrationInterface {
  name = 'CreateFlussonicStreamSessionsTable1784632569105';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
        ipwhois_json JSON NULL,
        UNIQUE INDEX IDX_fss_session_uuid (session_uuid),
        INDEX IDX_fss_stream (flussonic_stream_id),
        CONSTRAINT FK_fss_stream FOREIGN KEY (flussonic_stream_id)
          REFERENCES flussonic_streams(id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE flussonic_stream_sessions`);
  }
}
