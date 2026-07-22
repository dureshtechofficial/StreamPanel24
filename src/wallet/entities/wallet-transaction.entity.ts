import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WalletTransactionType } from '../enums/wallet-transaction-type.enum';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

/**
 * Append-only ledger — a row is written every time a reseller's wallet
 * balance changes, and is never edited or deleted afterward. `balance_after`
 * snapshots the resulting balance at the time, so the log stays a reliable
 * audit trail even if `resellers.wallet_balance` were ever manually
 * corrected outside this flow.
 */
@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  reseller_id: string;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type: WalletTransactionType;

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
