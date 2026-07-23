import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerActionSettingsTable1784709330859 implements MigrationInterface {
  name = 'CreateCustomerActionSettingsTable1784709330859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE customer_action_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        actor_type ENUM('admin','reseller') NOT NULL,
        action ENUM('edit','delete','assign') NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        UNIQUE KEY uq_customer_action_settings_actor_action (actor_type, action)
      ) ENGINE=InnoDB
    `);

    const now = Math.floor(Date.now() / 1000);
    const actors = ['admin', 'reseller'];
    const actions = ['edit', 'delete', 'assign'];
    const values: string[] = [];
    const params: (string | number)[] = [];
    for (const actor of actors) {
      for (const action of actions) {
        values.push('(?, ?, TRUE, ?, ?)');
        params.push(actor, action, now, now);
      }
    }

    await queryRunner.query(
      `INSERT INTO customer_action_settings (actor_type, action, enabled, created_at, updated_at) VALUES ${values.join(', ')}`,
      params,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE customer_action_settings`);
  }
}
