'use client';

import { useEffect, useState } from 'react';
import { getMyWalletTopupSettings as getResellerWalletTopupSettings } from './reseller-wallet-api';
import { getMyWalletTopupSettings as getCustomerWalletTopupSettings } from './customer-wallet-portal-api';
import type { WalletTopupSettings } from '@/types/razorpay';

const DEFAULT_SETTINGS: WalletTopupSettings = { enabled: false, minimum_amount: 100 };

/**
 * Both hooks default to disabled while loading or if the fetch fails, so a
 * slow/broken settings call never shows an "Add money" button the backend
 * would then reject — the opposite default from the order-cancel-enabled
 * hooks, since this gates showing a brand-new capability rather than hiding
 * an existing one.
 */

export function useResellerWalletTopupSettings(): WalletTopupSettings {
  const [settings, setSettings] = useState<WalletTopupSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    let cancelled = false;
    getResellerWalletTopupSettings()
      .then((result) => {
        if (!cancelled) setSettings(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return settings;
}

export function useCustomerWalletTopupSettings(): WalletTopupSettings {
  const [settings, setSettings] = useState<WalletTopupSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    let cancelled = false;
    getCustomerWalletTopupSettings()
      .then((result) => {
        if (!cancelled) setSettings(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return settings;
}
