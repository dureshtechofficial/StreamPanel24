import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { FlussonicStream } from './entities/flussonic-stream.entity';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { CreateFlussonicStreamDto } from './dto/create-flussonic-stream.dto';
import { UpdateFlussonicStreamDto } from './dto/update-flussonic-stream.dto';
import { QueryFlussonicStreamDto } from './dto/query-flussonic-stream.dto';
import { QueryFlussonicStreamsDirectoryDto } from './dto/query-flussonic-streams-directory.dto';
import { FlussonicStreamStatus } from './enums/flussonic-stream-status.enum';
import { FlussonicServersService } from './flussonic-servers.service';
import { buildFlussonicApiUrl } from './utils/flussonic-api-url.util';
import { nowUnixSeconds } from '../common/utils/unix-timestamp.util';
import type { FlussonicStreamConfig } from './interfaces/flussonic-stream-config.interface';
import type {
  FlussonicLiveStream,
  FlussonicStreamsListResponse,
} from './interfaces/flussonic-live-stream.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_SYNC_PAGES = 100;

export interface SyncStreamsSummary {
  total: number;
  created: number;
  updated: number;
}

export interface SyncAllServersResult {
  serverId: string;
  name: string;
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
}

export interface SyncAllServersSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: SyncAllServersResult[];
}

