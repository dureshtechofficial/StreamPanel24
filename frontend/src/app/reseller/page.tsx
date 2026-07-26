'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useResellerAuth } from '@/lib/reseller-auth-context';

export default function ResellerIndexPage() {
  const { reseller, isLoading } = useResellerAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(reseller ? '/reseller/dashboard' : '/reseller/login');
  }, [isLoading, reseller, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
