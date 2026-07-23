'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResellerAuth } from '@/lib/reseller-auth-context';
import { listMyWalletTransactions } from '@/lib/reseller-wallet-api';
import { getInitials } from '@/lib/get-initials';
import { APP_NAME } from '@/lib/app-config';
import { ChevronDownIcon, LogOutIcon, WalletIcon } from './icons';
import { WalletTransactionsPanel } from './wallet-transactions-panel';

export function ResellerShell({ children }: { children: React.ReactNode }) {
  const { reseller, logout } = useResellerAuth();
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const loadWalletHistory = useCallback(
    (page: number, limit: number) => listMyWalletTransactions({ page, limit }),
    [],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setUserMenuOpen(false);
    await logout();
    router.replace('/reseller/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex h-16 items-center justify-between bg-flu-navy px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-flu-pink" />
          <span className="text-lg font-semibold tracking-tight text-white">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
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

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm transition-colors hover:bg-white/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flu-pink text-xs font-semibold text-white">
                {getInitials(reseller?.name)}
              </span>
              <span className="hidden font-medium text-white sm:block">{reseller?.name}</span>
              <ChevronDownIcon
                className={`h-4 w-4 text-white/50 transition-transform duration-200 ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {userMenuOpen && (
              <div className="animate-fade-in-down absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="truncate text-sm font-medium text-gray-900">{reseller?.name}</p>
                  <p className="truncate text-xs text-gray-500">{reseller?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

      <WalletTransactionsPanel
        open={historyOpen}
        title="Wallet history"
        loadPage={loadWalletHistory}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}
