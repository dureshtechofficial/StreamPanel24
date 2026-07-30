/**
 * Outcome of a single notification attempt — the in-app record keeps this even
 * when the email fails, so an admin can see what happened.
 */
export enum NotificationStatus {
  /** Email accepted by the SMTP server. */
  SENT = 'sent',
  /** Email attempted but the SMTP server rejected it / errored. */
  FAILED = 'failed',
  /** Nothing sent — no recipient email on file, or outbound email disabled. */
  SKIPPED = 'skipped',
}
