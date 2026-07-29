'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PaginatedResult } from '@/types/pagination';
import { ApiError } from '@/lib/api-error';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';

const PAGE_SIZE = 20;

/** The panel only needs these fields to render — works for both the reseller (`WalletTransaction`) and customer (`CustomerWalletTransaction`) ledgers without caring which. */
interface WalletTransactionLike {
  id: string;
  amount: string;
  balance_after: string;
  remark: string | null;
  created_at: number;
}

function formatTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

function formatAmount(amount: string): string {
  const n = Number(amount);
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}`;
}

export function WalletTransactionsPanel<T extends WalletTransactionLike>({
  open,
  title,
  loadPage,
  onClose,
}: {
  open: boolean;
  title: string;
  loadPage: (page: number, limit: number) => Promise<PaginatedResult<T>>;
  onClose: () => void;
}) {
  const [transactions, setTransactions] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset to page 1 each time the panel is (re-)opened, adjusted during render
  // rather than an effect (see "Adjusting state when a prop changes").
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    if (page !== 1) setPage(1);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const load = useCallback(
    async (targetPage: number) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await loadPage(targetPage, PAGE_SIZE);
        setTransactions(result.items);
        setTotalPages(result.totalPages);
      } catch (err) {
        setLoadError(
          err instanceof ApiError ? err.message : 'Failed to load wallet transactions.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [loadPage],
  );

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(page);
  }, [open, page, load]);

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-0">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground/70">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Loading transactions…
            </p>
          )}

          {!isLoading && loadError && <p className="text-sm text-danger">{loadError}</p>}

          {!isLoading && !loadError && transactions.length === 0 && (
            <p className="text-sm text-muted-foreground/70">No wallet transactions yet.</p>
          )}

          {!isLoading && !loadError && transactions.length > 0 && (
            <ul className="space-y-3">
              {transactions.map((txn) => (
                <li key={txn.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatTime(txn.created_at)}
                    </span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        Number(txn.amount) < 0
                          ? 'bg-danger-soft text-danger'
                          : 'bg-success-soft text-success'
                      }`}
                    >
                      {formatAmount(txn.amount)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Balance after: {formatAmount(txn.balance_after)}
                    {txn.remark ? ` — ${txn.remark}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SheetBody>

        {!isLoading && !loadError && transactions.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Prev
            </button>
            <span className="text-xs text-muted-foreground/70">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
