'use client';

import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/lib/customer-auth-context';
import { LogOutIcon } from './icons';

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const { customer, logout } = useCustomerAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/customer/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex h-16 items-center justify-between bg-flu-navy px-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-flu-pink" />
          <span className="text-lg font-semibold tracking-tight text-white">project7</span>
        </div>
        <div className="flex items-center gap-4">
          {customer && <span className="text-sm text-gray-300">{customer.name}</span>}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
          >
            <LogOutIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
