/** Payment lifecycle — separate from OrderStatus, which tracks the subscription/grant side. */
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}
