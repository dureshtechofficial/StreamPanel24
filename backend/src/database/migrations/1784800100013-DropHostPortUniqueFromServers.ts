import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * (hostname, port) uniqueness is now enforced only among *active* servers, at
 * the application layer (FlussonicServersService.assertHostPortAvailable) —
 * a soft-deleted server's hostname:port is released for reuse. MySQL can't
 * express a status-filtered unique index, so the hard `uq_hostname_port`
 * unique key is dropped and replaced with a plain (non-unique) lookup index.
 */
export class DropHostPortUniqueFromServers1784800100013 implements MigrationInterface {
  name = 'DropHostPortUniqueFromServers1784800100013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE flussonic_servers DROP INDEX uq_hostname_port`,
    );
    await queryRunner.query(
      `ALTER TABLE flussonic_servers ADD INDEX idx_hostname_port (hostname, port)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE flussonic_servers DROP INDEX idx_hostname_port`,
    );
    // NOTE: re-adding the unique key will fail if active+deleted (or multiple
    // deleted) rows now share a hostname:port — that's expected, since this
    // down migration reverts to the stricter "reserved forever" behavior.
    await queryRunner.query(
      `ALTER TABLE flussonic_servers ADD UNIQUE KEY uq_hostname_port (hostname, port)`,
    );
  }
}
