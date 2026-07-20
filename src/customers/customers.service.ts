import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CustomerStatus } from './enums/customer-status.enum';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  async findAll(query: QueryCustomerDto): Promise<PaginatedResult<Customer>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.customersRepository
      .createQueryBuilder('customer')
      .where('customer.status != :deleted', {
        deleted: CustomerStatus.DELETED,
      });

    if (query.search) {
      qb.andWhere(
        '(customer.name LIKE :search OR customer.phone LIKE :search OR customer.email LIKE :search OR customer.company_name LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.status) {
      qb.andWhere('customer.status = :status', { status: query.status });
    }

    qb.orderBy('customer.created_at', 'DESC')
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

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id, status: Not(CustomerStatus.DELETED) },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    this.assertSettableStatus(dto.status);
    await this.assertPhoneAvailable(dto.phone);
    const customer = this.customersRepository.create(dto);
    return this.customersRepository.save(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    this.assertSettableStatus(dto.status);
    const customer = await this.findOne(id);

    if (dto.phone && dto.phone !== customer.phone) {
      await this.assertPhoneAvailable(dto.phone);
    }

    Object.assign(customer, dto);
    return this.customersRepository.save(customer);
  }

  /** Soft delete: the row is never physically removed, only marked as deleted. */
  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    customer.status = CustomerStatus.DELETED;
    await this.customersRepository.save(customer);
  }

  private assertSettableStatus(status: CustomerStatus | undefined): void {
    if (status === CustomerStatus.DELETED) {
      throw new BadRequestException(
        'status cannot be set to "deleted" directly; use DELETE /customers/:id instead',
      );
    }
  }

  private async assertPhoneAvailable(phone: string): Promise<void> {
    const existing = await this.customersRepository.findOne({
      where: { phone },
    });
    if (existing) {
      throw new ConflictException(
        'A customer with this phone number already exists',
      );
    }
  }
}
