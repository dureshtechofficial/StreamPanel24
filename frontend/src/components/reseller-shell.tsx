'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResellerAuth } from '@/lib/reseller-auth-context';
import { listMyWalletTransactions } from '@/lib/reseller-wallet-api';
import { getInitials } from '@/lib/get-initials';
import { APP_NAME } from '@/lib/app-config';
import { BroadcastIcon, ChevronDownIcon, LogOutIcon, WalletIcon } from './icons';
import { WalletTransactionsPanel } from './wallet-transactions-panel';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-flu-navy px-4 sm:px-6">
        <Link href="/reseller/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg flu-brand-gradient text-white">
            <BroadcastIcon className="h-[18px] w-[18px]" />
          </span>
          <span className="text-base font-semibold tracking-tight text-white">{APP_NAME}</span>
          <Badge variant="brand" className="hidden bg-white/10 text-white sm:inline-flex">
            Reseller
          </Badge>
        </Link>

        <div className="flex items-center gap-2">
          {reseller && (
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
              title="View wallet transaction history"
            >
              <WalletIcon className="h-4 w-4" />
              <span className="tabular-nums">{Number(reseller.wallet_balance).toFixed(2)}</span>
            </button>
          )}

          <ThemeToggle className="text-white hover:bg-white/10" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full flu-brand-gradient text-xs font-semibold text-white">
                {getInitials(reseller?.name)}
              </span>
              <span className="hidden font-medium text-white sm:block">{reseller?.name}</span>
              <ChevronDownIcon className="hidden h-4 w-4 text-white/60 sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-semibold text-foreground">{reseller?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{reseller?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={handleLogout}>
                <LogOutIcon className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
