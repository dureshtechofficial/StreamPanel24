import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';
import type { Orders } from 'razorpay/dist/types/orders';

export type WalletTopupActorType = 'reseller' | 'customer';

/**
 * Thin wrapper around the Razorpay SDK — shared by the reseller and customer
 * wallet top-up flows (this is genuinely shared infra, not a principal-scoped
 * concept like the wallet modules themselves). `notes.actor_type`/`actor_id`
 * are stamped on every order at creation time so the webhook (which has no
 * request-scoped auth context of its own) can identify who to credit.
 */
@Injectable()
export class RazorpayService {
  private readonly client: Razorpay;

  constructor(private readonly configService: ConfigService) {
    this.client = new Razorpay({
      key_id: this.configService.get<string>('razorpay.keyId'),
      key_secret: this.configService.get<string>('razorpay.keySecret'),
    });
  }

  /** Public key — safe to hand to the frontend for the Checkout widget. */
  get keyId(): string {
    return this.configService.get<string>('razorpay.keyId')!;
  }

  async createOrder(params: {
    amountRupees: number;
    actorType: WalletTopupActorType;
    actorId: string;
  }): Promise<Orders.RazorpayOrder> {
    return this.client.orders.create({
      amount: Math.round(params.amountRupees * 100),
      currency: 'INR',
      notes: { actor_type: params.actorType, actor_id: params.actorId },
    });
  }

  /** Re-fetched from Razorpay rather than trusted from the client, so the credited amount always matches what was actually paid. */
  async fetchOrder(orderId: string): Promise<Orders.RazorpayOrder> {
    return this.client.orders.fetch(orderId);
  }

  /** For the client-side checkout callback — signed with the account's key_secret. */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    return validatePaymentVerification(
      { order_id: orderId, payment_id: paymentId },
      signature,
      this.configService.get<string>('razorpay.keySecret')!,
    );
  }

  /** For the async webhook — signed with the separate webhook secret, over the raw request body. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return Razorpay.validateWebhookSignature(
      rawBody,
      signature,
      this.configService.get<string>('razorpay.webhookSecret')!,
    );
  }
}
