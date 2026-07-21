import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTable1784653049424 implements MigrationInterface {
  name = 'CreateOrdersTable1784653049424';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE orders (
          id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          order_number            VARCHAR(40)         NOT NULL,

          plan_id                 BIGINT UNSIGNED     NOT NULL,
          stream_id               BIGINT UNSIGNED     NOT NULL,
          customer_id             BIGINT UNSIGNED     NOT NULL,
          reseller_id             BIGINT UNSIGNED     NULL,

          price                   DECIMAL(10,2)       NOT NULL,
          duration_days           INT UNSIGNED        NOT NULL,
          max_streams             INT UNSIGNED        NOT NULL DEFAULT 1,
          max_connections         INT UNSIGNED        NOT NULL DEFAULT 1,
          playback_protocols      JSON                NULL,

          effective_from          BIGINT UNSIGNED     NOT NULL,
          effective_to            BIGINT UNSIGNED     NOT NULL,

          status                  ENUM('active','expired','cancelled','suspended') NOT NULL DEFAULT 'active',

          payment_method          VARCHAR(30)         NOT NULL,
          payment_status          ENUM('pending','paid','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
          currency                VARCHAR(3)          NOT NULL DEFAULT 'INR',
          gateway_transaction_id  VARCHAR(100)        NULL,
          gateway_response_json   JSON                NULL,

          remark                  VARCHAR(255)        NULL,

          created_at              BIGINT UNSIGNED     NOT NULL,
          updated_at              BIGINT UNSIGNED     NOT NULL,

          UNIQUE KEY uq_orders_order_number (order_number),
          INDEX idx_orders_plan_id (plan_id),
          INDEX idx_orders_stream_id (stream_id),
          INDEX idx_orders_customer_id (customer_id),
          INDEX idx_orders_reseller_id (reseller_id),
          INDEX idx_orders_status (status),
          INDEX idx_orders_payment_status (payment_status),
          INDEX idx_orders_gateway_transaction_id (gateway_transaction_id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE orders`);
  }
}
