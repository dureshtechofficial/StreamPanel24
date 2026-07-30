import { BadGatewayException, Injectable } from '@nestjs/common';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { QueryFlussonicStreamSessionDto } from './dto/query-flussonic-stream-session.dto';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicStreamsService } from './flussonic-streams.service';
import { buildFlussonicApiUrl } from './utils/flussonic-api-url.util';
import type {
  FlussonicSessionEntry,
  FlussonicSessionsListResponse,
} from './interfaces/flussonic-session.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_FETCH_PAGES = 200;

/**
 * A single live session as returned to the frontend — read straight from
 * Flussonic's real `GET sessions` on every request, never persisted. `ip_lookup_url`
 * is a computed convenience link; IP geolocation itself is done client-side
 * (browser → ipwho.is) so the backend never hammers a rate-limited API.
 */
export interface LiveStreamSession {
  /** Flussonic's own session id (its `sessions[].id`). */
  session_uuid: string;
  stream_name: string;
  type: string | null;
  ip: string | null;
  proto: string | null;
  /** UTC unix timestamp (seconds) — converted from Flussonic's millisecond value. */
  started_at: number | null;
  /** UTC unix timestamp (seconds) — Flussonic's own session `updated_at`. */
  updated_at: number | null;
  country: string | null;
  /** ip.me lookup link; null when `ip` is null. */
  ip_lookup_url: string | null;
}

/**
 * Stream sessions are NOT stored — every request pulls the current sessions
 * straight from the server's real `GET sessions` endpoint and filters/paginates
 * them in memory. There is no sync/persistence step: the "refresh" button on the
 * sessions view simply re-fetches live.
 */
@Injectable()
export class FlussonicStreamSessionsService {
  constructor(
    private readonly serversService: FlussonicServersService,
    private readonly streamsService: FlussonicStreamsService,
  ) {}

  /** Every current session on the server, filtered by `search` and paginated in memory. */
  async findAllForServer(
    serverId: string,
    query: QueryFlussonicStreamSessionDto,
  ): Promise<PaginatedResult<LiveStreamSession>> {
    const server = await this.serversService.findOne(serverId); // 404s if unknown/soft-deleted
    const sessions = (await this.fetchAllSessions(server)).map(mapEntry);
    const filtered = this.applySearch(sessions, query.search, true);
    return this.paginate(filtered, query);
  }

  /**
   * Current sessions for one specific stream — used by the reseller/customer
   * portals (each behind their own ownership check in the caller controller).
   * Filters the server's live session list down to the stream's name.
   */
  async findAllForStream(
    streamId: string,
    query: QueryFlussonicStreamSessionDto,
  ): Promise<PaginatedResult<LiveStreamSession>> {
    const stream = await this.streamsService.findOneById(streamId);
    if (!stream) return this.emptyPage(query);

    const server = await this.serversService.findOne(stream.flussonic_server_id);
    const streamName = stream.config_json.name;
    const sessions = (await this.fetchAllSessions(server))
      .map(mapEntry)
      .filter((s) => s.stream_name === streamName);
    const filtered = this.applySearch(sessions, query.search, false);
    return this.paginate(filtered, query);
  }

  private applySearch(
    sessions: LiveStreamSession[],
    search: string | undefined,
    includeStreamName: boolean,
  ): LiveStreamSession[] {
    if (!search) return sessions;
    const needle = search.toLowerCase();
    return sessions.filter((s) => {
      const haystack = [
        includeStreamName ? s.stream_name : null,
        s.ip,
        s.country,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }

  private paginate(
    sessions: LiveStreamSession[],
    query: QueryFlussonicStreamSessionDto,
  ): PaginatedResult<LiveStreamSession> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    // Newest activity first — mirrors the old ORDER BY updated_at DESC.
    const sorted = [...sessions].sort(
      (a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0),
    );
    const total = sorted.length;
    const start = (page - 1) * limit;
    return {
      items: sorted.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private emptyPage(
    query: QueryFlussonicStreamSessionDto,
  ): PaginatedResult<LiveStreamSession> {
    return {
      items: [],
      total: 0,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      totalPages: 1,
    };
  }

  /** Follows `next` cursor pagination until exhausted (capped at MAX_FETCH_PAGES as a safety net). */
  private async fetchAllSessions(
    server: FlussonicServer,
  ): Promise<FlussonicSessionEntry[]> {
    const accessToken = await this.serversService.ensureAccessToken(server);
    const all: FlussonicSessionEntry[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < MAX_FETCH_PAGES; page++) {
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

function mapEntry(entry: FlussonicSessionEntry): LiveStreamSession {
  return {
    session_uuid: entry.id,
    stream_name: entry.name,
    type: entry.type ?? null,
    ip: entry.ip ?? null,
    proto: entry.proto ?? null,
    started_at: toUnixSeconds(entry.started_at),
    updated_at: toUnixSeconds(entry.updated_at),
    country: entry.country ?? null,
    ip_lookup_url: entry.ip ? `https://ip.me/ip/${entry.ip}` : null,
  };
}

/** Flussonic session timestamps come back in milliseconds; this app uses unix seconds. */
function toUnixSeconds(ms: number | undefined): number | null {
  return ms !== undefined ? Math.floor(ms / 1000) : null;
}
