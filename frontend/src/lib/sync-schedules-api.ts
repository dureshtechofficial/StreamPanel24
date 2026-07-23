import { apiFetch } from './api-client';
import type {
  SyncSchedule,
  SyncScheduleRun,
  SyncType,
  UpdateSyncScheduleInput,
} from '@/types/sync-schedule';
import type { PaginatedResult } from '@/types/pagination';

export function listSyncSchedules() {
  return apiFetch<SyncSchedule[]>('/settings/sync-schedules');
}

export function updateSyncSchedule(type: SyncType, input: UpdateSyncScheduleInput) {
  return apiFetch<SyncSchedule>(`/settings/sync-schedules/${type}`, {
    method: 'PATCH',
    body: input,
  });
}

export function listSyncRuns(type: SyncType, params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiFetch<PaginatedResult<SyncScheduleRun>>(
    `/settings/sync-schedules/${type}/runs${qs ? `?${qs}` : ''}`,
  );
}
