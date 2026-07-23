// Mirrors token-store.ts but kept fully separate from the admin/user token —
// a customer session and an admin session are different principal types and
// must never share (or overwrite) each other's in-memory access token.
let accessToken: string | null = null;

export function getCustomerAccessToken(): string | null {
  return accessToken;
}

export function setCustomerAccessToken(token: string | null): void {
  accessToken = token;
}

type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;

export function setCustomerRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

export function getCustomerRefreshHandler(): RefreshHandler | null {
  return refreshHandler;
}
