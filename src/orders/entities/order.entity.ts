import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  /** Human-readable reference (e.g. ORD-2026-000123) for receipts/support — set right after insert, once `id` is known. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40, unique: true })
  order_number: string;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  plan_id: string;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  stream_id: string;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  customer_id: string;

  /** Snapshot of who sold this order — a customer's reseller_id can change later; this stays fixed. */
  @Index()
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  reseller_id: string | null;

  /** Everything below is a snapshot of the plan's terms at purchase time — never live-joined to `plans`,
   * so a later edit to a plan's price/limits never alters an order that was already sold. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'int', unsigned: true })
  duration_days: number;

  @Column({ type: 'int', unsigned: true, default: 1 })
  max_streams: number;

  @Column({ type: 'int', unsigned: true, default: 1 })
  max_connections: number;

  @Column({ type: 'json', nullable: true })
  playback_protocols: string[] | null;

  /** Plan name/description snapshotted at purchase time, for invoicing — same reasoning as price/duration_days above: a later rename must never alter a past invoice. */
  @Column({ type: 'varchar', length: 100 })
  plan_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  plan_description: string | null;

  /** Customer contact/billing details snapshotted at purchase time, for invoicing — frozen even if the customer's own record is later edited, renamed, or soft-deleted. */
  @Column({ type: 'varchar', length: 150 })
  customer_name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  customer_email: string | null;

  @Column({ type: 'varchar', length: 20 })
  customer_phone: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  customer_company_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customer_city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customer_state: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  customer_pincode: string | null;

  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  effective_from: number;

  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  effective_to: number;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ACTIVE,
  })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 30 })
  payment_method: string;

  @Index()
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  /** External payment/order id from the gateway, for webhook reconciliation — null until a gateway is wired up. */
  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  gateway_transaction_id: string | null;

  /** Raw webhook/response payload, for audit + debugging — same pattern as FlussonicServerStat.raw_response. */
  @Column({ type: 'json', nullable: true })
  gateway_response_json: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark: string | null;

  /** UTC unix timestamp (seconds). Set by the app, not MySQL — see @BeforeInsert/@BeforeUpdate below. */
  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  created_at: number;

  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  updated_at: number;

  @BeforeInsert()
  setTimestampsOnInsert() {
    const now = nowUnixSeconds();
    this.created_at = now;
    this.updated_at = now;
  }

  @BeforeUpdate()
  setTimestampOnUpdate() {
    this.updated_at = nowUnixSeconds();
  }
}
