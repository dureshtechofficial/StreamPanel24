import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PlansService } from '../plans/plans.service';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';
import { nowUnixSeconds } from '../common/utils/unix-timestamp.util';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const SECONDS_PER_DAY = 86_400;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly plansService: PlansService,
    private readonly streamsService: FlussonicStreamsService,
  ) {}

  async findAll(query: QueryOrderDto): Promise<PaginatedResult<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.ordersRepository.createQueryBuilder('order');

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
  }): Promise<Order> {
    const { customerId, resellerId, priceField, dto } = params;
    const plan = await this.plansService.findOne(dto.plan_id);

    const price = dto.price ?? Number(plan[priceField]);
    const maxStreams = dto.max_streams ?? plan.max_streams;
    const maxConnections = dto.max_connections ?? plan.max_connections;
    const playbackProtocols = dto.playback_protocols ?? plan.playback_protocols;
    const effectiveFrom = dto.effective_from ?? nowUnixSeconds();
    const effectiveTo = effectiveFrom + dto.duration_days * SECONDS_PER_DAY;

    // Assign first — if the stream is already taken by a different customer,
    // no order row (and no payment record) should ever be created for it.
    await this.streamsService.assignSingleStreamToCustomer(
      customerId,
      dto.stream_id,
    );

    const order = this.ordersRepository.create({
      order_number: 'PENDING', // replaced right below, once the id is known
      plan_id: dto.plan_id,
      stream_id: dto.stream_id,
      customer_id: customerId,
      reseller_id: resellerId,
      price: price.toFixed(2),
      duration_days: dto.duration_days,
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
    return this.ordersRepository.save(order);
  }

  /**
   * Updates lifecycle/payment state and remarks only — every other field is
   * an immutable purchase-time snapshot. Cancelling unassigns the stream
   * (best-effort: a no-op if it was already reassigned elsewhere since).
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    return this.applyStatusUpdate(order, dto);
  }

  async updateStatusForCustomer(
    customerId: string,
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.findOneForCustomer(customerId, id);
    return this.applyStatusUpdate(order, dto);
  }

  private async applyStatusUpdate(
    order: Order,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    if (
      dto.status === OrderStatus.CANCELLED &&
      order.status !== OrderStatus.CANCELLED
    ) {
      await this.streamsService.unassignSingleStreamFromCustomer(
        order.stream_id,
        order.customer_id,
      );
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
