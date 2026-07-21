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
import type { Customer } from '@/types/customer';
import { customerApiFetch } from './customer-api-client';
import { ApiError } from './api-error';
import {
  setCustomerAccessToken as storeAccessToken,
  setCustomerRefreshHandler,
} from './customer-token-store';

interface CustomerAuthResponse {
  customer: Customer;
  accessToken: string;
}

interface CustomerAuthContextValue {
  customer: Customer | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((session: CustomerAuthResponse | null) => {
    setCustomer(session?.customer ?? null);
    setAccessTokenState(session?.accessToken ?? null);
    storeAccessToken(session?.accessToken ?? null);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }

    const promise = (async () => {
      try {
        const session = await customerApiFetch<CustomerAuthResponse>(
          '/customer-auth/refresh',
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
    setCustomerRefreshHandler(refresh);
    refresh().finally(() => setIsLoading(false));
    return () => setCustomerRefreshHandler(null);
  }, [refresh]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const session = await customerApiFetch<CustomerAuthResponse>('/customer-auth/login', {
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
      await customerApiFetch('/customer-auth/logout', {
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

  const value = useMemo<CustomerAuthContextValue>(
    () => ({ customer, accessToken, isLoading, login, logout }),
    [customer, accessToken, isLoading, login, logout],
  );

  return (
    <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return ctx;
}
