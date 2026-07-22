export enum CustomerWalletTransactionType {
  TOPUP = 'topup',
  /** Debit for a wallet-billed order purchase, or a credit refunding one on cancellation — see OrdersService.create/applyStatusUpdate. */
  ORDER_PAYMENT = 'order_payment',
}
