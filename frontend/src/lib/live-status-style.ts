/** Badge color for a stream's live `stats.status` (e.g. running/waiting/error) from the last sync. */
export function liveStatusStyle(status: string | null | undefined): string {
  if (status === 'running') return 'bg-green-50 text-green-700';
  if (status === 'error') return 'bg-red-50 text-red-700';
  if (status === 'waiting') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}
