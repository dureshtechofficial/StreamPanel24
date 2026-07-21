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

  /** Reseller-portal equivalent of findAll — scoped to only that reseller's own customers. */
  async findAllForReseller(
    resellerId: string,
    query: QueryCustomerDto,
  ): Promise<PaginatedResult<Customer>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.customersRepository
      .createQueryBuilder('customer')
      .where('customer.reseller_id = :resellerId', { resellerId })
      .andWhere('customer.status != :deleted', {
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

  /** 404s if the customer doesn't exist, is soft-deleted, or belongs to a different reseller. */
  async findOneForReseller(resellerId: string, id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: {
        id,
        reseller_id: resellerId,
        status: Not(CustomerStatus.DELETED),
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  /** Like create(), but always forces reseller_id to the authenticated reseller — a reseller-supplied reseller_id (if any) is ignored. */
  async createForReseller(
    resellerId: string,
    dto: CreateCustomerDto,
  ): Promise<Customer> {
    this.assertSettableStatus(dto.status);
    await this.assertPhoneAvailable(dto.phone);
    await this.assertUsernameAvailable(dto.username);

    const { password, reseller_id, ...rest } = dto;
    void reseller_id; // always forced from the authenticated reseller below, never from the request body
    const customer = this.customersRepository.create({
      ...rest,
      reseller_id: resellerId,
      password_hash: await this.hashPassword(password),
    });
    return this.customersRepository.save(customer);
  }

  /** Like update(), but scoped to the reseller's own customers and never lets reseller_id be reassigned. */
  async updateForReseller(
    resellerId: string,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<Customer> {
    this.assertSettableStatus(dto.status);
    const customer = await this.findOneForReseller(resellerId, id);

    if (dto.phone && dto.phone !== customer.phone) {
      await this.assertPhoneAvailable(dto.phone);
    }
    if (dto.username && dto.username !== customer.username) {
      await this.assertUsernameAvailable(dto.username);
    }

    const { password, reseller_id, ...rest } = dto;
    void reseller_id; // never reassigned via this path — reseller_id stays whatever it already was
    Object.assign(customer, rest);
    if (password) {
      customer.password_hash = await this.hashPassword(password);
    }
    return this.customersRepository.save(customer);
  }

  /** Soft delete scoped to the reseller's own customers. */
  async removeForReseller(resellerId: string, id: string): Promise<void> {
    const customer = await this.findOneForReseller(resellerId, id);
    customer.status = CustomerStatus.DELETED;
    await this.customersRepository.save(customer);
  }

  /** Non-throwing lookup for the customer-auth JWT strategies (an invalid/deleted id should 401, not 404). */
  findActiveById(id: string): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { id, status: Not(CustomerStatus.DELETED) },
    });
  }

  /** Matches phone number OR username — the customer login form accepts either as the identifier. */
  findByIdentifierWithPassword(identifier: string): Promise<Customer | null> {
    return this.customersRepository
      .createQueryBuilder('customer')
      .addSelect('customer.password_hash')
      .where('customer.status != :deleted', {
        deleted: CustomerStatus.DELETED,
      })
      .andWhere(
        '(customer.phone = :identifier OR customer.username = :identifier)',
        { identifier },
      )
      .getOne();
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
