import { apiFetch } from './api-client';
import type { SyncSchedule, SyncType, UpdateSyncScheduleInput } from '@/types/sync-schedule';

export function listSyncSchedules() {
  return apiFetch<SyncSchedule[]>('/settings/sync-schedules');
}

export function updateSyncSchedule(type: SyncType, input: UpdateSyncScheduleInput) {
  return apiFetch<SyncSchedule>(`/settings/sync-schedules/${type}`, {
    method: 'PATCH',
    body: input,
  });
}
