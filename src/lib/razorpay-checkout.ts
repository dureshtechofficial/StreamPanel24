const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

let loadPromise: Promise<void> | null = null;

/** Loads Razorpay's Checkout.js exactly once per page, however many times this is called. */
function loadCheckoutScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve();
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loadPromise = null;
        reject(new Error('Failed to load Razorpay checkout script.'));
      };
      document.body.appendChild(script);
    });
  }
  return loadPromise;
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  await loadCheckoutScript();
  if (!window.Razorpay) {
    throw new Error('Razorpay checkout script did not load correctly.');
  }
  const checkout = new window.Razorpay(options);
  checkout.open();
}
