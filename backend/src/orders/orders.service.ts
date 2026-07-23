import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PlansService } from '../plans/plans.service';
import { Customer } from '../customers/entities/customer.entity';
import { ResellersService } from '../resellers/resellers.service';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';
import { OrderCancelSettingsService } from '../settings/order-cancel-settings.service';
import { OrderCancelActor } from '../settings/enums/order-cancel-actor.enum';
import { WalletService } from '../wallet/wallet.service';
import { CustomerWalletService } from '../customer-wallet/customer-wallet.service';
import { nowUnixSeconds } from '../common/utils/unix-timestamp.util';
import {
  streamHasValidActiveOrder,
  syncStreamDisabledState,
} from './utils/stream-order-validity.util';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const SECONDS_PER_DAY = 86_400;

export type OrderReportEntry = Omit<
  Order,
  'setTimestampsOnInsert' | 'setTimestampOnUpdate'
> & {
  stream_name: string;
  server_name: string;
  reseller_name: string | null;
};

export interface OrdersSummary {
  totalOrders: number;
  /** Sum of `price` across every order matching the filter, regardless of payment_status. */
  totalValue: string;
  /** Sum of `price` across only payment_status = 'paid' orders — actual realized revenue. */
  paidRevenue: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly plansService: PlansService,
    private readonly resellersService: ResellersService,
    private readonly streamsService: FlussonicStreamsService,
    private readonly orderCancelSettingsService: OrderCancelSettingsService,
    private readonly walletService: WalletService,
    private readonly customerWalletService: CustomerWalletService,
  ) {}

  async findAll(query: QueryOrderDto): Promise<PaginatedResult<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.applyFilters(
      this.ordersRepository.createQueryBuilder('order'),
      query,
    );
    qb.orderBy('order.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Admin reports view: same pagination/filtering as findAll, but each order
   * is enriched with a readable stream/server/reseller name — customer and
   * plan names are already on the order itself (the invoicing snapshot), so
   * only stream/reseller still need a live lookup here. Lookups include
   * soft-deleted/inactive rows so a historical order's labels still resolve
   * even if the stream/reseller was later removed.
   */
  async findAllWithDetails(
    query: QueryOrderDto,
  ): Promise<PaginatedResult<OrderReportEntry>> {
    const result = await this.findAll(query);
    const items = await this.toReportEntries(result.items);
    return { ...result, items };
  }

  /** Aggregate totals across every order matching the filter, ignoring pagination — for the reports page's summary cards. */
  async getSummary(query: QueryOrderDto): Promise<OrdersSummary> {
    const qb = this.applyFilters(
      this.ordersRepository.createQueryBuilder('order'),
      query,
    );
    const totals = await qb
      .select('COUNT(*)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.price), 0)', 'totalValue')
      .getRawOne<{ totalOrders: string; totalValue: string }>();

    const paidQb = this.applyFilters(
      this.ordersRepository
        .createQueryBuilder('order')
        .andWhere('order.payment_status = :paid', { paid: PaymentStatus.PAID }),
      query,
    );
    const paidTotals = await paidQb
      .select('COALESCE(SUM(order.price), 0)', 'paidRevenue')
      .getRawOne<{ paidRevenue: string }>();

    return {
      totalOrders: Number(totals?.totalOrders ?? 0),
      totalValue: Number(totals?.totalValue ?? 0).toFixed(2),
      paidRevenue: Number(paidTotals?.paidRevenue ?? 0).toFixed(2),
    };
  }

  private async toReportEntries(orders: Order[]): Promise<OrderReportEntry[]> {
    const streamIds = [...new Set(orders.map((o) => o.stream_id))];
    const resellerIds = [
      ...new Set(
        orders
          .map((o) => o.reseller_id)
          .filter((id): id is string => id !== null),
      ),
    ];

    const [streams, resellers] = await Promise.all([
      this.streamsService.findByIdsAsDirectoryEntries(streamIds),
      this.resellersService.findByIds(resellerIds),
    ]);

    const streamById = new Map(streams.map((s) => [s.id, s]));
    const resellerNameById = new Map(resellers.map((r) => [r.id, r.name]));

    return orders.map((order) => {
      const stream = streamById.get(order.stream_id);
      return {
        ...order,
        stream_name: stream?.name ?? 'Unknown stream',
        server_name: stream?.server_name ?? 'Unknown server',
        reseller_name: order.reseller_id
          ? (resellerNameById.get(order.reseller_id) ?? 'Unknown reseller')
          : null,
      };
    });
  }

  private applyFilters(
    qb: SelectQueryBuilder<Order>,
    query: QueryOrderDto,
  ): SelectQueryBuilder<Order> {
    if (query.customerId) {
      qb.andWhere('order.customer_id = :customerId', {
        customerId: query.customerId,
      });
    }
    if (query.resellerId === 'none') {
      qb.andWhere('order.reseller_id IS NULL');
    } else if (query.resellerId) {
      qb.andWhere('order.reseller_id = :resellerId', {
        resellerId: query.resellerId,
      });
    }
    if (query.search) {
      qb.andWhere(
        '(order.order_number LIKE :search OR order.customer_name LIKE :search OR order.stream_name LIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.dateFrom !== undefined) {
      qb.andWhere('order.created_at >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query.dateTo !== undefined) {
      qb.andWhere('order.created_at <= :dateTo', { dateTo: query.dateTo });
    }
    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }
    if (query.paymentStatus) {
      qb.andWhere('order.payment_status = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }
    return qb;
  }

  findAllForCustomer(customerId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { customer_id: customerId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  /** 404s if the order doesn't exist or doesn't belong to this customer — used by the reseller/customer scoped routes. */
  async findOneForCustomer(customerId: string, id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, customer_id: customerId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  /**
   * A stream can only be under one active order's date range at a time — if
   * it already has an active order whose window extends past `requestedFrom`,
   * the new order is queued to start exactly when that one ends (a renewal/
   * extension) rather than overlapping it as a duplicate. Picks the active
   * order with the furthest-out effective_to, so renewing more than once
   * chains correctly instead of always stacking off the first one.
   */
  private async resolveEffectiveFrom(
    streamId: string,
    requestedFrom: number,
  ): Promise<number> {
    const latestActive = await this.ordersRepository.findOne({
      where: { stream_id: streamId, status: OrderStatus.ACTIVE },
      order: { effective_to: 'DESC' },
    });
    if (!latestActive || latestActive.effective_to <= requestedFrom) {
      return requestedFrom;
    }
    return latestActive.effective_to;
  }

  /**
   * Core order creation, shared by the admin and reseller-scoped controllers
   * (they only differ in which price field defaults apply and where
   * customer/resellerId come from). Snapshots the plan's terms *and* the
   * customer's contact/billing details onto the order for invoicing — both
   * callers already have the full `Customer` in hand from their own
   * ownership check, so no extra lookup is needed here. Then assigns the
   * stream to the customer (without touching their other assignments) — a
   * conflict there aborts the whole order.
   */
  async create(params: {
    customer: Customer;
    resellerId: string | null;
    priceField: 'customer_price' | 'reseller_price';
    dto: CreateOrderDto;
    /** Only the reseller-scoped controller sets this — bills the order to the reseller's own wallet instead of an external payment method. */
    chargeResellerWallet?: boolean;
  }): Promise<Order> {
    const { customer, resellerId, priceField, dto, chargeResellerWallet } =
      params;
    const customerId = customer.id;

    if (chargeResellerWallet) {
      if (!resellerId) {
        throw new BadRequestException(
          'A wallet-billed order requires a reseller',
        );
      }
      if (dto.payment_method !== 'wallet') {
        throw new BadRequestException(
          'Resellers can only pay for orders via wallet',
        );
      }
    }

    const plan = await this.plansService.findOne(dto.plan_id);

    const price = dto.price ?? Number(plan[priceField]);
    const maxStreams = dto.max_streams ?? plan.max_streams;
    const maxConnections = dto.max_connections ?? plan.max_connections;
    const playbackProtocols = dto.playback_protocols ?? plan.playback_protocols;
    const requestedFrom = dto.effective_from ?? nowUnixSeconds();
    const effectiveFrom = await this.resolveEffectiveFrom(
      dto.stream_id,
      requestedFrom,
    );
    const effectiveTo = effectiveFrom + plan.duration_days * SECONDS_PER_DAY;

    // Streams are now only ever picked from what's already assigned to the
    // customer (see FlussonicStreamsService usage on the frontend), so this
    // is normally a no-op re-save — capture whether it was a *new* assignment
    // so a wallet-charge failure below only undoes an assignment this call
    // itself made, never a pre-existing one the customer already had.
    const streamBefore = await this.streamsService.findOneById(dto.stream_id);
    const isNewAssignment = streamBefore?.customer_id !== customerId;

    // Assign first — if the stream is already taken by a different customer,
    // no order row (and no payment record) should ever be created for it.
    await this.streamsService.assignSingleStreamToCustomer(
      customerId,
      dto.stream_id,
    );

    // Unreachable in practice — assignSingleStreamToCustomer above already
    // 404s if the stream doesn't exist, so streamBefore is guaranteed here.
    // Narrows the type so the snapshot fields below don't need non-null casts.
    if (!streamBefore) {
      throw new NotFoundException('Stream not found');
    }

    // Charge next, before the order row exists — if the balance can't cover
    // it, undo the assignment above (only if it was new) so a failed payment
    // never leaves a stream held without a corresponding order, but also
    // never strips a pre-existing assignment it didn't make. Reseller-billed
    // orders charge the reseller's wallet (chargeResellerWallet, set only by
    // the reseller-scoped controller); any other order paid via 'wallet'
    // charges the customer's own wallet instead — the two are mutually
    // exclusive since a reseller-billed order always forces payment_method
    // to 'wallet' too, so this can't double-charge.
    let chargeTransactionId: string | null = null;
    let customerChargeTransactionId: string | null = null;
    if (chargeResellerWallet && resellerId) {
      try {
        const charge = await this.walletService.chargeForOrder(
          resellerId,
          price,
          `Order for plan "${plan.name}"`,
        );
        chargeTransactionId = charge.id;
      } catch (err) {
        if (isNewAssignment) {
          await this.streamsService.unassignSingleStreamFromCustomer(
            dto.stream_id,
            customerId,
          );
        }
        throw err;
      }
    } else if (dto.payment_method === 'wallet') {
      try {
        const charge = await this.customerWalletService.chargeForOrder(
          customerId,
          price,
          `Order for plan "${plan.name}"`,
        );
        customerChargeTransactionId = charge.id;
      } catch (err) {
        if (isNewAssignment) {
          await this.streamsService.unassignSingleStreamFromCustomer(
            dto.stream_id,
            customerId,
          );
        }
        throw err;
      }
    }

    const order = this.ordersRepository.create({
      order_number: 'PENDING', // replaced right below, once the id is known
      plan_id: dto.plan_id,
      stream_id: dto.stream_id,
      customer_id: customerId,
      reseller_id: resellerId,
      price: price.toFixed(2),
      duration_days: plan.duration_days,
      max_streams: maxStreams,
      max_connections: maxConnections,
      playback_protocols: playbackProtocols,
      plan_name: plan.name,
      plan_description: plan.description,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_company_name: customer.company_name,
      customer_address: customer.address,
      customer_city: customer.city,
      customer_state: customer.state,
      customer_pincode: customer.pincode,
      stream_name: streamBefore.config_json.name,
      stream_title: streamBefore.config_json.title ?? null,
      stream_ingest_domain: streamBefore.ingest_domain,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      status: OrderStatus.ACTIVE,
      payment_method: dto.payment_method,
      payment_status: dto.payment_status ?? PaymentStatus.PAID,
      remark: dto.remark ?? null,
    });
    await this.ordersRepository.save(order);

    order.order_number = this.buildOrderNumber(order.id);
    await this.ordersRepository.save(order);

    if (chargeTransactionId) {
      await this.walletService.attachOrder(
        chargeTransactionId,
        order.id,
        order.order_number,
      );
    }
    if (customerChargeTransactionId) {
      await this.customerWalletService.attachOrder(
        customerChargeTransactionId,
        order.id,
        order.order_number,
      );
    }

    // Reconcile Flussonic's disabled flag against actual order validity right
    // now — same shared check cancellation/expiry use. Enables the stream if
    // this order starts immediately (e.g. re-provisioning one Flussonic
    // disabled when its previous order expired); leaves it disabled if this
    // is a queued future renewal (effective_from in the future, see
    // resolveEffectiveFrom) with nothing else currently valid.
    const streamIsValidNow = await streamHasValidActiveOrder(
      this.ordersRepository,
      dto.stream_id,
      nowUnixSeconds(),
    );
    await syncStreamDisabledState(
      this.streamsService,
      dto.stream_id,
      streamIsValidNow,
    );

    return order;
  }

  /**
   * Updates lifecycle/payment state and remarks only — every other field is
   * an immutable purchase-time snapshot. Cancelling does NOT unassign the
   * stream — the customer keeps it (same reasoning as expiry: an admin might
   * cancel an older order in a renewal chain, or simply want the customer to
   * keep the stream regardless) — it only reconciles Flussonic's `disabled`
   * flag off if nothing else currently grants it (see applyStatusUpdate).
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    return this.applyStatusUpdate(order, dto, OrderCancelActor.ADMIN);
  }

  async updateStatusForCustomer(
    customerId: string,
    id: string,
    dto: UpdateOrderStatusDto,
    actorType: OrderCancelActor,
  ): Promise<Order> {
    const order = await this.findOneForCustomer(customerId, id);
    return this.applyStatusUpdate(order, dto, actorType);
  }

  /** Convenience wrapper: a customer can only ever cancel their own order, nothing else about it. */
  cancelForCustomer(customerId: string, id: string): Promise<Order> {
    return this.updateStatusForCustomer(
      customerId,
      id,
      { status: OrderStatus.CANCELLED },
      OrderCancelActor.CUSTOMER,
    );
  }

  /**
   * Prorated refund: `Applicable Price` is simply `order.price` — already
   * resolved to the reseller price or customer price at creation time
   * depending on who created it (`priceField`), so there's no need to
   * re-derive it from the (possibly since-changed) live plan. Clamping
   * `usedDays` to `[0, totalServiceDays]` means cancelling before
   * `effective_from` (a queued renewal that never started) refunds the
   * full price, and cancelling after `effective_to` (already fully
   * consumed) refunds nothing — both without a special-cased branch.
   */
  private calculateRefundAmount(order: Order, cancelledAt: number): number {
    const totalServiceDays =
      (order.effective_to - order.effective_from) / SECONDS_PER_DAY;
    if (totalServiceDays <= 0) return 0;

    const dailyRate = Number(order.price) / totalServiceDays;
    const usedDaysRaw = (cancelledAt - order.effective_from) / SECONDS_PER_DAY;
    const usedDays = Math.min(Math.max(usedDaysRaw, 0), totalServiceDays);
    const remainingDays = totalServiceDays - usedDays;

    return Math.round(dailyRate * remainingDays * 100) / 100;
  }

  private async applyStatusUpdate(
    order: Order,
    dto: UpdateOrderStatusDto,
    actorType: OrderCancelActor,
  ): Promise<Order> {
    const isCancelling =
      dto.status === OrderStatus.CANCELLED &&
      order.status !== OrderStatus.CANCELLED;

    if (isCancelling) {
      await this.orderCancelSettingsService.assertCancelEnabled(actorType);
      // Deliberately does NOT unassign the stream — the customer keeps it
      // regardless of why this order was cancelled (an admin might cancel an
      // older order in a renewal chain, or just want the customer to keep
      // the stream). Only Flussonic's disabled flag is reconciled below,
      // once the new status is actually persisted.
      const refundAmount = this.calculateRefundAmount(order, nowUnixSeconds());
      // No-ops if this order was never actually charged to a wallet —
      // refundForOrder checks for a real charge transaction by order_id
      // rather than trusting payment_method alone, so calling both is safe
      // even though at most one of them ever actually charged this order.
      // Each returns the created refund transaction (or null on a no-op),
      // which is also how we know whether to mark this order 'refunded'.
      let refunded = false;
      if (order.reseller_id) {
        const resellerRefund = await this.walletService.refundForOrder(
          order.reseller_id,
          order.id,
          refundAmount,
          `Refund for cancelled order ${order.order_number}`,
        );
        if (resellerRefund) refunded = true;
      }
      const customerRefund = await this.customerWalletService.refundForOrder(
        order.customer_id,
        order.id,
        refundAmount,
        `Refund for cancelled order ${order.order_number}`,
      );
      if (customerRefund) refunded = true;

      // Cancelling always resolves payment_status — 'refunded' if money was
      // actually credited back, otherwise 'cancelled' (never billed to a
      // wallet at all, e.g. cash/manual payment, or nothing left to refund).
      // A caller-supplied dto.payment_status below still wins over this.
      order.payment_status = refunded
        ? PaymentStatus.REFUNDED
        : PaymentStatus.CANCELLED;
    }

    if (dto.status !== undefined) order.status = dto.status;
    if (dto.payment_status !== undefined)
      order.payment_status = dto.payment_status;
    if (dto.remark !== undefined) order.remark = dto.remark;

    const saved = await this.ordersRepository.save(order);

    if (isCancelling) {
      // Runs against the now-persisted status, so this cancelled order never
      // counts as its own "still valid" order below (see
      // streamHasValidActiveOrder — a stale in-memory read here could
      // otherwise leave a stream enabled with nothing actually granting it).
      const now = nowUnixSeconds();
      const stillValid = await streamHasValidActiveOrder(
        this.ordersRepository,
        saved.stream_id,
        now,
      );
      await syncStreamDisabledState(
        this.streamsService,
        saved.stream_id,
        stillValid,
      );
    }

    return saved;
  }

  private buildOrderNumber(id: string): string {
    const year = new Date().getFullYear();
    return `ORD-${year}-${id.padStart(6, '0')}`;
  }
}
