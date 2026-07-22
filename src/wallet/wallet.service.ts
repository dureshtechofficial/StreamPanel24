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
   * Credits the reseller's wallet and logs the transaction in the same
   * operation — the two always happen together, never one without the other,
   * so the ledger can never drift from the actual balance.
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
