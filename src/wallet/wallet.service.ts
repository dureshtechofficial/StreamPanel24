import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletTransactionType } from './enums/wallet-transaction-type.enum';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { QueryWalletTransactionDto } from './dto/query-wallet-transaction.dto';
import { ResellersService } from '../resellers/resellers.service';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletTransaction)
    private readonly transactionsRepository: Repository<WalletTransaction>,
    private readonly resellersService: ResellersService,
  ) {}

  async getBalance(resellerId: string): Promise<string> {
    const reseller = await this.resellersService.findOne(resellerId);
    return reseller.wallet_balance;
  }

  /**
   * Applies a signed delta to the reseller's wallet and logs the transaction
   * in the same operation — the two always happen together, never one
   * without the other, so the ledger can never drift from the actual
   * balance. A negative `dto.amount` debits the wallet; `adjustWalletBalance`
   * throws before either write happens if that would take the balance below
   * zero.
   */
  async topUp(
    resellerId: string,
    dto: TopupWalletDto,
    adminId: string | null,
  ): Promise<WalletTransaction> {
    const reseller = await this.resellersService.adjustWalletBalance(
      resellerId,
      dto.amount,
    );

    const transaction = this.transactionsRepository.create({
      reseller_id: resellerId,
      type: WalletTransactionType.TOPUP,
      amount: dto.amount.toFixed(2),
      balance_after: reseller.wallet_balance,
      remark: dto.remark ?? null,
      created_by_admin_id: adminId,
    });
    return this.transactionsRepository.save(transaction);
  }

  /**
   * Debits the reseller's wallet for an order purchase — called by
   * OrdersService.create *before* the order row exists (stream assignment
   * and order insert can still fail), so `order_id` starts null here and is
   * patched in via `attachOrder` once the order is actually persisted.
   * Throws (via adjustWalletBalance) if the balance would go negative.
   */
  async chargeForOrder(
    resellerId: string,
    amount: number,
    remark: string | null,
  ): Promise<WalletTransaction> {
    const reseller = await this.resellersService.adjustWalletBalance(
      resellerId,
      -amount,
    );
    const transaction = this.transactionsRepository.create({
      reseller_id: resellerId,
      type: WalletTransactionType.ORDER_PAYMENT,
      amount: (-amount).toFixed(2),
      balance_after: reseller.wallet_balance,
      remark,
      created_by_admin_id: null,
      order_id: null,
    });
    return this.transactionsRepository.save(transaction);
  }

  async attachOrder(transactionId: string, orderId: string): Promise<void> {
    await this.transactionsRepository.update(transactionId, {
      order_id: orderId,
    });
  }

  /**
   * Refunds an order's wallet charge on cancellation. Looks up the original
   * `order_payment` debit for this order rather than trusting the order's
   * live `price` — if no charge exists (the order was never actually billed
   * to a wallet, e.g. created via the admin route), this is a silent no-op
   * rather than crediting money that was never taken.
   */
  async refundForOrder(
    resellerId: string,
    orderId: string,
    remark: string | null,
  ): Promise<WalletTransaction | null> {
    const charge = await this.transactionsRepository.findOne({
      where: { order_id: orderId, type: WalletTransactionType.ORDER_PAYMENT },
      order: { created_at: 'ASC' },
    });
    if (!charge || Number(charge.amount) >= 0) {
      return null;
    }

    const refundAmount = -Number(charge.amount);
    const reseller = await this.resellersService.adjustWalletBalance(
      resellerId,
      refundAmount,
    );
    const transaction = this.transactionsRepository.create({
      reseller_id: resellerId,
      type: WalletTransactionType.ORDER_PAYMENT,
      amount: refundAmount.toFixed(2),
      balance_after: reseller.wallet_balance,
      remark,
      created_by_admin_id: null,
      order_id: orderId,
    });
    return this.transactionsRepository.save(transaction);
  }

  async findTransactions(
    resellerId: string,
    query: QueryWalletTransactionDto,
  ): Promise<PaginatedResult<WalletTransaction>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.transactionsRepository.findAndCount({
      where: { reseller_id: resellerId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
