'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/cn';
import { SunIcon, MoonIcon } from '@/components/icons';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-current/80 transition-colors hover:bg-white/10',
        className,
      )}
    >
      {/* Render nothing theme-specific until mounted to avoid hydration mismatch */}
      {mounted && (
        <>
          <SunIcon
            className={cn(
              'absolute h-[18px] w-[18px] transition-all duration-300',
              isDark ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
            )}
          />
          <MoonIcon
            className={cn(
              'absolute h-[18px] w-[18px] transition-all duration-300',
              isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0',
            )}
          />
        </>
      )}
    </button>
  );
}
