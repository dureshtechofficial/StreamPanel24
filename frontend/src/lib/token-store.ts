// In-memory access token storage. Deliberately not persisted to
// localStorage/sessionStorage — it lives only for the life of the tab and is
// restored on load via the httpOnly refresh cookie (see auth-context.tsx).
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// Registered by AuthProvider so the low-level api client can transparently
// refresh an expired access token without importing React context.
type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;

export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

export function getRefreshHandler(): RefreshHandler | null {
  return refreshHandler;
}
