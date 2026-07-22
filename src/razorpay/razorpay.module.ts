import { Module } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { WalletModule } from '../wallet/wallet.module';
import { CustomerWalletModule } from '../customer-wallet/customer-wallet.module';

@Module({
  imports: [WalletModule, CustomerWalletModule],
  controllers: [RazorpayWebhookController],
  providers: [RazorpayService],
  exports: [RazorpayService],
})
export class RazorpayModule {}
