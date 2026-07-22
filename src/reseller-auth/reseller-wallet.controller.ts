import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResellerJwtAccessGuard } from './guards/reseller-jwt-access.guard';
import { CurrentReseller } from './decorators/current-reseller.decorator';
import { Reseller } from '../resellers/entities/reseller.entity';
import { WalletService } from '../wallet/wallet.service';
import { QueryWalletTransactionDto } from '../wallet/dto/query-wallet-transaction.dto';

@ApiTags('reseller-auth')
@ApiBearerAuth('access-token')
@UseGuards(ResellerJwtAccessGuard)
@Controller('reseller-auth/wallet')
export class ResellerWalletController {
  constructor(private readonly walletService: WalletService) {}

  @ApiOperation({ summary: "Get the logged-in reseller's own wallet balance" })
  @Get()
  async getBalance(@CurrentReseller() reseller: Reseller) {
    const wallet_balance = await this.walletService.getBalance(reseller.id);
    return { wallet_balance };
  }

  @ApiOperation({
    summary:
      "List the logged-in reseller's own wallet transaction log (paginated, newest first)",
  })
  @Get('transactions')
  findTransactions(
    @CurrentReseller() reseller: Reseller,
    @Query() query: QueryWalletTransactionDto,
  ) {
    return this.walletService.findTransactions(reseller.id, query);
  }
}
