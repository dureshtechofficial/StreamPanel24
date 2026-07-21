import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerIdToFlussonicStreams1784641378707 implements MigrationInterface {
  name = 'AddCustomerIdToFlussonicStreams1784641378707';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_streams
      ADD COLUMN customer_id BIGINT UNSIGNED NULL,
      ADD INDEX IDX_flussonic_streams_customer_id (customer_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flussonic_streams
      DROP INDEX IDX_flussonic_streams_customer_id,
      DROP COLUMN customer_id
    `);
  }
}
