'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Customer, CustomerInput, CustomerStatus } from '@/types/customer';
import type { Reseller } from '@/types/reseller';
import { listResellers } from '@/lib/resellers-api';
import { ApiError } from '@/lib/api-error';
import { groupFieldErrors } from '@/lib/form-errors';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const FIELDS = ['name', 'phone', 'username', 'password', 'email', 'company_name', 'address', 'city', 'state', 'pincode'];

const inputClass =
  'w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20';
const labelClass = 'mb-1 block text-xs font-medium text-foreground';

type FormState = {
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  company_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: CustomerStatus;
  /** Empty string = no reseller. */
  reseller_id: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  username: '',
  password: '',
  company_name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  status: 'active',
  reseller_id: '',
};

function toFormState(customer: Customer | null): FormState {
  if (!customer) return EMPTY_FORM;
  return {
    name: customer.name,
    email: customer.email ?? '',
    phone: customer.phone,
    username: customer.username ?? '',
    password: '',
    company_name: customer.company_name ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    state: customer.state ?? '',
    pincode: customer.pincode ?? '',
    status: customer.status,
    reseller_id: customer.reseller_id ?? '',
  };
}

function toPayload(form: FormState): CustomerInput {
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    username: form.username.trim(),
    password: form.password ? form.password : undefined,
    email: form.email.trim() || undefined,
    company_name: form.company_name.trim() || undefined,
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    pincode: form.pincode.trim() || undefined,
    status: form.status,
    reseller_id: form.reseller_id || null,
  };
}

export function CustomerFormPanel({
  open,
  customer,
  onClose,
  onSubmit,
  showResellerField = false,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSubmit: (payload: CustomerInput) => Promise<void>;
  /** Admin-only: shows an optional reseller-mapping select. Off by default (e.g. the reseller portal forces its own id server-side and has no reason to see this). */
  showResellerField?: boolean;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(customer));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resellers, setResellers] = useState<Reseller[]>([]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!open || !showResellerField) return;
    listResellers({ status: 'active', limit: 100 })
      .then((result) => setResellers(result.items))
      .catch(() => {
        // best-effort; the field still works, just starts with an empty list
      });
  }, [open, showResellerField]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const clientErrors: Record<string, string[]> = { name: [], phone: [], username: [], password: [] };
    if (form.name.trim().length < 2) clientErrors.name.push('Name must be at least 2 characters long');
    if (form.phone.trim().length < 6) clientErrors.phone.push('Enter a valid phone number');
    if (form.username.trim().length < 3) clientErrors.username.push('Username must be at least 3 characters long');
    if (!customer && form.password.length < 8) clientErrors.password.push('Password must be at least 8 characters long');
    if (Object.values(clientErrors).some((v) => v.length > 0)) {
      setErrors(clientErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(toPayload(form));
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(groupFieldErrors(err.messages, FIELDS));
      } else {
        setErrors({ general: ['Something went wrong. Please try again.'] });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent size="md">
        <SheetHeader>
          <SheetTitle>{customer ? 'Edit customer' : 'Add customer'}</SheetTitle>
          <SheetDescription>
            {customer ? 'Update this customer record.' : 'Create a new customer record.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <SheetBody>
            {errors.general && errors.general.length > 0 && (
              <div className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                {errors.general.map((msg) => (
                  <p key={msg}>{msg}</p>
                ))}
              </div>
            )}

            <div>
              <label className={labelClass}>Name *</label>
              <input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={inputClass}
              />
              {errors.name?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-danger">
                  {msg}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Phone *</label>
                <input
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  className={inputClass}
                />
                {errors.phone?.map((msg) => (
                  <p key={msg} className="mt-1 text-xs text-danger">
                    {msg}
                  </p>
                ))}
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={inputClass}
                />
                {errors.email?.map((msg) => (
                  <p key={msg} className="mt-1 text-xs text-danger">
                    {msg}
                  </p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Username *</label>
                <input
                  value={form.username}
                  onChange={(e) => setField('username', e.target.value)}
                  className={inputClass}
                  autoComplete="off"
                />
                {errors.username?.map((msg) => (
                  <p key={msg} className="mt-1 text-xs text-danger">
                    {msg}
                  </p>
                ))}
              </div>
              <div>
                <label className={labelClass}>
                  Password {customer ? '' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                  placeholder={customer ? 'Leave blank to keep unchanged' : undefined}
                />
                {errors.password?.map((msg) => (
                  <p key={msg} className="mt-1 text-xs text-danger">
                    {msg}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Company name</label>
              <input
                value={form.company_name}
                onChange={(e) => setField('company_name', e.target.value)}
                className={inputClass}
              />
              {errors.company_name?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-danger">
                  {msg}
                </p>
              ))}
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>City</label>
                <input
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  value={form.state}
                  onChange={(e) => setField('state', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Pincode</label>
                <input
                  value={form.pincode}
                  onChange={(e) => setField('pincode', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value as CustomerStatus)}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {showResellerField && (
              <div>
                <label className={labelClass}>Reseller (optional)</label>
                <select
                  value={form.reseller_id}
                  onChange={(e) => setField('reseller_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">No reseller</option>
                  {resellers.map((reseller) => (
                    <option key={reseller.id} value={reseller.id}>
                      {reseller.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save customer'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
