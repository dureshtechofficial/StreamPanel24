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
import { CustomerWalletService } from './customer-wallet.service';
import { TopupCustomerWalletDto } from './dto/topup-customer-wallet.dto';
import { QueryCustomerWalletTransactionDto } from './dto/query-customer-wallet-transaction.dto';

@ApiTags('customer-wallet')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('customers/:customerId/wallet')
export class CustomerWalletController {
  constructor(private readonly walletService: CustomerWalletService) {}

  @ApiOperation({ summary: "Get a customer's wallet balance" })
  @Get()
  getBalance(@Param('customerId') customerId: string) {
    return this.walletService
      .getBalance(customerId)
      .then((wallet_balance) => ({ wallet_balance }));
  }

  @ApiOperation({
    summary:
      "Adjust a customer's wallet balance — a positive amount tops up, a negative amount deducts (rejected with 400 if it would take the balance below zero)",
  })
  @Post('topup')
  topUp(
    @Param('customerId') customerId: string,
    @Body() dto: TopupCustomerWalletDto,
    @CurrentUser() admin: User,
  ) {
    return this.walletService.topUp(customerId, dto, admin.id);
  }

  @ApiOperation({
    summary:
      "List a customer's wallet transaction log (paginated, newest first)",
  })
  @Get('transactions')
  findTransactions(
    @Param('customerId') customerId: string,
    @Query() query: QueryCustomerWalletTransactionDto,
  ) {
    return this.walletService.findTransactions(customerId, query);
  }
}
