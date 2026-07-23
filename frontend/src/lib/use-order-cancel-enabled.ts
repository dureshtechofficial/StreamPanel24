'use client';

import { useEffect, useState } from 'react';
import { listOrderCancelSettings } from './order-cancel-settings-api';
import { isResellerOrderCancelEnabled } from './reseller-orders-api';
import { isCustomerOrderCancelEnabled } from './customer-orders-api';

/**
 * Each hook defaults to enabled while loading or if the fetch fails, so a
 * slow/broken settings call never blocks the cancel button — the backend
 * still enforces the real check regardless of what the frontend shows.
 */

export function useAdminOrderCancelEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    let cancelled = false;
    listOrderCancelSettings()
      .then((settings) => {
        if (cancelled) return;
        const setting = settings.find((s) => s.actor_type === 'admin');
        if (setting) setEnabled(setting.enabled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}

export function useResellerOrderCancelEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    let cancelled = false;
    isResellerOrderCancelEnabled()
      .then((result) => {
        if (!cancelled) setEnabled(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}

export function useCustomerOrderCancelEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    let cancelled = false;
    isCustomerOrderCancelEnabled()
      .then((result) => {
        if (!cancelled) setEnabled(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}
