import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlussonicStreamSession } from './entities/flussonic-stream-session.entity';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { QueryFlussonicStreamSessionDto } from './dto/query-flussonic-stream-session.dto';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicStreamsService } from './flussonic-streams.service';
import { buildFlussonicApiUrl } from './utils/flussonic-api-url.util';
import { fetchIpWhoIs } from '../common/utils/ipwhois.util';
import { nowUnixSeconds } from '../common/utils/unix-timestamp.util';
import type {
  FlussonicSessionEntry,
  FlussonicSessionsListResponse,
} from './interfaces/flussonic-session.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_SYNC_PAGES = 200;

export interface SyncSessionsSummary {
  total: number;
  created: number;
  updated: number;
}

@Injectable()
export class FlussonicStreamSessionsService {
  constructor(
    @InjectRepository(FlussonicStreamSession)
    private readonly sessionsRepository: Repository<FlussonicStreamSession>,
    private readonly serversService: FlussonicServersService,
    private readonly streamsService: FlussonicStreamsService,
    private readonly configService: ConfigService,
  ) {}

  async findAllForServer(
    serverId: string,
    query: QueryFlussonicStreamSessionDto,
  ): Promise<PaginatedResult<FlussonicStreamSession>> {
    await this.serversService.findOne(serverId); // 404s if the server doesn't exist or is soft-deleted

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Sessions have no server_id of their own — attribute them to a server via
    // the local stream row (set during sync) they matched by name.
    const qb = this.sessionsRepository
      .createQueryBuilder('session')
      .innerJoin(
        'flussonic_streams',
        'stream',
        'stream.id = session.flussonic_stream_id',
      )
      .where('stream.flussonic_server_id = :serverId', { serverId });

    if (query.search) {
      qb.andWhere(
        '(session.stream_name LIKE :search OR session.ip LIKE :search OR session.country LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.latestOnly) {
      // A row not touched by the most recent sync means Flussonic no longer
      // reported it — the session has effectively ended.
      qb.andWhere(
        `session.synced_at = (
          SELECT MAX(s2.synced_at)
          FROM flussonic_stream_sessions s2
          INNER JOIN flussonic_streams st2 ON st2.id = s2.flussonic_stream_id
          WHERE st2.flussonic_server_id = :serverId
        )`,
        { serverId },
      );
    }

    qb.orderBy('session.updated_at', 'DESC')
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
   * Pulls every current session from the server's real `GET sessions`
   * (cursor-paginated, covers all streams at once) and upserts each by its
   * Flussonic session id — one row per real session, refreshed while it's
   * ongoing. A brand-new session's IP is enriched via ipwho.is (best-effort,
   * never blocks the sync).
   */
  async syncFromFlussonic(serverId: string): Promise<SyncSessionsSummary> {
    const server = await this.serversService.findOne(serverId);
    const sessions = await this.fetchAllSessions(server);

    // Captured once and stamped on every row this run touches, so "latest
    // synced" can be identified later via MAX(synced_at) instead of needing
    // a separate sync-run table.
    const syncTimestamp = nowUnixSeconds();

    let created = 0;
    let updated = 0;
    for (const entry of sessions) {
      const existing = await this.sessionsRepository.findOne({
        where: { session_uuid: entry.id },
      });

      const stream = await this.streamsService.findByNameInDb(
        serverId,
        entry.name,
      );

      if (existing) {
        existing.flussonic_stream_id = stream?.id ?? null;
        existing.stream_name = entry.name;
        existing.type = entry.type ?? null;
        existing.ip = entry.ip ?? null;
        existing.started_at = toUnixSeconds(entry.started_at);
        existing.proto = entry.proto ?? null;
        existing.updated_at = toUnixSeconds(entry.updated_at);
        existing.country = entry.country ?? null;
        existing.synced_at = syncTimestamp;
        await this.sessionsRepository.save(existing);
        updated++;
        continue;
      }

      const ipwhoisJson = entry.ip
        ? await fetchIpWhoIs(
            entry.ip,
            this.configService.get<string>('ipWhoIsApiUrl')!,
          )
        : null;

      const session = this.sessionsRepository.create({
        flussonic_stream_id: stream?.id ?? null,
        session_uuid: entry.id,
        stream_name: entry.name,
        type: entry.type ?? null,
        ip: entry.ip ?? null,
        started_at: toUnixSeconds(entry.started_at),
        proto: entry.proto ?? null,
        updated_at: toUnixSeconds(entry.updated_at),
        country: entry.country ?? null,
        ipwhois_json: ipwhoisJson,
        synced_at: syncTimestamp,
      });
      await this.sessionsRepository.save(session);
      created++;
    }

    return { total: sessions.length, created, updated };
  }

  /** Follows `next` cursor pagination until exhausted (capped at MAX_SYNC_PAGES as a safety net). */
  private async fetchAllSessions(
    server: FlussonicServer,
  ): Promise<FlussonicSessionEntry[]> {
    const accessToken = await this.serversService.ensureAccessToken(server);
    const all: FlussonicSessionEntry[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < MAX_SYNC_PAGES; page++) {
      const url =
        buildFlussonicApiUrl(server, 'sessions') +
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
          `Failed to list sessions from "${server.name}" (${url}): ${reason}`,
        );
      }

      const body = (await res.json()) as FlussonicSessionsListResponse;
      all.push(...body.sessions);

      if (!body.next) break;
      cursor = body.next;
    }

    return all;
  }
}

/** Flussonic session timestamps come back in milliseconds; the rest of this app stores unix seconds. */
function toUnixSeconds(ms: number | undefined): number | null {
  return ms !== undefined ? Math.floor(ms / 1000) : null;
}
