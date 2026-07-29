import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { CreateFlussonicServerDto } from './dto/create-flussonic-server.dto';
import { UpdateFlussonicServerDto } from './dto/update-flussonic-server.dto';
import { QueryFlussonicServerDto } from './dto/query-flussonic-server.dto';
import { FlussonicServerStatus } from './enums/flussonic-server-status.enum';
import { decryptSecret, encryptSecret } from '../common/utils/encryption.util';
import { computeFlussonicAccessToken } from './utils/access-token.util';
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

    const qb = this.serversRepository
      .createQueryBuilder('server')
      .where('server.status != :deleted', {
        deleted: FlussonicServerStatus.DELETED,
      });

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
    const server = await this.serversRepository.findOne({
      where: { id, status: Not(FlussonicServerStatus.DELETED) },
    });
    if (!server) {
      throw new NotFoundException('Flussonic server not found');
    }
    return server;
  }

  /** All non-deleted servers, for bulk operations like "sync all". */
  async findAllActive(): Promise<FlussonicServer[]> {
    return this.serversRepository.find({
      where: { status: Not(FlussonicServerStatus.DELETED) },
    });
  }

  async create(dto: CreateFlussonicServerDto): Promise<FlussonicServer> {
    this.assertSettableStatus(dto.status);
    await this.assertHostPortAvailable(dto.hostname, dto.port ?? 80);

    const encryptionKey = this.credentialsEncryptionKey();
    const { api_password, ...rest } = dto;
    const accessToken = computeFlussonicAccessToken(
      dto.api_username,
      api_password,
    );

    const server = this.serversRepository.create({
      ...rest,
      api_password_enc: encryptSecret(api_password, encryptionKey),
      api_access_token: encryptSecret(accessToken, encryptionKey),
    });

    return this.serversRepository.save(server);
  }

  async update(
    id: string,
    dto: UpdateFlussonicServerDto,
  ): Promise<FlussonicServer> {
    this.assertSettableStatus(dto.status);
    const server = await this.findOne(id);

    const nextHostname = dto.hostname ?? server.hostname;
    const nextPort = dto.port ?? server.port;
    if (nextHostname !== server.hostname || nextPort !== server.port) {
      await this.assertHostPortAvailable(nextHostname, nextPort, id);
    }

    const encryptionKey = this.credentialsEncryptionKey();
    const { api_password, ...rest } = dto;

    // Resolve the plaintext password before api_password_enc is overwritten below,
    // since the access token needs to be recomputed from username+password on
    // every update (either one may have just changed).
    const plainPassword =
      api_password ?? decryptSecret(server.api_password_enc, encryptionKey);

    Object.assign(server, rest);
    if (api_password) {
      server.api_password_enc = encryptSecret(api_password, encryptionKey);
    }

    server.api_access_token = encryptSecret(
      computeFlussonicAccessToken(server.api_username, plainPassword),
      encryptionKey,
    );

    return this.serversRepository.save(server);
  }

  /** Soft delete: the row is never physically removed, only marked as deleted. */
  async remove(id: string): Promise<void> {
    const server = await this.findOne(id);
    server.status = FlussonicServerStatus.DELETED;
    await this.serversRepository.save(server);
  }

  /**
   * Decrypted Flussonic access token for calling this server's own API.
   * Self-heals rows created before this field existed by computing and
   * persisting it on first use.
   */
  async ensureAccessToken(server: FlussonicServer): Promise<string> {
    const encryptionKey = this.credentialsEncryptionKey();
    if (server.api_access_token) {
      return decryptSecret(server.api_access_token, encryptionKey);
    }

    const password = decryptSecret(server.api_password_enc, encryptionKey);
    const token = computeFlussonicAccessToken(server.api_username, password);
    server.api_access_token = encryptSecret(token, encryptionKey);
    await this.serversRepository.save(server);
    return token;
  }

  private assertSettableStatus(
    status: FlussonicServerStatus | undefined,
  ): void {
    if (status === FlussonicServerStatus.DELETED) {
      throw new BadRequestException(
        'status cannot be set to "deleted" directly; use DELETE /flussonic-servers/:id instead',
      );
    }
  }

  /**
   * (hostname, port) is unique only among **active** servers — a soft-deleted
   * server's hostname:port is released for reuse, not reserved forever. The DB
   * no longer enforces this (the old `uq_hostname_port` unique key counted
   * deleted rows too and MySQL can't express a status-filtered unique index),
   * so this app-layer check is the sole enforcer.
   */
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
      })
      .andWhere('server.status != :deleted', {
        deleted: FlussonicServerStatus.DELETED,
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
