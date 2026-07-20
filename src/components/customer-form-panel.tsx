'use client';

import { useState, type FormEvent } from 'react';
import type { Customer, CustomerInput, CustomerStatus } from '@/types/customer';
import { ApiError } from '@/lib/api-error';
import { groupFieldErrors } from '@/lib/form-errors';
import { XIcon } from './icons';

const FIELDS = ['name', 'phone', 'username', 'password', 'email', 'company_name', 'address', 'city', 'state', 'pincode'];

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-700';

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
  };
}

export function CustomerFormPanel({
  open,
  customer,
  onClose,
  onSubmit,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSubmit: (payload: CustomerInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(customer));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {customer ? 'Edit customer' : 'Add customer'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close panel"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 px-6 py-5">
            {errors.general && errors.general.length > 0 && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
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
                <p key={msg} className="mt-1 text-xs text-red-600">
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
                  <p key={msg} className="mt-1 text-xs text-red-600">
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
                  <p key={msg} className="mt-1 text-xs text-red-600">
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
                  <p key={msg} className="mt-1 text-xs text-red-600">
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
                  <p key={msg} className="mt-1 text-xs text-red-600">
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
                <p key={msg} className="mt-1 text-xs text-red-600">
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
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-flu-pink px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
