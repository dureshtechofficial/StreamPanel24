'use client';

import type { Order, OrderReportEntry } from '@/types/order';
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

/** The dialog only needs the invoicing-snapshot fields already on `Order` (customer/plan/stream) — server/reseller names are a bonus when the caller has them (the reports page's enriched `OrderReportEntry`), optional everywhere else (the plain order lists in OrdersPanel/customer dashboard). */
export type InvoiceOrder = Order & Partial<Pick<OrderReportEntry, 'server_name' | 'reseller_name'>>;

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function OrderInvoiceDialog({
  order,
  onClose,
}: {
  order: InvoiceOrder | null;
  onClose: () => void;
}) {
  if (!order) return null;

  const billingLines = [
    order.customer_company_name,
    order.customer_address,
    [order.customer_city, order.customer_state, order.customer_pincode].filter(Boolean).join(', ') ||
      null,
  ].filter(Boolean) as string[];

  return (
    <Dialog open={order !== null} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invoice — {order.order_number}</DialogTitle>
          <DialogDescription>Billed {formatDate(order.created_at)}</DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[70vh] space-y-5 overflow-y-auto">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Bill to</p>
            <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
            {billingLines.map((line) => (
              <p key={line} className="text-sm text-muted-foreground">{line}</p>
            ))}
            <p className="mt-1 text-xs text-muted-foreground">{order.customer_phone}</p>
            {order.customer_email && <p className="text-xs text-muted-foreground">{order.customer_email}</p>}
            {order.reseller_name && (
              <p className="mt-1 text-xs text-muted-foreground/70">Sold via {order.reseller_name}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Plan</p>
            <p className="text-sm font-medium text-foreground">{order.plan_name}</p>
            {order.plan_description && (
              <p className="text-sm text-muted-foreground">{order.plan_description}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Stream</p>
            <p className="text-sm font-medium text-foreground">
              {order.stream_name}
              {order.server_name ? ` (${order.server_name})` : ''}
            </p>
            {order.stream_title && <p className="text-sm text-muted-foreground">{order.stream_title}</p>}
            {order.stream_ingest_domain && (
              <p className="mt-1 text-xs text-muted-foreground">
                Ingest domain: {order.stream_ingest_domain}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Amount</span>
              <span className="text-base font-semibold text-foreground">
                {order.currency} {order.price}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{order.duration_days} days</span>
              <span>
                {formatDate(order.effective_from)} – {formatDate(order.effective_to)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="capitalize">{order.payment_method.replace('_', ' ')}</span>
              <span className="capitalize">{order.payment_status}</span>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
