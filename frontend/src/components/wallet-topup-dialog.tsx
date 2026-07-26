'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api-error';

type Mode = 'add' | 'deduct';

export function WalletTopupDialog({
  open,
  entityName,
  isBusy,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  /** Display name of whoever's wallet this is — a reseller or a customer. */
  entityName: string;
  isBusy?: boolean;
  onSubmit: (amount: number, remark: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>('add');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setMode('add');
    setAmount('');
    setRemark('');
    setError(null);
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const magnitude = Number(amount);
    if (!amount || Number.isNaN(magnitude) || magnitude <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setError(null);
    const signedAmount = mode === 'deduct' ? -magnitude : magnitude;
    try {
      await onSubmit(signedAmount, remark.trim());
      setAmount('');
      setRemark('');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Failed to ${mode === 'deduct' ? 'deduct from' : 'top up'} wallet.`,
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        onClick={handleCancel}
        className="animate-fade-in absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        className="animate-fade-in-up relative w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-foreground">Adjust wallet balance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add or deduct funds from{' '}
          <span className="font-medium text-foreground">{entityName}</span>&rsquo;s wallet
          balance.
        </p>

        <div className="mt-4 flex rounded-lg border border-input p-0.5 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode('add')}
            className={`flex-1 rounded-md py-1.5 transition ${
              mode === 'add' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Add funds
          </button>
          <button
            type="button"
            onClick={() => setMode('deduct')}
            className={`flex-1 rounded-md py-1.5 transition ${
              mode === 'deduct' ? 'bg-danger text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Deduct funds
          </button>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-foreground">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-foreground">
            Remark <span className="text-muted-foreground/70">(optional)</span>
          </label>
          <input
            type="text"
            maxLength={255}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={mode === 'deduct' ? 'e.g. Correction' : 'e.g. Bank transfer topup'}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isBusy}
            className="rounded-full border border-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
              mode === 'deduct'
                ? 'bg-danger shadow-red-600/30 hover:bg-danger'
                : 'bg-primary shadow-primary/30 hover:bg-primary-hover'
            }`}
          >
            {isBusy
              ? mode === 'deduct'
                ? 'Deducting…'
                : 'Adding…'
              : mode === 'deduct'
                ? 'Deduct funds'
                : 'Add funds'}
          </button>
        </div>
      </form>
    </div>
  );
}
