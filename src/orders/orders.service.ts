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
import { CustomersService } from '../customers/customers.service';
import { ResellersService } from '../resellers/resellers.service';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';
import { OrderCancelSettingsService } from '../settings/order-cancel-settings.service';
import { OrderCancelActor } from '../settings/enums/order-cancel-actor.enum';
import { WalletService } from '../wallet/wallet.service';
import { nowUnixSeconds } from '../common/utils/unix-timestamp.util';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const SECONDS_PER_DAY = 86_400;

export type OrderReportEntry = Omit<
  Order,
  'setTimestampsOnInsert' | 'setTimestampOnUpdate'
> & {
  customer_name: string;
  plan_name: string;
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
    private readonly customersService: CustomersService,
    private readonly resellersService: ResellersService,
    private readonly streamsService: FlussonicStreamsService,
    private readonly orderCancelSettingsService: OrderCancelSettingsService,
    private readonly walletService: WalletService,
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
   * is enriched with the related customer/plan/stream/reseller names — the
   * order itself only stores ids, and the report page needs readable labels.
   * Lookups include soft-deleted/inactive rows so a historical order's
   * labels still resolve even if the customer/plan/stream was later removed.
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
    const customerIds = [...new Set(orders.map((o) => o.customer_id))];
    const planIds = [...new Set(orders.map((o) => o.plan_id))];
    const streamIds = [...new Set(orders.map((o) => o.stream_id))];
    const resellerIds = [
      ...new Set(
        orders
          .map((o) => o.reseller_id)
          .filter((id): id is string => id !== null),
      ),
    ];

    const [customers, plans, streams, resellers] = await Promise.all([
      this.customersService.findByIds(customerIds),
      this.plansService.findByIds(planIds),
      this.streamsService.findByIdsAsDirectoryEntries(streamIds),
      this.resellersService.findByIds(resellerIds),
    ]);

    const customerNameById = new Map(customers.map((c) => [c.id, c.name]));
    const planNameById = new Map(plans.map((p) => [p.id, p.name]));
    const streamById = new Map(streams.map((s) => [s.id, s]));
    const resellerNameById = new Map(resellers.map((r) => [r.id, r.name]));

    return orders.map((order) => {
      const stream = streamById.get(order.stream_id);
      return {
        ...order,
        customer_name:
          customerNameById.get(order.customer_id) ?? 'Unknown customer',
        plan_name: planNameById.get(order.plan_id) ?? 'Unknown plan',
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
   * customerId/resellerId come from). Snapshots the plan's terms onto the
   * order, then assigns the stream to the customer (without touching their
   * other assignments) — a conflict there aborts the whole order.
   */
  async create(params: {
    customerId: string;
    resellerId: string | null;
    priceField: 'customer_price' | 'reseller_price';
    dto: CreateOrderDto;
    /** Only the reseller-scoped controller sets this — bills the order to the reseller's own wallet instead of an external payment method. */
    chargeResellerWallet?: boolean;
  }): Promise<Order> {
    const { customerId, resellerId, priceField, dto, chargeResellerWallet } =
      params;

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

    // Charge next, before the order row exists — if the reseller's balance
    // can't cover it, undo the assignment above (only if it was new) so a
    // failed payment never leaves a stream held without a corresponding
    // order, but also never strips a pre-existing assignment it didn't make.
    let chargeTransactionId: string | null = null;
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
      await this.walletService.attachOrder(chargeTransactionId, order.id);
    }

    return order;
  }

  /**
   * Updates lifecycle/payment state and remarks only — every other field is
   * an immutable purchase-time snapshot. Cancelling unassigns the stream
   * (best-effort: a no-op if it was already reassigned elsewhere since).
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

  private async applyStatusUpdate(
    order: Order,
    dto: UpdateOrderStatusDto,
    actorType: OrderCancelActor,
  ): Promise<Order> {
    if (
      dto.status === OrderStatus.CANCELLED &&
      order.status !== OrderStatus.CANCELLED
    ) {
      await this.orderCancelSettingsService.assertCancelEnabled(actorType);
      await this.streamsService.unassignSingleStreamFromCustomer(
        order.stream_id,
        order.customer_id,
      );
      // No-ops if this order was never actually charged to a wallet (e.g. it
      // was created via the admin route) — refundForOrder checks for a real
      // charge transaction rather than trusting payment_method alone.
      if (order.reseller_id) {
        await this.walletService.refundForOrder(
          order.reseller_id,
          order.id,
          `Refund for cancelled order ${order.order_number}`,
        );
      }
    }

    if (dto.status !== undefined) order.status = dto.status;
    if (dto.payment_status !== undefined)
      order.payment_status = dto.payment_status;
    if (dto.remark !== undefined) order.remark = dto.remark;

    return this.ordersRepository.save(order);
  }

  private buildOrderNumber(id: string): string {
    const year = new Date().getFullYear();
    return `ORD-${year}-${id.padStart(6, '0')}`;
  }
}
