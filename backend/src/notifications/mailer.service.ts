import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { SmtpSetting } from '../settings/entities/smtp-setting.entity';
import { decryptSecret } from '../common/utils/encryption.util';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type SendResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; reason: string };

/**
 * Sends outbound email using the single stored `smtp_settings` row — the same
 * config the SMTP settings page edits and its "send test" button verifies. This
 * is the send path used by automated notifications: it never throws, returning
 * a `SendResult` instead so the caller can record the outcome in the
 * notifications log rather than failing the operation that triggered it (a
 * disabled stream must still disable even if the email server is down).
 *
 * Reads `smtp_settings` via its own repository (registered in NotificationsModule)
 * rather than importing SettingsModule — SettingsModule already depends on
 * FlussonicServersModule, which imports NotificationsModule, so importing it
 * back here would be circular.
 */
@Injectable()
export class MailerService {
  constructor(
    @InjectRepository(SmtpSetting)
    private readonly smtpRepository: Repository<SmtpSetting>,
    private readonly configService: ConfigService,
  ) {}

  async send(input: SendMailInput): Promise<SendResult> {
    const setting = await this.smtpRepository.findOne({
      where: {},
      order: { id: 'ASC' },
    });

    if (!setting || !setting.enabled) {
      return { ok: false, skipped: true, reason: 'Outbound email is disabled' };
    }
    if (!setting.host || !setting.from_email) {
      return {
        ok: false,
        skipped: true,
        reason: 'SMTP host / from address is not configured',
      };
    }

    const from = setting.from_name
      ? `"${setting.from_name}" <${setting.from_email}>`
      : setting.from_email;

    try {
      const transporter = nodemailer.createTransport({
        host: setting.host,
        port: setting.port,
        secure: setting.secure,
        auth: setting.username
          ? {
              user: setting.username,
              pass: setting.password_enc
                ? decryptSecret(setting.password_enc, this.encryptionKey())
                : '',
            }
          : undefined,
      });
      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return { ok: true };
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : 'Failed to send email';
      return { ok: false, skipped: false, reason };
    }
  }

  private encryptionKey(): string {
    const key = this.configService.get<string>('credentialsEncryptionKey');
    if (!key) {
      throw new InternalServerErrorException(
        'Credentials encryption key is not configured.',
      );
    }
    return key;
  }
}
