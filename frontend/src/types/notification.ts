export type NotificationEvent =
  | "stream_disable"
  | "stream_start"
  | "stream_restart"
  | "order_expiry"
  | "order_expiry_reminder";

export type NotificationStatus = "sent" | "failed" | "skipped";

export interface NotificationSetting {
  id: string;
  event_type: NotificationEvent;
  enabled: boolean;
  /** UTC unix timestamp (seconds) */
  created_at: number;
  /** UTC unix timestamp (seconds) */
  updated_at: number;
}

export interface NotificationRecord {
  id: string;
  event_type: NotificationEvent;
  customer_id: string | null;
  recipient_email: string | null;
  subject: string;
  body: string;
  status: NotificationStatus;
  error: string | null;
  /** UTC unix timestamp (seconds) */
  created_at: number;
}
