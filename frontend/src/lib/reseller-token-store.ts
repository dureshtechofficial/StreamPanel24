// Mirrors token-store.ts / customer-token-store.ts but kept fully separate —
// a reseller session is a third, distinct principal type and must never
// share (or overwrite) the admin/user or customer in-memory access token.
let accessToken: string | null = null;

export function getResellerAccessToken(): string | null {
  return accessToken;
}

export function setResellerAccessToken(token: string | null): void {
  accessToken = token;
}

type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;

export function setResellerRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

export function getResellerRefreshHandler(): RefreshHandler | null {
  return refreshHandler;
}
