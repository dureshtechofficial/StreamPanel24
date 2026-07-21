'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Reseller } from '@/types/reseller';
import { resellerApiFetch } from './reseller-api-client';
import { ApiError } from './api-error';
import {
  setResellerAccessToken as storeAccessToken,
  setResellerRefreshHandler,
} from './reseller-token-store';

interface ResellerAuthResponse {
  reseller: Reseller;
  accessToken: string;
}

interface ResellerAuthContextValue {
  reseller: Reseller | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const ResellerAuthContext = createContext<ResellerAuthContextValue | null>(null);

export function ResellerAuthProvider({ children }: { children: React.ReactNode }) {
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((session: ResellerAuthResponse | null) => {
    setReseller(session?.reseller ?? null);
    setAccessTokenState(session?.accessToken ?? null);
    storeAccessToken(session?.accessToken ?? null);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }

    const promise = (async () => {
      try {
        const session = await resellerApiFetch<ResellerAuthResponse>(
          '/reseller-auth/refresh',
          { method: 'POST', skipAuthRetry: true },
        );
        applySession(session);
        return session.accessToken;
      } catch {
        applySession(null);
        return null;
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = promise;
    return promise;
  }, [applySession]);

  useEffect(() => {
    setResellerRefreshHandler(refresh);
    refresh().finally(() => setIsLoading(false));
    return () => setResellerRefreshHandler(null);
  }, [refresh]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const session = await resellerApiFetch<ResellerAuthResponse>('/reseller-auth/login', {
        method: 'POST',
        body: { identifier, password },
        skipAuthRetry: true,
      });
      applySession(session);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await resellerApiFetch('/reseller-auth/logout', {
        method: 'POST',
        skipAuthRetry: true,
      });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        throw err;
      }
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const value = useMemo<ResellerAuthContextValue>(
    () => ({ reseller, accessToken, isLoading, login, logout }),
    [reseller, accessToken, isLoading, login, logout],
  );

  return (
    <ResellerAuthContext.Provider value={value}>{children}</ResellerAuthContext.Provider>
  );
}

export function useResellerAuth(): ResellerAuthContextValue {
  const ctx = useContext(ResellerAuthContext);
  if (!ctx) {
    throw new Error('useResellerAuth must be used within a ResellerAuthProvider');
  }
  return ctx;
}
