import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { nowUnixSeconds } from '../common/utils/unix-timestamp.util';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent } from '../notifications/enums/notification-event.enum';
import {
  streamHasValidActiveOrder,
  syncStreamDisabledState,
} from './utils/stream-order-validity.util';

/**
 * Sweeps `active` orders whose `effective_to` has passed and flips them to
 * `expired` — nothing else in the app performs this transition (cancellation
 * is the only other one, and it's always an explicit actor action). Scheduled
 * via `SyncScheduleService`/`SyncType.ORDER_EXPIRY` (settings page), same as
 * the Flussonic sync types, rather than a standalone `@Cron` — so admins can
 * see/enable/disable/reschedule it and see run history like any other sync.
 *
 * Deliberately does NOT touch stream assignment or wallet balances: a
 * same-customer renewal re-assigns the same stream via a new order without
 * changing who it's assigned to, so unassigning here on the old order's
 * expiry could strip a stream a valid renewal still needs. Expiry was never
 * specified as a refund-triggering event the way cancellation is either.
 *
 * It DOES flip Flussonic's `disabled` flag off/on to match order validity —
 * for each stream touched by an order that just expired, disable it unless
 * another order (e.g. an already-queued renewal chained via
 * `OrdersService.resolveEffectiveFrom`) is now the one keeping it valid.
 */
@Injectable()
export class OrderExpiryService {
  private readonly logger = new Logger(OrderExpiryService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly streamsService: FlussonicStreamsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async expireOverdueOrders(): Promise<{
    expired: number;
    disabled: number;
    reminded: number;
  }> {
    const now = nowUnixSeconds();

    // Send pre-expiry payment reminders first (targets orders 1–2 days out, a
    // set disjoint from the overdue ones expired below).
    const reminded = await this.sendExpiryReminders(now);

    const overdue = await this.ordersRepository.find({
      where: {
        status: OrderStatus.ACTIVE,
        effective_to: LessThanOrEqual(now),
      },
      // customer_id / customer_email / order_number / plan_name are the
      // invoicing snapshot, used to notify the affected customer below.
      select: {
        id: true,
        stream_id: true,
        customer_id: true,
        customer_email: true,
        order_number: true,
        plan_name: true,
      },
    });
    const overdueStreamIds = [...new Set(overdue.map((o) => o.stream_id))];

    const result = await this.ordersRepository
      .createQueryBuilder()
      .update(Order)
      .set({ status: OrderStatus.EXPIRED, updated_at: now })
      .where('status = :active', { active: OrderStatus.ACTIVE })
      .andWhere('effective_to <= :now', { now })
      .execute();

    const expired = result.affected ?? 0;

    let disabled = 0;
    for (const streamId of overdueStreamIds) {
      const stillValid = await streamHasValidActiveOrder(
        this.ordersRepository,
        streamId,
        now,
      );
      const changed = await syncStreamDisabledState(
        this.streamsService,
        streamId,
        stillValid,
      );
      if (changed) disabled++;
    }

    // Notify each affected customer that their order expired. Uses the order's
    // own snapshotted email/details (frozen at purchase) and never throws, so a
    // mail problem can't undo the expiry sweep above.
    for (const order of overdue) {
      await this.notificationsService.notify(NotificationEvent.ORDER_EXPIRY, {
        customerId: order.customer_id,
        recipientEmail: order.customer_email,
        context: {
          orderNumber: order.order_number,
          planName: order.plan_name,
        },
      });
    }

    if (expired || reminded) {
      this.logger.log(
        `Expired ${expired} order(s) past their effective_to; disabled ${disabled} stream(s) with no remaining valid order; sent ${reminded} pre-expiry reminder(s).`,
      );
    }
    return { expired, disabled, reminded };
  }

  /**
   * Emails a payment reminder for every active order due to expire on one of the
   * next two calendar days (the two days before its expiry date), at most once
   * per calendar day per order — the once-a-day guard is `last_expiry_reminder_at`.
   * Never throws (notify() swallows send errors), so a mail problem can't undo
   * the expiry sweep that runs right after.
   */
  private async sendExpiryReminders(now: number): Promise<number> {
    // Superset window: anything expiring within ~3 days. The exact 1–2 day
    // calendar filter is applied per-order below.
    const upcoming = await this.ordersRepository.find({
      where: {
        status: OrderStatus.ACTIVE,
        effective_to: Between(now, now + 3 * 86400),
      },
      select: {
        id: true,
        customer_id: true,
        customer_email: true,
        order_number: true,
        plan_name: true,
        effective_to: true,
        last_expiry_reminder_at: true,
      },
    });

    const today = this.localDayIndex(now);
    let reminded = 0;
    for (const order of upcoming) {
      const daysLeft = this.localDayIndex(order.effective_to) - today;
      // Only the two days before expiry (not the expiry day itself, nor earlier).
      if (daysLeft !== 1 && daysLeft !== 2) continue;
      // Already reminded today → skip (once per day).
      if (
        order.last_expiry_reminder_at !== null &&
        this.localDayIndex(order.last_expiry_reminder_at) === today
      ) {
        continue;
      }

      await this.notificationsService.notify(
        NotificationEvent.ORDER_EXPIRY_REMINDER,
        {
          customerId: order.customer_id,
          recipientEmail: order.customer_email,
          context: {
            orderNumber: order.order_number,
            planName: order.plan_name,
            expiryDate: this.formatExpiryDate(order.effective_to),
            daysLeft,
          },
        },
      );

      // Persist the memory immediately (per order) so a crash mid-loop can't
      // cause a second reminder for an order already reminded today.
      await this.ordersRepository
        .createQueryBuilder()
        .update(Order)
        .set({ last_expiry_reminder_at: now })
        .where('id = :id', { id: order.id })
        .execute();
      reminded++;
    }
    return reminded;
  }

  /** Calendar-day index in the server's local timezone — so "days until expiry" and "once per day" follow local dates, matching how expiry dates are read. */
  private localDayIndex(unixSeconds: number): number {
    const d = new Date(unixSeconds * 1000);
    return Math.floor(
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() /
        86_400_000,
    );
  }

  /** e.g. "01 Aug 2026", in the server's local timezone. */
  private formatExpiryDate(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
