'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api-error';
import { openRazorpayCheckout } from '@/lib/razorpay-checkout';
import { APP_NAME } from '@/lib/app-config';
import type { RazorpayOrderResponse, VerifyRazorpayPaymentInput } from '@/types/razorpay';

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

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        onClick={handleClose}
        className="animate-fade-in absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
      />
      <form
        onSubmit={handlePay}
        className="animate-fade-in-up relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-gray-900">Add money to wallet</h2>
        <p className="mt-1 text-sm text-gray-500">
          Pay securely via Razorpay — your wallet is credited as soon as the payment succeeds.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            step="0.01"
            min={minimumAmount}
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
          />
          <p className="mt-1 text-xs text-gray-400">Minimum {minimumAmount.toFixed(2)}</p>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="rounded-full bg-flu-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? 'Processing…' : 'Pay now'}
          </button>
        </div>
      </form>
    </div>
  );
}
