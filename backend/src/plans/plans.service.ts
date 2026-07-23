import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { QueryPlanDto } from './dto/query-plan.dto';
import { PlanStatus } from './enums/plan-status.enum';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
  ) {}

  async findAll(query: QueryPlanDto): Promise<PaginatedResult<Plan>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.plansRepository
      .createQueryBuilder('plan')
      .where('plan.status != :deleted', { deleted: PlanStatus.DELETED });

    if (query.search) {
      qb.andWhere('(plan.name LIKE :search OR plan.description LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.status) {
      qb.andWhere('plan.status = :status', { status: query.status });
    }

    qb.orderBy('plan.created_at', 'DESC')
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

  /** Active plans visible to customers directly (no reseller involved). */
  findVisibleForCustomer(): Promise<Plan[]> {
    return this.plansRepository.find({
      where: { status: PlanStatus.ACTIVE, show_customer: true },
      order: { created_at: 'DESC' },
    });
  }

  /** Active plans visible to resellers, for pricing their own customers via reseller_price. */
  findVisibleForReseller(): Promise<Plan[]> {
    return this.plansRepository.find({
      where: { status: PlanStatus.ACTIVE, show_reseller: true },
      order: { created_at: 'DESC' },
    });
  }

  /** Batch lookup (including inactive/deleted rows, so an order's plan name still resolves in reports) — used by OrdersService to enrich order listings. */
  findByIds(ids: string[]): Promise<Plan[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.plansRepository.find({ where: { id: In(ids) } });
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.plansRepository.findOne({
      where: { id, status: Not(PlanStatus.DELETED) },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async create(dto: CreatePlanDto): Promise<Plan> {
    this.assertSettableStatus(dto.status);

    const plan = this.plansRepository.create({
      ...dto,
      mrp: dto.mrp.toFixed(2),
      customer_price: dto.customer_price.toFixed(2),
      reseller_percentage: dto.reseller_percentage.toFixed(2),
      reseller_price: this.computeResellerPrice(
        dto.customer_price,
        dto.reseller_percentage,
      ),
    });
    return this.plansRepository.save(plan);
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    this.assertSettableStatus(dto.status);
    const plan = await this.findOne(id);

    const { mrp, customer_price, reseller_percentage, ...rest } = dto;
    Object.assign(plan, rest);

    if (mrp !== undefined) plan.mrp = mrp.toFixed(2);
    if (customer_price !== undefined)
      plan.customer_price = customer_price.toFixed(2);
    if (reseller_percentage !== undefined) {
      plan.reseller_percentage = reseller_percentage.toFixed(2);
    }
    if (customer_price !== undefined || reseller_percentage !== undefined) {
      plan.reseller_price = this.computeResellerPrice(
        customer_price ?? Number(plan.customer_price),
        reseller_percentage ?? Number(plan.reseller_percentage),
      );
    }

    return this.plansRepository.save(plan);
  }

  /** Soft delete: the row is never physically removed, only marked as deleted. */
  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    plan.status = PlanStatus.DELETED;
    await this.plansRepository.save(plan);
  }

  /** Discount is off customer_price, not mrp — mrp is just the list/ceiling price shown for comparison. */
  private computeResellerPrice(
    customerPrice: number,
    resellerPercentage: number,
  ): string {
    const price = customerPrice * (1 - resellerPercentage / 100);
    return Math.max(0, price).toFixed(2);
  }

  private assertSettableStatus(status: PlanStatus | undefined): void {
    if (status === PlanStatus.DELETED) {
      throw new BadRequestException(
        'status cannot be set to "deleted" directly; use DELETE /plans/:id instead',
      );
    }
  }
}
