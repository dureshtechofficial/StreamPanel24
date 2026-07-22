import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerJwtAccessGuard } from './guards/customer-jwt-access.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerWalletService } from '../customer-wallet/customer-wallet.service';
import { QueryCustomerWalletTransactionDto } from '../customer-wallet/dto/query-customer-wallet-transaction.dto';
import { RazorpayService } from '../razorpay/razorpay.service';
import { CreateRazorpayOrderDto } from '../razorpay/dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from '../razorpay/dto/verify-razorpay-payment.dto';
import { WalletTopupSettingsService } from '../settings/wallet-topup-settings.service';
import { WalletTopupActor } from '../settings/enums/wallet-topup-actor.enum';

@ApiTags('customer-auth')
@ApiBearerAuth('access-token')
@UseGuards(CustomerJwtAccessGuard)
@Controller('customer-auth/wallet')
export class CustomerWalletPortalController {
  constructor(
    private readonly walletService: CustomerWalletService,
    private readonly razorpayService: RazorpayService,
    private readonly walletTopupSettingsService: WalletTopupSettingsService,
  ) {}

  @ApiOperation({ summary: "Get the logged-in customer's own wallet balance" })
  @Get()
  async getBalance(@CurrentCustomer() customer: Customer) {
    const wallet_balance = await this.walletService.getBalance(customer.id);
    return { wallet_balance };
  }

  @ApiOperation({
    summary:
      "List the logged-in customer's own wallet transaction log (paginated, newest first)",
  })
  @Get('transactions')
  findTransactions(
    @CurrentCustomer() customer: Customer,
    @Query() query: QueryCustomerWalletTransactionDto,
  ) {
    return this.walletService.findTransactions(customer.id, query);
  }

  @ApiOperation({
    summary:
      'Whether self-service Razorpay top-up is enabled, and the minimum amount',
  })
  @Get('topup-settings')
  async getTopupSettings() {
    const [enabled, minimum_amount] = await Promise.all([
      this.walletTopupSettingsService.isEnabled(WalletTopupActor.CUSTOMER),
      this.walletTopupSettingsService.getMinimumAmount(
        WalletTopupActor.CUSTOMER,
      ),
    ]);
    return { enabled, minimum_amount };
  }

  @ApiOperation({
    summary:
      "Create a Razorpay order to top up the logged-in customer's own wallet",
  })
  @Post('razorpay/order')
  @HttpCode(HttpStatus.CREATED)
  async createRazorpayOrder(
    @CurrentCustomer() customer: Customer,
    @Body() dto: CreateRazorpayOrderDto,
  ) {
    await this.walletTopupSettingsService.assertToppable(
      WalletTopupActor.CUSTOMER,
      dto.amount,
    );
    const order = await this.razorpayService.createOrder({
      amountRupees: dto.amount,
      actorType: 'customer',
      actorId: customer.id,
    });
    return {
      razorpay_order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: this.razorpayService.keyId,
    };
  }

  @ApiOperation({
    summary:
      "Verify a completed Razorpay checkout and credit the logged-in customer's own wallet",
  })
  @Post('razorpay/verify')
  async verifyRazorpayPayment(
    @CurrentCustomer() customer: Customer,
    @Body() dto: VerifyRazorpayPaymentDto,
  ) {
    const validSignature = this.razorpayService.verifyPaymentSignature(
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );
    if (!validSignature) {
      throw new UnauthorizedException('Invalid payment signature');
    }

    const order = await this.razorpayService.fetchOrder(dto.razorpay_order_id);
    if (
      order.notes?.actor_type !== 'customer' ||
      order.notes?.actor_id !== customer.id
    ) {
      throw new ForbiddenException(
        'This payment does not belong to your wallet',
      );
    }

    const amountRupees = Number(order.amount) / 100;
    const transaction = await this.walletService.creditFromRazorpay(
      customer.id,
      amountRupees,
      dto.razorpay_payment_id,
    );
    return { wallet_balance: transaction.balance_after };
  }
}
