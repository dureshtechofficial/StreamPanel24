'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResellerAuth } from '@/lib/reseller-auth-context';
import { listMyWalletTransactions } from '@/lib/reseller-wallet-api';
import { LogOutIcon, WalletIcon } from './icons';
import { WalletTransactionsPanel } from './wallet-transactions-panel';

export function ResellerShell({ children }: { children: React.ReactNode }) {
  const { reseller, logout } = useResellerAuth();
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);

  const loadWalletHistory = useCallback(
    (page: number, limit: number) => listMyWalletTransactions({ page, limit }),
    [],
  );

  async function handleLogout() {
    await logout();
    router.replace('/reseller/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex h-16 items-center justify-between bg-flu-navy px-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-flu-pink" />
          <span className="text-lg font-semibold tracking-tight text-white">project7</span>
        </div>
        <div className="flex items-center gap-4">
          {reseller && (
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
              title="View wallet transaction history"
            >
              <WalletIcon className="h-4 w-4" />
              {Number(reseller.wallet_balance).toFixed(2)}
            </button>
          )}
          {reseller && <span className="text-sm text-gray-300">{reseller.name}</span>}
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

      <WalletTransactionsPanel
        open={historyOpen}
        title="Wallet history"
        loadPage={loadWalletHistory}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}
