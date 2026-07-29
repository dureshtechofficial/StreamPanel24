export interface SmtpSetting {
  id: string;
  enabled: boolean;
  host: string;
  port: number;
  /** true = implicit TLS (usually port 465); false = STARTTLS/plain (587/25). */
  secure: boolean;
  username: string | null;
  from_email: string;
  from_name: string | null;
  /** Whether a password is stored — the secret itself never leaves the backend. */
  has_password: boolean;
  created_at: number;
  updated_at: number;
}

export interface UpdateSmtpSettingInput {
  enabled?: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  /** Omit or send empty to keep the stored password unchanged. */
  password?: string;
  from_email?: string;
  from_name?: string;
}

export interface TestSmtpResult {
  messageId: string;
  accepted: string[];
}
