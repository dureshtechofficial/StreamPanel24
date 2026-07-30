import { Injectable } from '@nestjs/common';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicServerStatsService } from './flussonic-server-stats.service';
import { FlussonicStreamsService } from './flussonic-streams.service';
import type { SyncStreamsSummary } from './flussonic-streams.service';
import { SyncScheduleGateService } from './sync-schedule-gate.service';
import { SyncType } from '../settings/enums/sync-type.enum';

const MANUAL_SYNC_DISABLED_ERROR =
  'Manual sync is currently disabled by an administrator';

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
}

export interface SyncAllServersSummary {
  total: number;
  results: SyncAllServersResult[];
}

/**
 * Backs the servers page's single "Sync all" button: for every non-deleted
 * server, runs the real-Flussonic sync calls (stats, streams). Sessions are no
 * longer synced/stored — they're read live from Flussonic when viewed. Each
 * sync type is independent — one failing (for one server, or one sync type)
 * never blocks the others.
 */
@Injectable()
export class FlussonicSyncAllService {
  constructor(
    private readonly serversService: FlussonicServersService,
    private readonly statsService: FlussonicServerStatsService,
    private readonly streamsService: FlussonicStreamsService,
    private readonly syncGate: SyncScheduleGateService,
  ) {}

  async syncAll(): Promise<SyncAllServersSummary> {
    const servers = await this.serversService.findAllActive();
    // Checked once up front, not per server — a disabled type is skipped
    // for every server rather than failing server-by-server.
    const [statsEnabled, streamsEnabled] = await Promise.all([
      this.syncGate.isManualSyncEnabled(SyncType.SERVER_STATS),
      this.syncGate.isManualSyncEnabled(SyncType.STREAMS),
    ]);

    const results: SyncAllServersResult[] = [];
    for (const server of servers) {
      const stats = statsEnabled
        ? await this.tryRun(() => this.statsService.sync(server.id))
        : this.disabledOutcome();
      const streams = streamsEnabled
        ? await this.tryRun(() =>
            this.streamsService.syncFromFlussonic(server.id),
          )
        : this.disabledOutcome<SyncStreamsSummary>();

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
      });
    }

    return { total: results.length, results };
  }

  private disabledOutcome<T>(): { ok: boolean; error?: string; value?: T } {
    return { ok: false, error: MANUAL_SYNC_DISABLED_ERROR };
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
