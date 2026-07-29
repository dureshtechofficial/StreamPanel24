'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api-error';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
    <Dialog open={open} onOpenChange={(next) => { if (!next && !isBusy) handleCancel(); }}>
      <DialogContent className="max-w-sm">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Adjust wallet balance</DialogTitle>
          <DialogDescription>
            Add or deduct funds from{' '}
            <span className="font-medium text-foreground">{entityName}</span>&rsquo;s wallet balance.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
        <div className="flex rounded-lg border border-input p-0.5 text-sm font-medium">
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

        <div>
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

        <div>
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

        {error && <p className="text-sm text-danger">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="secondary" size="sm" onClick={handleCancel} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            variant={mode === 'deduct' ? 'danger' : 'primary'}
            loading={isBusy}
          >
            {isBusy
              ? mode === 'deduct'
                ? 'Deducting…'
                : 'Adding…'
              : mode === 'deduct'
                ? 'Deduct funds'
                : 'Add funds'}
          </Button>
        </DialogFooter>
      </form>
      </DialogContent>
    </Dialog>
  );
}
