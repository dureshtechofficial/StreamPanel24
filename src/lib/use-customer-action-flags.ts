'use client';

import { useEffect, useState } from 'react';
import { listCustomerActionSettings } from './customer-action-settings-api';
import { getMyCustomerActionFlags } from './reseller-customer-actions-api';
import type { CustomerAction } from '@/types/customer-action-setting';

export interface CustomerActionFlags {
  edit: boolean;
  delete: boolean;
  assign: boolean;
}

const ALL_ENABLED: CustomerActionFlags = { edit: true, delete: true, assign: true };

/**
 * Defaults every action to enabled while loading or if the fetch fails, so a
 * slow/broken settings call never blocks the edit/delete/assign buttons —
 * the backend still enforces the real check regardless of what the frontend shows.
 */
export function useAdminCustomerActionFlags(): CustomerActionFlags {
  const [flags, setFlags] = useState<CustomerActionFlags>(ALL_ENABLED);
  useEffect(() => {
    let cancelled = false;
    listCustomerActionSettings()
      .then((settings) => {
        if (cancelled) return;
        const next = { ...ALL_ENABLED };
        for (const setting of settings) {
          if (setting.actor_type === 'admin') {
            next[setting.action as CustomerAction] = setting.enabled;
          }
        }
        setFlags(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return flags;
}

export function useResellerCustomerActionFlags(): CustomerActionFlags {
  const [flags, setFlags] = useState<CustomerActionFlags>(ALL_ENABLED);
  useEffect(() => {
    let cancelled = false;
    getMyCustomerActionFlags()
      .then((result) => {
        if (!cancelled) setFlags(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return flags;
}
