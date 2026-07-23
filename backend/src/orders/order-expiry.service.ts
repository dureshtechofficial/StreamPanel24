import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { nowUnixSeconds } from '../common/utils/unix-timestamp.util';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';
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
  ) {}

  async expireOverdueOrders(): Promise<{ expired: number; disabled: number }> {
    const now = nowUnixSeconds();
    const overdue = await this.ordersRepository.find({
      where: {
        status: OrderStatus.ACTIVE,
        effective_to: LessThanOrEqual(now),
      },
      select: { id: true, stream_id: true },
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

    if (expired) {
      this.logger.log(
        `Expired ${expired} order(s) past their effective_to; disabled ${disabled} stream(s) with no remaining valid order.`,
      );
    }
    return { expired, disabled };
  }
}
