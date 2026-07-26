'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [isLoading, user, router]);

  return (
    <div className="flu-hero-gradient flex min-h-screen flex-1 flex-col items-center justify-center gap-4">
      <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8.288 14.038a5.25 5.25 0 0 1 7.424 0M5.636 11.386a9 9 0 0 1 12.728 0M3.257 8.735a12.75 12.75 0 0 1 17.486 0" />
        </svg>
      </span>
      <div className="flex items-center gap-2 text-sm text-white/80">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin text-white">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
        </svg>
        Loading…
      </div>
    </div>
  );
}