export interface FlussonicStreamDirectoryEntry {
  id: string;
  name: string;
  server_id: string;
  server_name: string;
  customer_id: string | null;
  status: FlussonicStreamStatus;
}

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

  /**
   * Cross-server stream search for the customer stream-assignment picker.
   * `availableForCustomerId` restricts results to streams that are either
   * unassigned or already assigned to that customer — a stream taken by a
   * *different* customer is excluded entirely, so the picker can never show
   * (let alone let an admin select) a stream that isn't actually available.
   */
  async findAllAcrossServers(
    query: QueryFlussonicStreamsDirectoryDto,
  ): Promise<PaginatedResult<FlussonicStreamDirectoryEntry>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.streamsRepository
      .createQueryBuilder('stream')
      .where('stream.status != :deleted', {
        deleted: FlussonicStreamStatus.DELETED,
      });

    if (query.availableForCustomerId) {
      qb.andWhere(
        '(stream.customer_id IS NULL OR stream.customer_id = :customerId)',
        { customerId: query.availableForCustomerId },
      );
    }

    if (query.search) {
      qb.andWhere(
        "(JSON_UNQUOTE(JSON_EXTRACT(stream.config_json, '$.name')) LIKE :search OR JSON_UNQUOTE(JSON_EXTRACT(stream.config_json, '$.title')) LIKE :search)",
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('stream.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: await this.toDirectoryEntries(items),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /** All streams currently assigned to one customer, across every server. */
  async findAllForCustomer(
    customerId: string,
  ): Promise<FlussonicStreamDirectoryEntry[]> {
    const streams = await this.streamsRepository
      .createQueryBuilder('stream')
      .where('stream.customer_id = :customerId', { customerId })
      .andWhere('stream.status != :deleted', {
        deleted: FlussonicStreamStatus.DELETED,
      })
      .orderBy('stream.created_at', 'DESC')
      .getMany();

    return this.toDirectoryEntries(streams);
  }

  /**
   * Replaces a customer's assigned streams with exactly `streamIds` — any
   * stream currently assigned to this customer but not in the new list is
   * unassigned, and every id in the list is assigned to this customer.
   * Rejects if any id already belongs to a different customer, since a
   * stream can only ever have one customer at a time.
   */
  async assignToCustomer(
    customerId: string,
    streamIds: string[],
  ): Promise<FlussonicStreamDirectoryEntry[]> {
    if (streamIds.length > 0) {
      const conflicting = await this.streamsRepository
        .createQueryBuilder('stream')
        .where('stream.id IN (:...ids)', { ids: streamIds })
        .andWhere('stream.customer_id IS NOT NULL')
        .andWhere('stream.customer_id != :customerId', { customerId })
        .getMany();
      if (conflicting.length > 0) {
        throw new ConflictException(
          `Stream(s) already assigned to another customer: ${conflicting
            .map((s) => s.config_json.name)
            .join(', ')}`,
        );
      }
    }

    const now = nowUnixSeconds();
    await this.streamsRepository.update(
      {
        customer_id: customerId,
        ...(streamIds.length > 0 ? { id: Not(In(streamIds)) } : {}),
      },
      { customer_id: null, updated_at: now },
    );

    if (streamIds.length > 0) {
      await this.streamsRepository.update(
        { id: In(streamIds) },
        { customer_id: customerId, updated_at: now },
      );
    }

    return this.findAllForCustomer(customerId);
  }

  private async toDirectoryEntries(
    streams: FlussonicStream[],
  ): Promise<FlussonicStreamDirectoryEntry[]> {
    const servers = await this.serversService.findAllActive();
    const serverNameById = new Map(servers.map((s) => [s.id, s.name]));

    return streams.map((stream) => ({
      id: stream.id,
      name: stream.config_json.name,
      server_id: stream.flussonic_server_id,
      server_name:
        serverNameById.get(stream.flussonic_server_id) ?? 'Unknown server',
      customer_id: stream.customer_id,
      status: stream.status,
    }));
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

  /**
   * Pulls the server's actual live stream list (`GET streams`, cursor-paginated
   * via `next`) and reconciles it with our cache: a known stream (matched by
   * name) gets its `live_stats_json` refreshed; a stream that exists upstream
   * but has no local row yet is created from its `config_on_disk`. Existing
   * rows' `config_json` is left untouched — live data is additive, not a
   * source of truth for what we'll PUT back on the next edit.
   */
  async syncFromFlussonic(serverId: string): Promise<SyncStreamsSummary> {
    const server = await this.serversService.findOne(serverId);
    const liveStreams = await this.fetchAllLiveStreams(server);

    let created = 0;
    let updated = 0;
    for (const live of liveStreams) {
      const existing = await this.findByNameInDb(serverId, live.name);
      if (existing) {
        existing.live_stats_json = live;
        await this.streamsRepository.save(existing);
        updated++;
      } else if (live.config_on_disk) {
        const stream = this.streamsRepository.create({
          flussonic_server_id: serverId,
          ingest_domain: null,
          config_json: live.config_on_disk as unknown as FlussonicStreamConfig,
          live_stats_json: live,
          status: FlussonicStreamStatus.ACTIVE,
        });
        await this.streamsRepository.save(stream);
        created++;
      }
    }

    return { total: liveStreams.length, created, updated };
  }

  /** Syncs every non-deleted server's streams, one at a time; a single failure doesn't abort the rest. */
  async syncAllServers(): Promise<SyncAllServersSummary> {
    const servers = await this.serversService.findAllActive();

    const results: SyncAllServersResult[] = [];
    for (const server of servers) {
      try {
        const summary = await this.syncFromFlussonic(server.id);
        results.push({
          serverId: server.id,
          name: server.name,
          ok: true,
          created: summary.created,
          updated: summary.updated,
        });
      } catch (err) {
        results.push({
          serverId: server.id,
          name: server.name,
          ok: false,
          error: err instanceof Error ? err.message : 'unknown error',
        });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    return {
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
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
    return Boolean(await this.findByNameInDb(serverId, name));
  }

  /** Public so other services (e.g. session sync) can map a Flussonic-side name to our local row. */
  async findByNameInDb(
    serverId: string,
    name: string,
  ): Promise<FlussonicStream | null> {
    return this.streamsRepository
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
  }

  /** Follows `next` cursor pagination until exhausted (capped at MAX_SYNC_PAGES as a safety net). */
  private async fetchAllLiveStreams(
    server: FlussonicServer,
  ): Promise<FlussonicLiveStream[]> {
    const accessToken = await this.serversService.ensureAccessToken(server);
    const all: FlussonicLiveStream[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < MAX_SYNC_PAGES; page++) {
      const url =
        buildFlussonicApiUrl(server, 'streams') +
        (cursor ? `?next=${encodeURIComponent(cursor)}` : '');

      let res: Response;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS,
        );
        try {
          res = await fetch(url, {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
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
          `Failed to list streams from "${server.name}" (${url}): ${reason}`,
        );
      }

      const body = (await res.json()) as FlussonicStreamsListResponse;
      all.push(...body.streams);

      if (!body.next) break;
      cursor = body.next;
    }

    return all;
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
