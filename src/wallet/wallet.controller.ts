import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { WalletService } from './wallet.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { QueryWalletTransactionDto } from './dto/query-wallet-transaction.dto';

@ApiTags('wallet')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('resellers/:resellerId/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @ApiOperation({ summary: "Get a reseller's wallet balance" })
  @Get()
  getBalance(@Param('resellerId') resellerId: string) {
    return this.walletService
      .getBalance(resellerId)
      .then((wallet_balance) => ({ wallet_balance }));
  }

  @ApiOperation({
    summary:
      "Adjust a reseller's wallet balance — a positive amount tops up, a negative amount deducts (rejected with 400 if it would take the balance below zero)",
  })
  @Post('topup')
  topUp(
    @Param('resellerId') resellerId: string,
    @Body() dto: TopupWalletDto,
    @CurrentUser() admin: User,
  ) {
    return this.walletService.topUp(resellerId, dto, admin.id);
  }

  @ApiOperation({
    summary:
      "List a reseller's wallet transaction log (paginated, newest first)",
  })
  @Get('transactions')
  findTransactions(
    @Param('resellerId') resellerId: string,
    @Query() query: QueryWalletTransactionDto,
  ) {
    return this.walletService.findTransactions(resellerId, query);
  }
}
