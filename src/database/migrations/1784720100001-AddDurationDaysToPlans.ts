import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDurationDaysToPlans1784720100001 implements MigrationInterface {
  name = 'AddDurationDaysToPlans1784720100001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE plans
      ADD COLUMN duration_days INT UNSIGNED NOT NULL DEFAULT 30
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE plans
      DROP COLUMN duration_days
    `);
  }
}
