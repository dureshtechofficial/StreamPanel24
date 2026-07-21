import type { ApiErrorBody } from '@/types/auth';
import { ApiError } from './api-error';
import { getResellerAccessToken, getResellerRefreshHandler } from './reseller-token-store';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip the automatic refresh-and-retry on 401 (used by the auth endpoints themselves). */
  skipAuthRetry?: boolean;
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody> {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return { statusCode: res.status, message: res.statusText, error: 'Error' };
  }
}

async function rawRequest(path: string, options: ApiFetchOptions) {
  const { body, headers, skipAuthRetry, ...rest } = options;
  void skipAuthRetry;
  const accessToken = getResellerAccessToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return res;
}

export async function resellerApiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  let res = await rawRequest(path, options);

  if (res.status === 401 && !options.skipAuthRetry) {
    const refresh = getResellerRefreshHandler();
    const newToken = refresh ? await refresh() : null;
    if (newToken) {
      res = await rawRequest(path, options);
    }
  }

  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new ApiError(body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
