import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { SmtpSetting } from './entities/smtp-setting.entity';
import { UpdateSmtpSettingDto } from './dto/update-smtp-setting.dto';
import { TestSmtpSettingDto } from './dto/test-smtp-setting.dto';
import { decryptSecret, encryptSecret } from '../common/utils/encryption.util';

@Injectable()
export class SmtpSettingsService {
  constructor(
    @InjectRepository(SmtpSetting)
    private readonly repository: Repository<SmtpSetting>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * The table holds exactly one row (seeded by migration). We self-heal a
   * missing row so a fresh/partially-migrated DB still returns something
   * editable rather than 404-ing the settings page.
   */
  async get(): Promise<SmtpSetting> {
    const existing = await this.repository.findOne({
      where: {},
      order: { id: 'ASC' },
    });
    if (existing) return existing;
    return this.repository.save(this.repository.create({}));
  }

  async update(dto: UpdateSmtpSettingDto): Promise<SmtpSetting> {
    const setting = await this.get();

    if (dto.enabled !== undefined) setting.enabled = dto.enabled;
    if (dto.host !== undefined) setting.host = dto.host.trim();
    if (dto.port !== undefined) setting.port = dto.port;
    if (dto.secure !== undefined) setting.secure = dto.secure;
    if (dto.username !== undefined)
      setting.username = dto.username.trim() || null;
    if (dto.from_email !== undefined)
      setting.from_email = dto.from_email.trim();
    if (dto.from_name !== undefined)
      setting.from_name = dto.from_name.trim() || null;

    // A password is only rewritten when a non-empty value is supplied; an
    // empty/absent field means "keep whatever is stored".
    if (dto.password) {
      setting.password_enc = encryptSecret(dto.password, this.encryptionKey());
    }

    return this.repository.save(setting);
  }

  /** Sends a test email using the currently *stored* config (save before testing). */
  async sendTest(
    dto: TestSmtpSettingDto,
  ): Promise<{ messageId: string; accepted: string[] }> {
    const setting = await this.get();

    if (!setting.host || !setting.from_email) {
      throw new BadRequestException(
        'Set the SMTP host and "from" address (and save) before sending a test email.',
      );
    }

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

    const appName = this.configService.get<string>('appName') ?? 'App';
    const from = setting.from_name
      ? `"${setting.from_name}" <${setting.from_email}>`
      : setting.from_email;

    try {
      // verify() surfaces connection/auth problems with a clearer error than
      // sendMail would, before we attempt to actually send.
      await transporter.verify();
      const info = await transporter.sendMail({
        from,
        to: dto.to,
        subject: `${appName} — SMTP test email`,
        text: `This is a test email from ${appName}. If you received it, your SMTP settings are working.`,
        html: `<p>This is a test email from <strong>${appName}</strong>.</p><p>If you received it, your SMTP settings are working. ✅</p>`,
      });
      return {
        messageId: info.messageId,
        accepted: (info.accepted ?? []).map(String),
      };
    } catch (err) {
      // Bubble the SMTP failure reason up as a 400 so the admin sees exactly
      // what went wrong (bad host, auth rejected, TLS mismatch, …).
      const message =
        err instanceof Error ? err.message : 'Failed to send test email.';
      throw new BadRequestException(`SMTP test failed: ${message}`);
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
