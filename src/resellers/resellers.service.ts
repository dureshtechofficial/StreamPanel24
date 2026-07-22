import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Not, Repository } from 'typeorm';
import { Reseller } from './entities/reseller.entity';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { UpdateResellerDto } from './dto/update-reseller.dto';
import { QueryResellerDto } from './dto/query-reseller.dto';
import { ResellerStatus } from './enums/reseller-status.enum';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class ResellersService {
  constructor(
    @InjectRepository(Reseller)
    private readonly resellersRepository: Repository<Reseller>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: QueryResellerDto): Promise<PaginatedResult<Reseller>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.resellersRepository
      .createQueryBuilder('reseller')
      .where('reseller.status != :deleted', {
        deleted: ResellerStatus.DELETED,
      });

    if (query.search) {
      qb.andWhere(
        '(reseller.name LIKE :search OR reseller.phone LIKE :search OR reseller.email LIKE :search OR reseller.company_name LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.status) {
      qb.andWhere('reseller.status = :status', { status: query.status });
    }

    qb.orderBy('reseller.created_at', 'DESC')
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

  async findOne(id: string): Promise<Reseller> {
    const reseller = await this.resellersRepository.findOne({
      where: { id, status: Not(ResellerStatus.DELETED) },
    });
    if (!reseller) {
      throw new NotFoundException('Reseller not found');
    }
    return reseller;
  }

  /** Non-throwing lookup for the reseller-auth JWT strategies (an invalid/deleted id should 401, not 404). */
  findActiveById(id: string): Promise<Reseller | null> {
    return this.resellersRepository.findOne({
      where: { id, status: Not(ResellerStatus.DELETED) },
    });
  }

  /** Batch lookup (including deleted rows, so an order's reseller name still resolves in reports) — used by OrdersService to enrich order listings. */
  findByIds(ids: string[]): Promise<Reseller[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.resellersRepository.find({ where: { id: In(ids) } });
  }

  /** Matches phone number OR username — the reseller login form accepts either as the identifier. */
  findByIdentifierWithPassword(identifier: string): Promise<Reseller | null> {
    return this.resellersRepository
      .createQueryBuilder('reseller')
      .addSelect('reseller.password_hash')
      .where('reseller.status != :deleted', {
        deleted: ResellerStatus.DELETED,
      })
      .andWhere(
        '(reseller.phone = :identifier OR reseller.username = :identifier)',
        { identifier },
      )
      .getOne();
  }

  async create(dto: CreateResellerDto): Promise<Reseller> {
    this.assertSettableStatus(dto.status);
    await this.assertPhoneAvailable(dto.phone);
    await this.assertUsernameAvailable(dto.username);

    const { password, ...rest } = dto;
    const reseller = this.resellersRepository.create({
      ...rest,
      password_hash: await this.hashPassword(password),
    });
    return this.resellersRepository.save(reseller);
  }

  async update(id: string, dto: UpdateResellerDto): Promise<Reseller> {
    this.assertSettableStatus(dto.status);
    const reseller = await this.findOne(id);

    if (dto.phone && dto.phone !== reseller.phone) {
      await this.assertPhoneAvailable(dto.phone);
    }
    if (dto.username && dto.username !== reseller.username) {
      await this.assertUsernameAvailable(dto.username);
    }

    const { password, ...rest } = dto;
    Object.assign(reseller, rest);
    if (password) {
      reseller.password_hash = await this.hashPassword(password);
    }
    return this.resellersRepository.save(reseller);
  }

  /**
   * The only place `wallet_balance` is ever mutated — always by a signed
   * delta (positive for a topup), never set directly, so callers can't
   * accidentally clobber a concurrent change. Used by WalletService, which
   * pairs every call with a WalletTransaction row logging why the balance
   * moved. Rejects a delta that would take the balance negative.
   */
  async adjustWalletBalance(id: string, delta: number): Promise<Reseller> {
    const reseller = await this.findOne(id);
    const newBalance = Number(reseller.wallet_balance) + delta;
    if (newBalance < 0) {
      throw new BadRequestException(
        'This would take the wallet balance below zero',
      );
    }
    reseller.wallet_balance = newBalance.toFixed(2);
    return this.resellersRepository.save(reseller);
  }

  /** Soft delete: the row is never physically removed, only marked as deleted. */
  async remove(id: string): Promise<void> {
    const reseller = await this.findOne(id);
    reseller.status = ResellerStatus.DELETED;
    await this.resellersRepository.save(reseller);
  }

  private assertSettableStatus(status: ResellerStatus | undefined): void {
    if (status === ResellerStatus.DELETED) {
      throw new BadRequestException(
        'status cannot be set to "deleted" directly; use DELETE /resellers/:id instead',
      );
    }
  }

  private async assertPhoneAvailable(phone: string): Promise<void> {
    const existing = await this.resellersRepository.findOne({
      where: { phone },
    });
    if (existing) {
      throw new ConflictException(
        'A reseller with this phone number already exists',
      );
    }
  }

  private async assertUsernameAvailable(username: string): Promise<void> {
    const existing = await this.resellersRepository.findOne({
      where: { username },
    });
    if (existing) {
      throw new ConflictException(
        'A reseller with this username already exists',
      );
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>('bcryptSaltRounds')!;
    return bcrypt.hash(password, saltRounds);
  }
}
