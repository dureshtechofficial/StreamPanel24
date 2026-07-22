import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RazorpayService } from './razorpay.service';
import { WalletService } from '../wallet/wallet.service';
import { CustomerWalletService } from '../customer-wallet/customer-wallet.service';

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        notes?: Record<string, string>;
      };
    };
  };
}

/**
 * Public, unauthenticated endpoint — Razorpay calls this directly, so there's
 * no JWT/guard here. Trust is established entirely via the signature check
 * against the raw request body (see main.ts's `rawBody: true`), never via
 * anything in the parsed payload itself. This is the reliable source of
 * truth for crediting a top-up; the client-side verify endpoints
 * (reseller/customer wallet controllers) exist only to give the UI instant
 * feedback without waiting for this to arrive.
 */
@ApiTags('razorpay')
@Controller('razorpay')
export class RazorpayWebhookController {
  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly walletService: WalletService,
    private readonly customerWalletService: CustomerWalletService,
  ) {}

  @ApiOperation({
    summary:
      'Razorpay webhook — credits the relevant wallet on payment.captured',
  })
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() body: RazorpayWebhookPayload,
  ) {
    if (!req.rawBody || !signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }
    const valid = this.razorpayService.verifyWebhookSignature(
      req.rawBody.toString('utf8'),
      signature,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (body.event !== 'payment.captured') {
      return { ok: true };
    }

    const payment = body.payload?.payment?.entity;
    const notes = payment?.notes;
    if (!payment?.id || payment.amount === undefined || !notes) {
      return { ok: true };
    }

    const actorType = notes.actor_type;
    const actorId = notes.actor_id;
    const amountRupees = payment.amount / 100;

    if (actorType === 'reseller' && actorId) {
      await this.walletService.creditFromRazorpay(
        actorId,
        amountRupees,
        payment.id,
      );
    } else if (actorType === 'customer' && actorId) {
      await this.customerWalletService.creditFromRazorpay(
        actorId,
        amountRupees,
        payment.id,
      );
    }

    return { ok: true };
  }
}
