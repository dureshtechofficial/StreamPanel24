/**
 * The events that can trigger a customer-facing notification. One
 * `notification_settings` row per value gates whether that event actually
 * sends anything (all seeded disabled — a new capability never silently turns
 * itself on).
 */
export enum NotificationEvent {
  STREAM_DISABLE = 'stream_disable',
  STREAM_START = 'stream_start',
  STREAM_RESTART = 'stream_restart',
  ORDER_EXPIRY = 'order_expiry',
  /** Payment reminder sent on each of the two days before an order expires (once per day). */
  ORDER_EXPIRY_REMINDER = 'order_expiry_reminder',
}
