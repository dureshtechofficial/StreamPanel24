import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { Customer } from '../customers/entities/customer.entity';
import { NotificationEvent } from './enums/notification-event.enum';
import { NotificationStatus } from './enums/notification-status.enum';
import { NotificationSettingsService } from './notification-settings.service';
import { MailerService } from './mailer.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

export interface StreamUrlEntry {
  label: string;
  url: string;
}

/** Template inputs — which fields matter depends on the event. */
export interface NotificationContext {
  streamName?: string | null;
  /** The stream's available input (ingest) URLs, same list the stream view shows — e.g. RTMP/SRT. */
  inputUrls?: StreamUrlEntry[] | null;
  orderNumber?: string | null;
  planName?: string | null;
  /** For the expiry reminder: the formatted expiry date shown to the customer. */
  expiryDate?: string | null;
  /** For the expiry reminder: whole days until expiry (1 or 2). */
  daysLeft?: number | null;
}

export interface NotifyParams {
  /** The customer this is about; used to resolve an email if one isn't given directly. */
  customerId?: string | null;
  /** Explicit recipient (e.g. an order's snapshotted `customer_email`); resolved from `customerId` when absent. */
  recipientEmail?: string | null;
  /** Display name for the greeting; resolved from `customerId` when absent. */
  recipientName?: string | null;
  context: NotificationContext;
}

