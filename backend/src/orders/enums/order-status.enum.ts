/** Subscription lifecycle — separate from PaymentStatus, which tracks the money side. */
export enum OrderStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}
