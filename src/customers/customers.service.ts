import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
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
    private readonly configService: ConfigService,
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
    await this.assertUsernameAvailable(dto.username);

    const { password, ...rest } = dto;
    const customer = this.customersRepository.create({
      ...rest,
      password_hash: await this.hashPassword(password),
    });
    return this.customersRepository.save(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    this.assertSettableStatus(dto.status);
    const customer = await this.findOne(id);

    if (dto.phone && dto.phone !== customer.phone) {
      await this.assertPhoneAvailable(dto.phone);
    }
    if (dto.username && dto.username !== customer.username) {
      await this.assertUsernameAvailable(dto.username);
    }

    const { password, ...rest } = dto;
    Object.assign(customer, rest);
    if (password) {
      customer.password_hash = await this.hashPassword(password);
    }
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

  private async assertUsernameAvailable(username: string): Promise<void> {
    const existing = await this.customersRepository.findOne({
      where: { username },
    });
    if (existing) {
      throw new ConflictException(
        'A customer with this username already exists',
      );
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>('bcryptSaltRounds')!;
    return bcrypt.hash(password, saltRounds);
  }
}
