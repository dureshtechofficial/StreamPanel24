'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useResellerAuth } from '@/lib/reseller-auth-context';

export function ResellerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { reseller, isLoading } = useResellerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !reseller) {
      router.replace('/reseller/login');
    }
  }, [isLoading, reseller, router]);

  if (isLoading || !reseller) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
