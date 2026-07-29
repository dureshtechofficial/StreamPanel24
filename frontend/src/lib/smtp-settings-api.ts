import { apiFetch } from './api-client';
import type {
  SmtpSetting,
  TestSmtpResult,
  UpdateSmtpSettingInput,
} from '@/types/smtp-setting';

export function getSmtpSettings() {
  return apiFetch<SmtpSetting>('/settings/smtp');
}

export function updateSmtpSettings(input: UpdateSmtpSettingInput) {
  return apiFetch<SmtpSetting>('/settings/smtp', {
    method: 'PATCH',
    body: input,
  });
}

/** Sends a test email using the currently stored config (save before testing). */
export function sendSmtpTest(to: string) {
  return apiFetch<TestSmtpResult>('/settings/smtp/test', {
    method: 'POST',
    body: { to },
  });
}
