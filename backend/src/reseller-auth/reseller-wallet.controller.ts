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
import { ResellerJwtAccessGuard } from './guards/reseller-jwt-access.guard';
import { CurrentReseller } from './decorators/current-reseller.decorator';
import { Reseller } from '../resellers/entities/reseller.entity';
import { WalletService } from '../wallet/wallet.service';
import { QueryWalletTransactionDto } from '../wallet/dto/query-wallet-transaction.dto';
import { RazorpayService } from '../razorpay/razorpay.service';
import { CreateRazorpayOrderDto } from '../razorpay/dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from '../razorpay/dto/verify-razorpay-payment.dto';
import { WalletTopupSettingsService } from '../settings/wallet-topup-settings.service';
import { WalletTopupActor } from '../settings/enums/wallet-topup-actor.enum';

@ApiTags('reseller-auth')
@ApiBearerAuth('access-token')
@UseGuards(ResellerJwtAccessGuard)
@Controller('reseller-auth/wallet')
export class ResellerWalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly razorpayService: RazorpayService,
    private readonly walletTopupSettingsService: WalletTopupSettingsService,
  ) {}

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

  @ApiOperation({
    summary:
      'Whether self-service Razorpay top-up is enabled, and the minimum amount',
  })
  @Get('topup-settings')
  async getTopupSettings() {
    const [enabled, minimum_amount] = await Promise.all([
      this.walletTopupSettingsService.isEnabled(WalletTopupActor.RESELLER),
      this.walletTopupSettingsService.getMinimumAmount(
        WalletTopupActor.RESELLER,
      ),
    ]);
    return { enabled, minimum_amount };
  }

  @ApiOperation({
    summary:
      "Create a Razorpay order to top up the logged-in reseller's own wallet",
  })
  @Post('razorpay/order')
  @HttpCode(HttpStatus.CREATED)
  async createRazorpayOrder(
    @CurrentReseller() reseller: Reseller,
    @Body() dto: CreateRazorpayOrderDto,
  ) {
    await this.walletTopupSettingsService.assertToppable(
      WalletTopupActor.RESELLER,
      dto.amount,
    );
    const order = await this.razorpayService.createOrder({
      amountRupees: dto.amount,
      actorType: 'reseller',
      actorId: reseller.id,
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
      "Verify a completed Razorpay checkout and credit the logged-in reseller's own wallet",
  })
  @Post('razorpay/verify')
  async verifyRazorpayPayment(
    @CurrentReseller() reseller: Reseller,
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

    // Re-fetched from Razorpay rather than trusted from the request — the
    // credited amount always matches what was actually paid, and the notes
    // confirm this order was actually created for this reseller.
    const order = await this.razorpayService.fetchOrder(dto.razorpay_order_id);
    if (
      order.notes?.actor_type !== 'reseller' ||
      order.notes?.actor_id !== reseller.id
    ) {
      throw new ForbiddenException(
        'This payment does not belong to your wallet',
      );
    }

    const amountRupees = Number(order.amount) / 100;
    const transaction = await this.walletService.creditFromRazorpay(
      reseller.id,
      amountRupees,
      dto.razorpay_payment_id,
    );
    return { wallet_balance: transaction.balance_after };
  }
}
