'use client';

import { useTheme } from 'next-themes';
import { Toaster as SonnerToaster } from 'sonner';

/**
 * App-wide toast host. Themed with our CSS tokens so it matches light/dark
 * automatically. Mounted once in the root layout.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      theme={(resolvedTheme as 'light' | 'dark') ?? 'system'}
      toastOptions={{
        style: {
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)',
        },
        classNames: {
          toast:
            'group border border-border bg-card text-card-foreground shadow-pop',
          title: 'text-sm font-semibold',
          description: 'text-sm text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
    />
  );
}