/**
 * Sends customer-facing notifications for stream disable / restart / order
 * expiry, gated per-event by `notification_settings`, and records every attempt
 * in the append-only `notifications` log (even skips/failures). `notify()`
 * never throws — a notification problem must never break the stream/order
 * operation that triggered it.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    private readonly settingsService: NotificationSettingsService,
    private readonly mailer: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async notify(event: NotificationEvent, params: NotifyParams): Promise<void> {
    try {
      if (!(await this.settingsService.isEnabled(event))) {
        return; // this event's notifications are turned off — send nothing, log nothing
      }

      let email = params.recipientEmail ?? null;
      let name = params.recipientName ?? null;
      const customerId = params.customerId ?? null;
      if ((!email || !name) && customerId) {
        const customer = await this.customersRepository.findOne({
          where: { id: customerId },
          select: { id: true, name: true, email: true },
        });
        email = email ?? customer?.email ?? null;
        name = name ?? customer?.name ?? null;
      }

      const { subject, text, html } = this.buildMessage(
        event,
        name,
        params.context,
      );

      let status: NotificationStatus;
      let error: string | null = null;
      if (!email) {
        status = NotificationStatus.SKIPPED;
        error = 'No email address on file for this customer';
      } else {
        const result = await this.mailer.send({
          to: email,
          subject,
          text,
          html,
        });
        if (result.ok) {
          status = NotificationStatus.SENT;
        } else {
          status = result.skipped
            ? NotificationStatus.SKIPPED
            : NotificationStatus.FAILED;
          error = result.reason;
        }
      }

      await this.notificationsRepository.save(
        this.notificationsRepository.create({
          event_type: event,
          customer_id: customerId,
          recipient_email: email,
          subject,
          body: text,
          status,
          error,
        }),
      );
    } catch (err) {
      // Absolute last resort — never let a notification failure bubble up into
      // the stream/order flow that called us.
      this.logger.error(
        `Failed to process ${event} notification: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
    }
  }

  async findAll(
    query: QueryNotificationDto,
  ): Promise<PaginatedResult<Notification>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.notificationsRepository.findAndCount({
      where: query.event_type ? { event_type: query.event_type } : {},
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private buildMessage(
    event: NotificationEvent,
    name: string | null,
    ctx: NotificationContext,
  ): { subject: string; text: string; html: string } {
    const appName = this.configService.get<string>('appName') ?? 'Nellai IPTV';
    const greeting = name ? `Hi ${name},` : 'Hello,';
    const stream = ctx.streamName ?? 'your stream';

    let subject: string;
    let heading: string;
    let intro: string;
    const details: Array<{ label: string; value: string }> = [];
    // Stream ingest URLs are shown only for stream events.
    let inputUrls: StreamUrlEntry[] = [];

    switch (event) {
      case NotificationEvent.STREAM_DISABLE:
        subject = `Your stream "${stream}" has been disabled`;
        heading = 'Stream disabled';
        intro = `Your stream "${stream}" has been disabled and is no longer broadcasting.`;
        details.push({ label: 'Stream', value: stream });
        inputUrls = ctx.inputUrls ?? [];
        break;
      case NotificationEvent.STREAM_START:
        subject = `Your stream "${stream}" is now live`;
        heading = 'Stream started';
        intro = `Your stream "${stream}" has been enabled and is now live. You can start publishing to the input URL${
          (ctx.inputUrls?.length ?? 0) > 1 ? 's' : ''
        } below.`;
        details.push({ label: 'Stream', value: stream });
        inputUrls = ctx.inputUrls ?? [];
        break;
      case NotificationEvent.STREAM_RESTART:
        subject = `Your stream "${stream}" has been restarted`;
        heading = 'Stream restarted';
        intro = `Your stream "${stream}" has just been restarted. It should be back online momentarily.`;
        details.push({ label: 'Stream', value: stream });
        inputUrls = ctx.inputUrls ?? [];
        break;
      case NotificationEvent.ORDER_EXPIRY:
        subject = `Your order ${ctx.orderNumber ?? ''} has expired`.trim();
        heading = 'Order expired';
        intro = `Your order${ctx.orderNumber ? ` ${ctx.orderNumber}` : ''}${
          ctx.planName ? ` for "${ctx.planName}"` : ''
        } has reached the end of its service period and has expired. Renew it to keep your stream running.`;
        if (ctx.orderNumber) {
          details.push({ label: 'Order', value: ctx.orderNumber });
        }
        if (ctx.planName) {
          details.push({ label: 'Plan', value: ctx.planName });
        }
        break;
      case NotificationEvent.ORDER_EXPIRY_REMINDER: {
        const whenText =
          ctx.daysLeft === 1
            ? 'tomorrow'
            : ctx.daysLeft
              ? `in ${ctx.daysLeft} days`
              : 'soon';
        subject = `Payment reminder: your order ${ctx.orderNumber ?? ''} expires ${whenText}`.trim();
        heading = 'Payment reminder';
        intro = `This is a reminder that your order${
          ctx.orderNumber ? ` ${ctx.orderNumber}` : ''
        }${ctx.planName ? ` for "${ctx.planName}"` : ''} is due to expire ${whenText}${
          ctx.expiryDate ? ` on ${ctx.expiryDate}` : ''
        }. Please renew it before then to avoid any interruption to your stream.`;
        if (ctx.orderNumber) {
          details.push({ label: 'Order', value: ctx.orderNumber });
        }
        if (ctx.planName) {
          details.push({ label: 'Plan', value: ctx.planName });
        }
        if (ctx.expiryDate) {
          details.push({ label: 'Expires on', value: ctx.expiryDate });
        }
        break;
      }
    }

    const text = this.renderText(appName, greeting, intro, details, inputUrls);
    const html = this.renderHtml(
      appName,
      heading,
      greeting,
      intro,
      details,
      inputUrls,
    );
    return { subject, text, html };
  }

  private renderText(
    appName: string,
    greeting: string,
    intro: string,
    details: Array<{ label: string; value: string }>,
    inputUrls: StreamUrlEntry[],
  ): string {
    const detailLines = details.map((d) => `${d.label}: ${d.value}`).join('\n');
    const urlLines = inputUrls.length
      ? `\nInput stream URLs:\n${inputUrls
          .map((u) => `  ${u.label}: ${u.url}`)
          .join('\n')}`
      : '';
    return [
      greeting,
      '',
      intro,
      detailLines ? `\n${detailLines}` : '',
      urlLines,
      '',
      `— ${appName} · Premium Entertainment`,
    ]
      .filter((l) => l !== null)
      .join('\n')
      .trim();
  }

  /**
   * A clean, light (white-background) HTML email built with table layout and
   * inline styles for broad email-client compatibility (Outlook included).
   * Branded to Nellai IPTV via the configured app name, keeping the brand
   * gradient header on a white body.
   */
  private renderHtml(
    appName: string,
    heading: string,
    greeting: string,
    intro: string,
    details: Array<{ label: string; value: string }>,
    inputUrls: StreamUrlEntry[],
  ): string {
    const brand = this.escapeHtml(appName);
    const detailRows = details
      .map(
        (d) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eef0f4;color:#6b7280;font-size:13px;">${this.escapeHtml(
                  d.label,
                )}</td>
                <td style="padding:10px 0;border-bottom:1px solid #eef0f4;color:#111827;font-size:13px;font-weight:600;text-align:right;">${this.escapeHtml(
                  d.value,
                )}</td>
              </tr>`,
      )
      .join('');

    const detailsBlock = details.length
      ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;border-collapse:collapse;">
              ${detailRows}
            </table>`
      : '';

    const urlCards = inputUrls
      .map(
        (u) => `
              <div style="background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:8px;">
                <div style="color:#4f46e5;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${this.escapeHtml(
                  u.label,
                )}</div>
                <div style="color:#1f2937;font-size:13px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;word-break:break-all;margin-top:4px;">${this.escapeHtml(
                  u.url,
                )}</div>
              </div>`,
      )
      .join('');

    const urlsBlock = inputUrls.length
      ? `
            <div style="margin-top:24px;">
              <div style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Input stream URLs</div>
              ${urlCards}
            </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${this.escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td style="background-color:#4f46e5;background-image:linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#2563eb 100%);padding:28px 32px;">
              <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">${brand}</div>
              <div style="color:rgba(255,255,255,0.75);font-size:12px;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">Premium Entertainment</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="display:inline-block;background-color:rgba(79,70,229,0.10);color:#4f46e5;font-size:12px;font-weight:600;padding:6px 12px;border-radius:9999px;">${this.escapeHtml(
                heading,
              )}</div>
              <p style="color:#111827;font-size:16px;font-weight:600;margin:20px 0 12px;">${this.escapeHtml(
                greeting,
              )}</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">${this.escapeHtml(
                intro,
              )}</p>
              ${detailsBlock}
              ${urlsBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #eef0f4;">
              <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">This is an automated message from ${brand}. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
        <div style="color:#9ca3af;font-size:11px;margin-top:16px;">&copy; ${new Date().getFullYear()} ${brand} · Premium Entertainment</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
