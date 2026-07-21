import { Injectable } from '@nestjs/common';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicServerStatsService } from './flussonic-server-stats.service';
import { FlussonicStreamsService } from './flussonic-streams.service';
import { FlussonicStreamSessionsService } from './flussonic-stream-sessions.service';

interface SyncOutcome {
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
}

export interface SyncAllServersResult {
  serverId: string;
  name: string;
  stats: SyncOutcome;
  streams: SyncOutcome;
  sessions: SyncOutcome;
}

export interface SyncAllServersSummary {
  total: number;
  results: SyncAllServersResult[];
}

/**
 * Backs the servers page's single "Sync all" button: for every non-deleted
 * server, runs all three real-Flussonic sync calls (stats, streams,
 * sessions) rather than just stats. Each sync type is independent — one
 * failing (for one server, or one sync type) never blocks the others.
 */
@Injectable()
export class FlussonicSyncAllService {
  constructor(
    private readonly serversService: FlussonicServersService,
    private readonly statsService: FlussonicServerStatsService,
    private readonly streamsService: FlussonicStreamsService,
    private readonly sessionsService: FlussonicStreamSessionsService,
  ) {}

  async syncAll(): Promise<SyncAllServersSummary> {
    const servers = await this.serversService.findAllActive();

    const results: SyncAllServersResult[] = [];
    for (const server of servers) {
      const stats = await this.tryRun(() => this.statsService.sync(server.id));
      const streams = await this.tryRun(() =>
        this.streamsService.syncFromFlussonic(server.id),
      );
      const sessions = await this.tryRun(() =>
        this.sessionsService.syncFromFlussonic(server.id),
      );

      results.push({
        serverId: server.id,
        name: server.name,
        stats: { ok: stats.ok, error: stats.error },
        streams: {
          ok: streams.ok,
          error: streams.error,
          created: streams.value?.created,
          updated: streams.value?.updated,
        },
        sessions: {
          ok: sessions.ok,
          error: sessions.error,
          created: sessions.value?.created,
          updated: sessions.value?.updated,
        },
      });
    }

    return { total: results.length, results };
  }

  private async tryRun<T>(
    fn: () => Promise<T>,
  ): Promise<{ ok: boolean; error?: string; value?: T }> {
    try {
      const value = await fn();
      return { ok: true, value };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown error',
      };
    }
  }
}
