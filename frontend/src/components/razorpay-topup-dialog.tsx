'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api-error';
import { openRazorpayCheckout } from '@/lib/razorpay-checkout';
import { APP_NAME } from '@/lib/app-config';
import type { RazorpayOrderResponse, VerifyRazorpayPaymentInput } from '@/types/razorpay';
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

/**
 * Self-service "Add money" dialog — distinct from `WalletTopupDialog`, which
 * is the admin's manual add/deduct form for someone else's wallet. This one
 * is reseller/customer-only: it pays for its own top-up via Razorpay
 * Checkout, then verifies the result against our backend before reporting
 * the new balance.
 */
export function RazorpayTopupDialog({
  open,
  minimumAmount,
  onClose,
  createOrder,
  verifyPayment,
  onSuccess,
}: {
  open: boolean;
  minimumAmount: number;
  onClose: () => void;
  createOrder: (amount: number) => Promise<RazorpayOrderResponse>;
  verifyPayment: (input: VerifyRazorpayPaymentInput) => Promise<{ wallet_balance: string }>;
  onSuccess: (walletBalance: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAmount('');
    setError(null);
  }

  function handleClose() {
    if (isProcessing) return;
    reset();
    onClose();
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value < minimumAmount) {
      setError(`Enter an amount of at least ${minimumAmount.toFixed(2)}.`);
      return;
    }
    setError(null);
    setIsProcessing(true);
    try {
      const order = await createOrder(value);
      await openRazorpayCheckout({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: APP_NAME,
        description: 'Wallet top-up',
        handler: (response) => {
          verifyPayment(response)
            .then((result) => {
              reset();
              setIsProcessing(false);
              onSuccess(result.wallet_balance);
              onClose();
            })
            .catch((err) => {
              setIsProcessing(false);
              setError(
                err instanceof ApiError
                  ? err.message
                  : 'Payment succeeded but could not be verified — contact support with your payment id.',
              );
            });
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      });
    } catch (err) {
      setIsProcessing(false);
      setError(err instanceof ApiError ? err.message : 'Failed to start payment.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent className="max-w-sm">
      <form onSubmit={handlePay}>
        <DialogHeader>
          <DialogTitle>Add money to wallet</DialogTitle>
          <DialogDescription>
            Pay securely via Razorpay — your wallet is credited as soon as the payment succeeds.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Amount</label>
            <input
              type="number"
              step="0.01"
              min={minimumAmount}
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <p className="mt-1 text-xs text-muted-foreground/70">Minimum {minimumAmount.toFixed(2)}</p>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={isProcessing}>
            {isProcessing ? 'Processing…' : 'Pay now'}
          </Button>
        </DialogFooter>
      </form>
      </DialogContent>
    </Dialog>
  );
}
