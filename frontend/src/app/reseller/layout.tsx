'use client';

import { ResellerAuthProvider } from '@/lib/reseller-auth-context';

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  return <ResellerAuthProvider>{children}</ResellerAuthProvider>;
}
