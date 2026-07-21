const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Best-effort IP geolocation/ISP lookup against ipwho.is (or a compatible
 * mirror configured via `ipWhoIsApiUrl`). Returns null on any failure —
 * this enrichment is never allowed to block a sync.
 */
export async function fetchIpWhoIs(
  ip: string,
  baseUrl: string,
): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(
        `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(ip)}`,
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
