import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerWalletTransaction } from './entities/customer-wallet-transaction.entity';
import { CustomerWalletTransactionType } from './enums/customer-wallet-transaction-type.enum';
import { TopupCustomerWalletDto } from './dto/topup-customer-wallet.dto';
import { QueryCustomerWalletTransactionDto } from './dto/query-customer-wallet-transaction.dto';
import { CustomersService } from '../customers/customers.service';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class CustomerWalletService {
  constructor(
    @InjectRepository(CustomerWalletTransaction)
    private readonly transactionsRepository: Repository<CustomerWalletTransaction>,
    private readonly customersService: CustomersService,
  ) {}

  async getBalance(customerId: string): Promise<string> {
    const customer = await this.customersService.findOne(customerId);
    return customer.wallet_balance;
  }

  /**
   * Applies a signed delta to the customer's wallet and logs the transaction
   * in the same operation — the two always happen together, never one
   * without the other, so the ledger can never drift from the actual
   * balance. A negative `dto.amount` debits the wallet; `adjustWalletBalance`
   * throws before either write happens if that would take the balance below
   * zero.
   */
  async topUp(
    customerId: string,
    dto: TopupCustomerWalletDto,
    adminId: string | null,
  ): Promise<CustomerWalletTransaction> {
    const customer = await this.customersService.adjustWalletBalance(
      customerId,
      dto.amount,
    );

    const transaction = this.transactionsRepository.create({
      customer_id: customerId,
      type: CustomerWalletTransactionType.TOPUP,
      amount: dto.amount.toFixed(2),
      balance_after: customer.wallet_balance,
      remark: dto.remark ?? null,
      created_by_admin_id: adminId,
    });
    return this.transactionsRepository.save(transaction);
  }

  /**
   * Credits the wallet for a completed Razorpay top-up payment — idempotent
   * by `razorpayPaymentId`, since both the client-side verify call and the
   * async webhook end up calling this for the same payment, and the webhook
   * alone can also fire more than once. The pre-check covers the normal
   * (non-concurrent) case; the unique index on `razorpay_payment_id` catches
   * a genuinely concurrent duplicate at insert time, same read-then-write
   * race tolerance as `adjustWalletBalance` itself already has everywhere
   * else in this app (order charges/refunds, admin top-ups) — not something
   * this path alone needs to solve.
   */
  async creditFromRazorpay(
    customerId: string,
    amount: number,
    razorpayPaymentId: string,
  ): Promise<CustomerWalletTransaction> {
    const existing = await this.transactionsRepository.findOne({
      where: { razorpay_payment_id: razorpayPaymentId },
    });
    if (existing) return existing;

    const customer = await this.customersService.adjustWalletBalance(
      customerId,
      amount,
    );
    const transaction = this.transactionsRepository.create({
      customer_id: customerId,
      type: CustomerWalletTransactionType.TOPUP,
      amount: amount.toFixed(2),
      balance_after: customer.wallet_balance,
      remark: `Razorpay top-up (${razorpayPaymentId})`,
      created_by_admin_id: null,
      razorpay_payment_id: razorpayPaymentId,
    });

    try {
      return await this.transactionsRepository.save(transaction);
    } catch (err) {
      const isDuplicate =
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === 'ER_DUP_ENTRY';
      if (!isDuplicate) throw err;
      const winner = await this.transactionsRepository.findOne({
        where: { razorpay_payment_id: razorpayPaymentId },
      });
      if (winner) return winner;
      throw err;
    }
  }

  /**
   * Debits the customer's wallet for an order purchase — called by
   * OrdersService.create *before* the order row exists (stream assignment
   * and order insert can still fail), so `order_id` starts null here and is
   * patched in via `attachOrder` once the order is actually persisted.
   * Throws (via adjustWalletBalance) if the balance would go negative.
   */
  async chargeForOrder(
    customerId: string,
    amount: number,
    remark: string | null,
  ): Promise<CustomerWalletTransaction> {
    const customer = await this.customersService.adjustWalletBalance(
      customerId,
      -amount,
    );
    const transaction = this.transactionsRepository.create({
      customer_id: customerId,
      type: CustomerWalletTransactionType.ORDER_PAYMENT,
      amount: (-amount).toFixed(2),
      balance_after: customer.wallet_balance,
      remark,
      created_by_admin_id: null,
      order_id: null,
    });
    return this.transactionsRepository.save(transaction);
  }

  /**
   * Patches `order_id` in and prefixes the remark with the now-known order
   * number (e.g. "ORD-2026-000123 — Order for plan ...") — the charge itself
   * happens before the order row exists, so the number isn't known yet at
   * `chargeForOrder` time.
   */
  async attachOrder(
    transactionId: string,
    orderId: string,
    orderNumber: string,
  ): Promise<void> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id: transactionId },
    });
    if (!transaction) return;

    await this.transactionsRepository.update(transactionId, {
      order_id: orderId,
      remark: transaction.remark
        ? `${orderNumber} — ${transaction.remark}`
        : orderNumber,
    });
  }

  /**
   * Refunds an order's wallet charge on cancellation. `amount` is the
   * caller-computed prorated refund (see OrdersService.calculateRefundAmount)
   * — this method only decides *whether* to refund, not how much: it looks
   * up the original `order_payment` debit for this order and no-ops if none
   * exists (the order was never actually billed to this customer's wallet,
   * e.g. paid by cash or billed to a reseller's wallet instead) or if
   * `amount` is zero or negative (e.g. the order was already fully consumed
   * by the time it was cancelled). The refund is also capped at the
   * original charge amount, so a prorated figure can never credit back more
   * than was actually taken.
   */
  async refundForOrder(
    customerId: string,
    orderId: string,
    amount: number,
    remark: string | null,
  ): Promise<CustomerWalletTransaction | null> {
    if (amount <= 0) {
      return null;
    }

    const charge = await this.transactionsRepository.findOne({
      where: {
        order_id: orderId,
        type: CustomerWalletTransactionType.ORDER_PAYMENT,
      },
      order: { created_at: 'ASC' },
    });
    if (!charge || Number(charge.amount) >= 0) {
      return null;
    }

    const refundAmount = Math.min(amount, -Number(charge.amount));
    const customer = await this.customersService.adjustWalletBalance(
      customerId,
      refundAmount,
    );
    const transaction = this.transactionsRepository.create({
      customer_id: customerId,
      type: CustomerWalletTransactionType.ORDER_PAYMENT,
      amount: refundAmount.toFixed(2),
      balance_after: customer.wallet_balance,
      remark,
      created_by_admin_id: null,
      order_id: orderId,
    });
    return this.transactionsRepository.save(transaction);
  }

  async findTransactions(
    customerId: string,
    query: QueryCustomerWalletTransactionDto,
  ): Promise<PaginatedResult<CustomerWalletTransaction>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.transactionsRepository.findAndCount({
      where: { customer_id: customerId },
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
