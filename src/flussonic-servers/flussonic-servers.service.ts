import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { CreateFlussonicServerDto } from './dto/create-flussonic-server.dto';
import { UpdateFlussonicServerDto } from './dto/update-flussonic-server.dto';
import { QueryFlussonicServerDto } from './dto/query-flussonic-server.dto';
import { encryptSecret } from '../common/utils/encryption.util';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class FlussonicServersService {
  constructor(
    @InjectRepository(FlussonicServer)
    private readonly serversRepository: Repository<FlussonicServer>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    query: QueryFlussonicServerDto,
  ): Promise<PaginatedResult<FlussonicServer>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.serversRepository.createQueryBuilder('server');

    if (query.search) {
      qb.andWhere(
        '(server.name LIKE :search OR server.hostname LIKE :search OR server.domain LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.status) {
      qb.andWhere('server.status = :status', { status: query.status });
    }

    qb.orderBy('server.created_at', 'DESC')
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

  async findOne(id: string): Promise<FlussonicServer> {
    const server = await this.serversRepository.findOne({ where: { id } });
    if (!server) {
      throw new NotFoundException('Flussonic server not found');
    }
    return server;
  }

  async create(dto: CreateFlussonicServerDto): Promise<FlussonicServer> {
    await this.assertHostPortAvailable(dto.hostname, dto.port ?? 80);

    const encryptionKey = this.credentialsEncryptionKey();
    const { api_password, api_access_token, ...rest } = dto;

    const server = this.serversRepository.create({
      ...rest,
      api_password_enc: encryptSecret(api_password, encryptionKey),
      api_access_token: api_access_token
        ? encryptSecret(api_access_token, encryptionKey)
        : null,
    });

    return this.serversRepository.save(server);
  }

  async update(
    id: string,
    dto: UpdateFlussonicServerDto,
  ): Promise<FlussonicServer> {
    const server = await this.findOne(id);

    const nextHostname = dto.hostname ?? server.hostname;
    const nextPort = dto.port ?? server.port;
    if (nextHostname !== server.hostname || nextPort !== server.port) {
      await this.assertHostPortAvailable(nextHostname, nextPort, id);
    }

    const encryptionKey = this.credentialsEncryptionKey();
    const { api_password, api_access_token, ...rest } = dto;

    Object.assign(server, rest);
    if (api_password) {
      server.api_password_enc = encryptSecret(api_password, encryptionKey);
    }
    if (api_access_token !== undefined) {
      server.api_access_token = api_access_token
        ? encryptSecret(api_access_token, encryptionKey)
        : null;
    }

    return this.serversRepository.save(server);
  }

  async remove(id: string): Promise<void> {
    const server = await this.findOne(id);
    await this.serversRepository.remove(server);
  }

  private async assertHostPortAvailable(
    hostname: string,
    port: number,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.serversRepository
      .createQueryBuilder('server')
      .where('server.hostname = :hostname AND server.port = :port', {
        hostname,
        port,
      });

    if (excludeId) {
      qb.andWhere('server.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(
        `A server with hostname "${hostname}" and port ${port} already exists`,
      );
    }
  }

  private credentialsEncryptionKey(): string {
    return this.configService.get<string>('credentialsEncryptionKey')!;
  }
}
