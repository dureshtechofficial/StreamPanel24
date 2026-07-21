import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlussonicStream } from './entities/flussonic-stream.entity';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { CreateFlussonicStreamDto } from './dto/create-flussonic-stream.dto';
import { UpdateFlussonicStreamDto } from './dto/update-flussonic-stream.dto';
import { QueryFlussonicStreamDto } from './dto/query-flussonic-stream.dto';
import { FlussonicStreamStatus } from './enums/flussonic-stream-status.enum';
import { FlussonicServersService } from './flussonic-servers.service';
import { buildFlussonicApiUrl } from './utils/flussonic-api-url.util';
import { nowUnixSeconds } from '../common/utils/unix-timestamp.util';
import type { FlussonicStreamConfig } from './interfaces/flussonic-stream-config.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const REQUEST_TIMEOUT_MS = 8_000;

@Injectable()
export class FlussonicStreamsService {
  constructor(
    @InjectRepository(FlussonicStream)
    private readonly streamsRepository: Repository<FlussonicStream>,
    private readonly serversService: FlussonicServersService,
  ) {}

  async findAllForServer(
    serverId: string,
    query: QueryFlussonicStreamDto,
  ): Promise<PaginatedResult<FlussonicStream>> {
    await this.serversService.findOne(serverId); // 404s if the server doesn't exist or is soft-deleted

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.streamsRepository
      .createQueryBuilder('stream')
      .where('stream.flussonic_server_id = :serverId', { serverId })
      .andWhere('stream.status != :deleted', {
        deleted: FlussonicStreamStatus.DELETED,
      });

    if (query.search) {
      qb.andWhere(
        "(JSON_UNQUOTE(JSON_EXTRACT(stream.config_json, '$.name')) LIKE :search OR JSON_UNQUOTE(JSON_EXTRACT(stream.config_json, '$.title')) LIKE :search OR stream.ingest_domain LIKE :search)",
        { search: `%${query.search}%` },
      );
    }

    if (query.status) {
      qb.andWhere('stream.status = :status', { status: query.status });
    }

    qb.orderBy('stream.created_at', 'DESC')
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

  async findOneForServer(
    serverId: string,
    id: string,
  ): Promise<FlussonicStream> {
    const stream = await this.streamsRepository.findOne({
      where: { id, flussonic_server_id: serverId },
    });
    if (!stream || stream.status === FlussonicStreamStatus.DELETED) {
      throw new NotFoundException('Stream not found');
    }
    return stream;
  }

  async checkNameExists(
    serverId: string,
    name: string,
  ): Promise<{ existsInDb: boolean; existsOnServer: boolean }> {
    const server = await this.serversService.findOne(serverId);
    const [existsInDb, existsOnServer] = await Promise.all([
      this.nameExistsInDb(serverId, name),
      this.nameExistsOnFlussonic(server, name),
    ]);
    return { existsInDb, existsOnServer };
  }

  async create(
    serverId: string,
    dto: CreateFlussonicStreamDto,
  ): Promise<FlussonicStream> {
    this.assertSettableStatus(dto.status);
    const server = await this.serversService.findOne(serverId);
    await this.assertNameAvailable(serverId, dto.name);

    if (!dto.confirmOverwrite) {
      const existsOnServer = await this.nameExistsOnFlussonic(server, dto.name);
      if (existsOnServer) {
        throw new ConflictException(
          `A stream named "${dto.name}" already exists on the Flussonic server (created outside this app) — confirm to overwrite it`,
        );
      }
    }

    const config = this.stripUndefined<FlussonicStreamConfig>({
      name: dto.name,
      comment: dto.comment,
      title: dto.title,
      static: dto.static,
      disabled: dto.disabled,
      inputs: dto.inputs,
      retry_limit: dto.retry_limit,
      protocols: dto.protocols,
      on_play: dto.on_play,
      on_publish: dto.on_publish,
    });

    await this.putToFlussonic(server, config);

    const stream = this.streamsRepository.create({
      flussonic_server_id: serverId,
      ingest_domain: dto.ingest_domain ?? null,
      config_json: config,
      status: FlussonicStreamStatus.ACTIVE,
    });
    return this.streamsRepository.save(stream);
  }

  async update(
    serverId: string,
    id: string,
    dto: UpdateFlussonicStreamDto,
  ): Promise<FlussonicStream> {
    this.assertSettableStatus(dto.status);
    const stream = await this.findOneForServer(serverId, id);
    const server = await this.serversService.findOne(serverId);
    const existing = stream.config_json;

    const newName = dto.name?.trim();
    const isRename = Boolean(newName) && newName !== existing.name;

    if (isRename) {
      await this.assertNameAvailable(serverId, newName!);
      if (!dto.confirmOverwrite) {
        const existsOnServer = await this.nameExistsOnFlussonic(
          server,
          newName!,
        );
        if (existsOnServer) {
          throw new ConflictException(
            `A stream named "${newName}" already exists on the Flussonic server (created outside this app) — confirm to overwrite it`,
          );
        }
      }
    }

    const mergedConfig = this.stripUndefined<FlussonicStreamConfig>({
      name: isRename ? newName! : existing.name,
      comment: dto.comment ?? existing.comment,
      title: dto.title ?? existing.title,
      static: dto.static ?? existing.static,
      disabled: dto.disabled ?? existing.disabled,
      inputs: dto.inputs ?? existing.inputs,
      retry_limit: dto.retry_limit ?? existing.retry_limit,
      protocols: dto.protocols ?? existing.protocols,
      on_play: dto.on_play ?? existing.on_play,
      on_publish: dto.on_publish ?? existing.on_publish,
    });

    // Flussonic has no rename operation — the "new" name is a different stream
    // resource, so renaming means creating it under the new name and removing
    // the old one. Create first: if it fails, the old stream is left intact.
    await this.putToFlussonic(server, mergedConfig);
    if (isRename) {
      await this.deleteFromFlussonic(server, existing.name);
    }

    stream.config_json = mergedConfig;
    if (dto.ingest_domain !== undefined) {
      stream.ingest_domain = dto.ingest_domain;
    }
    if (dto.status) {
      stream.status = dto.status;
    }
    return this.streamsRepository.save(stream);
  }

  /** Soft delete: removes the stream from Flussonic, but the local row is never physically removed. */
  async remove(serverId: string, id: string): Promise<void> {
    const stream = await this.findOneForServer(serverId, id);
    const server = await this.serversService.findOne(serverId);

    await this.deleteFromFlussonic(server, stream.config_json.name);

    stream.status = FlussonicStreamStatus.DELETED;
    stream.deleted_at = nowUnixSeconds();
    await this.streamsRepository.save(stream);
  }

  private assertSettableStatus(
    status: FlussonicStreamStatus | undefined,
  ): void {
    if (status === FlussonicStreamStatus.DELETED) {
      throw new BadRequestException(
        'status cannot be set to "deleted" directly; use DELETE instead',
      );
    }
  }

  private async assertNameAvailable(
    serverId: string,
    name: string,
  ): Promise<void> {
    if (await this.nameExistsInDb(serverId, name)) {
      throw new ConflictException(
        `A stream named "${name}" already exists on this server`,
      );
    }
  }

  private async nameExistsInDb(
    serverId: string,
    name: string,
  ): Promise<boolean> {
    const existing = await this.streamsRepository
      .createQueryBuilder('stream')
      .where('stream.flussonic_server_id = :serverId', { serverId })
      .andWhere('stream.status != :deleted', {
        deleted: FlussonicStreamStatus.DELETED,
      })
      .andWhere(
        "JSON_UNQUOTE(JSON_EXTRACT(stream.config_json, '$.name')) = :name",
        { name },
      )
      .getOne();
    return Boolean(existing);
  }

  /**
   * Checks the real Flussonic server directly (not just our local cache) —
   * a stream can exist there without a matching row here if it was created
   * outside this app, or if our cache ever drifted from upstream.
   */
  private async nameExistsOnFlussonic(
    server: FlussonicServer,
    name: string,
  ): Promise<boolean> {
    const accessToken = await this.serversService.ensureAccessToken(server);
    const url = buildFlussonicApiUrl(
      server,
      `streams/${encodeURIComponent(name)}`,
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (res.status === 404) return false;
      if (res.ok) return true;
      throw new Error(`upstream responded with HTTP ${res.status}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      throw new BadGatewayException(
        `Failed to verify whether stream "${name}" already exists on "${server.name}" (${url}): ${reason}`,
      );
    }
  }

  private async putToFlussonic(
    server: FlussonicServer,
    config: FlussonicStreamConfig,
  ): Promise<void> {
    const accessToken = await this.serversService.ensureAccessToken(server);
    const url = buildFlussonicApiUrl(
      server,
      `streams/${encodeURIComponent(config.name)}`,
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(config),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) {
        throw new Error(`upstream responded with HTTP ${res.status}`);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      throw new BadGatewayException(
        `Failed to save stream "${config.name}" on "${server.name}" (${url}): ${reason}`,
      );
    }
  }

  private async deleteFromFlussonic(
    server: FlussonicServer,
    name: string,
  ): Promise<void> {
    const accessToken = await this.serversService.ensureAccessToken(server);
    const url = buildFlussonicApiUrl(
      server,
      `streams/${encodeURIComponent(name)}`,
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      // A 404 means it's already gone upstream — treat that as success, not a failure.
      if (!res.ok && res.status !== 404) {
        throw new Error(`upstream responded with HTTP ${res.status}`);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      throw new BadGatewayException(
        `Failed to delete stream "${name}" from "${server.name}" (${url}): ${reason}`,
      );
    }
  }

  private stripUndefined<T extends object>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }
}
