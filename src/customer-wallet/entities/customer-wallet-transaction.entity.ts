import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerWalletTransactionType } from '../enums/customer-wallet-transaction-type.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

/**
 * Append-only ledger — a row is written every time a customer's wallet
 * balance changes, and is never edited or deleted afterward. `balance_after`
 * snapshots the resulting balance at the time, so the log stays a reliable
 * audit trail even if `customers.wallet_balance` were ever manually
 * corrected outside this flow. Mirrors `wallet_transactions` (the reseller
 * ledger) exactly, kept as a separate table rather than a shared one with a
 * nullable reseller_id/customer_id pair — same "fully parallel, never
 * cross-wired" convention as customer-auth vs reseller-auth.
 */
@Entity('customer_wallet_transactions')
export class CustomerWalletTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  customer_id: string;

  @Column({ type: 'enum', enum: CustomerWalletTransactionType })
  type: CustomerWalletTransactionType;

  /** Signed — what this transaction changed the balance by (negative for an admin-initiated deduction). */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  /** Snapshot of the wallet balance immediately after this transaction. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance_after: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark: string | null;

  /** Which admin performed this topup — users.id (UUID), nullable since not every future transaction type will have one. */
  @Column({ type: 'varchar', length: 36, nullable: true })
  created_by_admin_id: string | null;

  /**
   * The order this charge/refund belongs to (type = order_payment only).
   * Nullable because the charge is written *before* the order row exists —
   * `OrdersService.create` patches this in via `CustomerWalletService.attachOrder`
   * once the order is actually persisted, so a failed order creation never
   * leaves an order_id pointing at nothing.
   */
  @Index()
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  order_id: string | null;

  /** Razorpay's payment id (type = topup, via self-service top-up only) — unique so a retried/duplicated webhook can never credit the wallet twice for the same payment. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  razorpay_payment_id: string | null;

  /** UTC unix timestamp (seconds). Set by the app, not MySQL. */
  @Index()
  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  created_at: number;

  @BeforeInsert()
  setTimestampOnInsert() {
    this.created_at = nowUnixSeconds();
  }
}
