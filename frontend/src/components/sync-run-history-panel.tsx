'use client';

import { useCallback, useEffect, useState } from 'react';
import { listSyncRuns } from '@/lib/sync-schedules-api';
import type { SyncScheduleRun, SyncType } from '@/types/sync-schedule';
import { ApiError } from '@/lib/api-error';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from './icons';

const PAGE_SIZE = 20;

function formatTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

function summarize(summary: Record<string, unknown>): string {
  if (typeof summary.error === 'string') return summary.error;
  const succeeded = summary.succeeded;
  const total = summary.total;
  const failed = summary.failed;
  if (typeof succeeded === 'number' && typeof total === 'number') {
    return (
      `${succeeded}/${total} server${total === 1 ? '' : 's'} synced` +
      (typeof failed === 'number' && failed > 0 ? `, ${failed} failed` : '')
    );
  }
  return JSON.stringify(summary);
}

export function SyncRunHistoryPanel({
  open,
  type,
  title,
  onClose,
}: {
  open: boolean;
  type: SyncType | null;
  title: string;
  onClose: () => void;
}) {
  const [runs, setRuns] = useState<SyncScheduleRun[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset to page 1 whenever the panel is opened for a (possibly different) sync type,
  // adjusted during render rather than an effect (see "Adjusting state when a prop changes").
  const [prevType, setPrevType] = useState<SyncType | null>(type);
  if (open && type !== prevType) {
    setPrevType(type);
    if (page !== 1) setPage(1);
  }

  const load = useCallback(async (syncType: SyncType, targetPage: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listSyncRuns(syncType, { page: targetPage, limit: PAGE_SIZE });
      setRuns(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load run history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !type) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(type, page);
  }, [open, type, page, load]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title} history</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close panel"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Loading history…
            </p>
          )}

          {!isLoading && loadError && <p className="text-sm text-red-600">{loadError}</p>}

          {!isLoading && !loadError && runs.length === 0 && (
            <p className="text-sm text-gray-400">No runs yet.</p>
          )}

          {!isLoading && !loadError && runs.length > 0 && (
            <ul className="space-y-3">
              {runs.map((run) => (
                <li key={run.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatTime(run.ran_at)}
                    </span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        run.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {run.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{summarize(run.summary)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isLoading && !loadError && runs.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Prev
            </button>
            <span className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
