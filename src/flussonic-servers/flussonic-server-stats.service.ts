import { BadGatewayException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { FlussonicServerStat } from './entities/flussonic-server-stat.entity';
import { CreateFlussonicServerStatDto } from './dto/create-flussonic-server-stat.dto';
import { QueryFlussonicServerStatDto } from './dto/query-flussonic-server-stat.dto';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicServerStatus } from './enums/flussonic-server-status.enum';
import type { FlussonicStatsResponse } from './interfaces/flussonic-stats-response.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const SYNC_TIMEOUT_MS = 8_000;

export interface SyncAllResult {
  serverId: string;
  name: string;
  ok: boolean;
  error?: string;
}

export interface SyncAllSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: SyncAllResult[];
}

@Injectable()
export class FlussonicServerStatsService {
  constructor(
    @InjectRepository(FlussonicServerStat)
    private readonly statsRepository: Repository<FlussonicServerStat>,
    @InjectRepository(FlussonicServer)
    private readonly serversRepository: Repository<FlussonicServer>,
    private readonly serversService: FlussonicServersService,
  ) {}

  async findAllForServer(
    serverId: string,
    query: QueryFlussonicServerStatDto,
  ): Promise<PaginatedResult<FlussonicServerStat>> {
    await this.serversService.findOne(serverId); // 404s if the server doesn't exist or is soft-deleted

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.statsRepository.findAndCount({
      where: { server_id: serverId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async create(
    serverId: string,
    dto: CreateFlussonicServerStatDto,
  ): Promise<FlussonicServerStat> {
    await this.serversService.findOne(serverId);

    // Decimal columns (cpu_usage, network_in/out_mbps) come back from MySQL as
    // strings to avoid float precision loss, so TypeORM types them as
    // `string | null` — convert the DTO's numbers to match on the way in.
    const stat = this.statsRepository.create({
      server_id: serverId,
      cpu_usage: dto.cpu_usage?.toString(),
      ram_usage_mb: dto.ram_usage_mb,
      disk_usage_gb: dto.disk_usage_gb,
      network_in_mbps: dto.network_in_mbps?.toString(),
      network_out_mbps: dto.network_out_mbps?.toString(),
      active_streams: dto.active_streams,
      active_viewers: dto.active_viewers,
      active_publishers: dto.active_publishers,
      uptime_seconds: dto.uptime_seconds,
    });
    return this.statsRepository.save(stat);
  }

  /**
   * Polls the real Flussonic server's `config/stats` endpoint, stores the
   * result as a new sample, and updates the parent server's known version
   * and reachability status.
   */
  async sync(serverId: string): Promise<FlussonicServerStat> {
    const server = await this.serversService.findOne(serverId);
    const accessToken = await this.serversService.ensureAccessToken(server);

    const url = this.buildStatsUrl(server);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    let response: FlussonicStatsResponse;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, { headers, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) {
        throw new Error(`upstream responded with HTTP ${res.status}`);
      }
      response = (await res.json()) as FlussonicStatsResponse;
    } catch (err) {
      await this.markUnreachable(server);
      const reason = err instanceof Error ? err.message : 'unknown error';
      throw new BadGatewayException(
        `Failed to sync stats from "${server.name}" (${url}): ${reason}`,
      );
    }

    const stat = this.statsRepository.create(
      this.mapResponseToStat(serverId, response),
    );
    const saved = await this.statsRepository.save(stat);

    await this.markSynced(server, response);

    return saved;
  }

  /** Syncs every non-deleted server, one at a time; a single failure doesn't abort the rest. */
  async syncAll(): Promise<SyncAllSummary> {
    const servers = await this.serversService.findAllActive();

    const results: SyncAllResult[] = [];
    for (const server of servers) {
      try {
        await this.sync(server.id);
        results.push({ serverId: server.id, name: server.name, ok: true });
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

  private buildStatsUrl(server: FlussonicServer): string {
    const basePath = server.api_base_path.replace(/^\/+|\/+$/g, '');
    const path = `${basePath}/${server.api_version_tag}/config/stats`;

    if (server.use_ssl) {
      const host = server.domain || server.hostname;
      return `https://${host}:443/${path}`;
    }
    return `http://${server.hostname}:${server.port}/${path}`;
  }

  private mapResponseToStat(
    serverId: string,
    response: FlussonicStatsResponse,
  ): Partial<FlussonicServerStat> {
    const rootPartition = response.partitions?.find((p) => p.path === 'root');
    const diskUsageGb = rootPartition
      ? Math.round(
          (rootPartition.total_mb * (rootPartition.usage / 100)) / 1024,
        )
      : undefined;

    return {
      server_id: serverId,
      cpu_usage: response.cpu_usage?.toString(),
      memory_usage_percent: response.memory_usage?.toString(),
      disk_usage_gb: diskUsageGb,
      network_in_mbps:
        response.input_kbit !== undefined
          ? (response.input_kbit / 1000).toFixed(2)
          : undefined,
      network_out_mbps:
        response.output_kbit !== undefined
          ? (response.output_kbit / 1000).toFixed(2)
          : undefined,
      active_streams: response.online_streams,
      total_streams: response.total_streams,
      total_clients: response.total_clients,
      scheduler_load: response.scheduler_load,
      streamer_status: response.streamer_status,
      server_version: response.server_version,
      uptime_seconds: response.uptime,
      raw_response: response,
    };
  }

  private async markSynced(
    server: FlussonicServer,
    response: FlussonicStatsResponse,
  ): Promise<void> {
    if (response.server_version) {
      server.flussonic_version = response.server_version;
    }
    if (response.total_clients !== undefined) {
      server.last_total_clients = response.total_clients;
    }
    if (response.uptime !== undefined) {
      server.last_uptime_seconds = response.uptime;
    }
    if (
      server.status !== FlussonicServerStatus.MAINTENANCE &&
      server.status !== FlussonicServerStatus.DELETED
    ) {
      server.status = FlussonicServerStatus.ACTIVE;
    }
    await this.serversRepository.save(server);
  }

  private async markUnreachable(server: FlussonicServer): Promise<void> {
    if (
      server.status !== FlussonicServerStatus.MAINTENANCE &&
      server.status !== FlussonicServerStatus.DELETED
    ) {
      server.status = FlussonicServerStatus.UNREACHABLE;
      await this.serversRepository.save(server);
    }
  }
}
