'use client';

import { useEffect } from 'react';
import { APP_NAME } from './app-config';

/**
 * Sets the browser tab title to "{APP_NAME} | {pageName}". All our pages are
 * Client Components, so this runs client-side instead of using Next's
 * Metadata API (which requires a Server Component).
 *
 * Next re-renders the root layout's static `<title>` element whenever an
 * ancestor re-renders (e.g. AuthProvider's initial silent-refresh flipping
 * `isLoading`), which can stomp a title set on mount before that settles —
 * a MutationObserver re-applies ours whenever that happens.
 */
export function usePageTitle(pageName: string): void {
  useEffect(() => {
    const desired = `${APP_NAME} | ${pageName}`;
    document.title = desired;

    const titleEl = document.querySelector('title');
    if (!titleEl) return;

    const observer = new MutationObserver(() => {
      if (document.title !== desired) {
        document.title = desired;
      }
    });
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });

    return () => observer.disconnect();
  }, [pageName]);
}
