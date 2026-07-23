export enum WalletTransactionType {
  TOPUP = 'topup',
  /** Debit for a reseller-billed order purchase, or a credit refunding one on cancellation — see OrdersService.create/applyStatusUpdate. */
  ORDER_PAYMENT = 'order_payment',
}
