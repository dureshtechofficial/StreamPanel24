'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api-error';

export function WalletTopupDialog({
  open,
  resellerName,
  isBusy,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  resellerName: string;
  isBusy?: boolean;
  onSubmit: (amount: number, remark: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleCancel() {
    setAmount('');
    setRemark('');
    setError(null);
    onCancel();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setError(null);
    try {
      await onSubmit(parsed, remark.trim());
      setAmount('');
      setRemark('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to top up wallet.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        onClick={handleCancel}
        className="animate-fade-in absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        className="animate-fade-in-up relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-gray-900">Top up wallet</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add funds to <span className="font-medium text-gray-700">{resellerName}</span>&rsquo;s
          wallet balance.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Remark <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            maxLength={255}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="e.g. Bank transfer topup"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isBusy}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-full bg-flu-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? 'Adding…' : 'Add funds'}
          </button>
        </div>
      </form>
    </div>
  );
}
