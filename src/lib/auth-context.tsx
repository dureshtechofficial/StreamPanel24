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
import type { User } from '@/types/auth';
import { apiFetch } from './api-client';
import { ApiError } from './api-error';
import { setAccessToken as storeAccessToken, setRefreshHandler } from './token-store';

interface AuthResponse {
  user: User;
  accessToken: string;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((session: AuthResponse | null) => {
    setUser(session?.user ?? null);
    setAccessTokenState(session?.accessToken ?? null);
    storeAccessToken(session?.accessToken ?? null);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }

    const promise = (async () => {
      try {
        const session = await apiFetch<AuthResponse>('/auth/refresh', {
          method: 'POST',
          skipAuthRetry: true,
        });
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
    setRefreshHandler(refresh);
    refresh().finally(() => setIsLoading(false));
    return () => setRefreshHandler(null);
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuthRetry: true,
      });
      applySession(session);
    },
    [applySession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await apiFetch<{ user: User }>('/auth/register', {
        method: 'POST',
        body: { name, email, password },
        skipAuthRetry: true,
      });
      return result.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', skipAuthRetry: true });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        throw err;
      }
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, isLoading, login, register, logout }),
    [user, accessToken, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
