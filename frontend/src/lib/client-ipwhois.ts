import type { IpWhoIsInfo } from '@/types/flussonic-stream-session';

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Best-effort IP geolocation, looked up directly from the browser — never
 * from our own backend. ipwho.is rate-limits per caller IP; a server doing
 * this for every session on every sync exhausts that limit almost
 * immediately, while spreading the same lookups across many visitors'
 * browsers rarely does. Cached in memory per browser tab so the same IP
 * (very common across a page of sessions) is never looked up twice.
 */
const cache = new Map<string, Promise<IpWhoIsInfo | null>>();

export function lookupIp(ip: string): Promise<IpWhoIsInfo | null> {
  const cached = cache.get(ip);
  if (cached) return cached;

  const promise = fetchIpWhoIs(ip);
  cache.set(ip, promise);
  return promise;
}

async function fetchIpWhoIs(ip: string): Promise<IpWhoIsInfo | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return null;
    const data = (await res.json()) as IpWhoIsInfo;
    if (data.success === false) return null;
    return data;
  } catch {
    return null;
  }
}
