'use client';

import { useEffect, useState } from 'react';
import { listSyncSchedules } from './sync-schedules-api';
import type { SyncType } from '@/types/sync-schedule';

/**
 * Best-effort lookup of each sync type's `manual_sync_enabled` flag, for
 * gating the "Sync"/"Sync all" buttons on the servers/streams/sessions
 * pages. Defaults every type to enabled while loading or if the fetch
 * fails, so a slow/broken settings call never blocks the button — the
 * backend still enforces the real check regardless of what the frontend
 * shows.
 */
export function useSyncManualFlags(): Record<SyncType, boolean> {
  const [flags, setFlags] = useState<Record<SyncType, boolean>>({
    server_stats: true,
    streams: true,
    order_expiry: true,
  });

  useEffect(() => {
    let cancelled = false;
    listSyncSchedules()
      .then((schedules) => {
        if (cancelled) return;
        setFlags((prev) => {
          const next = { ...prev };
          for (const schedule of schedules) {
            next[schedule.sync_type] = schedule.manual_sync_enabled;
          }
          return next;
        });
      })
      .catch(() => {
        // best-effort; buttons stay enabled and the backend still enforces the real check
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return flags;
}
