'use client';

import { useState, type FormEvent } from 'react';
import type { Plan, PlanInput, PlanStatus } from '@/types/plan';
import { ApiError } from '@/lib/api-error';
import { groupFieldErrors } from '@/lib/form-errors';
import { XIcon } from './icons';

const FIELDS = ['name', 'description', 'mrp', 'customer_price', 'reseller_percentage', 'duration_days', 'max_streams', 'max_connections'];

const PROTOCOL_KEYS = [
  'hls',
  'player',
  'rtmp',
  'srt',
  'webrtc',
  'dash',
  'cmaf',
  'mss',
  'rtsp',
  'mp4',
  'jpeg',
  'shoutcast',
];

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-700';

type FormState = {
  name: string;
  description: string;
  mrp: string;
  customer_price: string;
  reseller_percentage: string;
  duration_days: string;
  max_streams: string;
  max_connections: string;
  playback_protocols: string[];
  show_customer: boolean;
  show_reseller: boolean;
  status: PlanStatus;
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  mrp: '',
  customer_price: '',
  reseller_percentage: '0',
  duration_days: '30',
  max_streams: '1',
  max_connections: '1',
  playback_protocols: [],
  show_customer: true,
  show_reseller: true,
  status: 'active',
};

function toFormState(plan: Plan | null): FormState {
  if (!plan) return EMPTY_FORM;
  return {
    name: plan.name,
    description: plan.description ?? '',
    mrp: plan.mrp,
    customer_price: plan.customer_price,
    reseller_percentage: plan.reseller_percentage,
    duration_days: String(plan.duration_days),
    max_streams: String(plan.max_streams),
    max_connections: String(plan.max_connections),
    playback_protocols: plan.playback_protocols ?? [],
    show_customer: plan.show_customer,
    show_reseller: plan.show_reseller,
    status: plan.status,
  };
}

function toPayload(form: FormState): PlanInput {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    mrp: Number(form.mrp),
    customer_price: Number(form.customer_price),
    reseller_percentage: Number(form.reseller_percentage),
    duration_days: Number(form.duration_days) || 1,
    max_streams: Number(form.max_streams) || 1,
    max_connections: Number(form.max_connections) || 1,
    playback_protocols: form.playback_protocols.length > 0 ? form.playback_protocols : undefined,
    show_customer: form.show_customer,
    show_reseller: form.show_reseller,
    status: form.status,
  };
}

export function PlanFormPanel({
  open,
  plan,
  onClose,
  onSubmit,
}: {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  onSubmit: (payload: PlanInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(plan));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleProtocol(key: string) {
    setForm((prev) => ({
      ...prev,
      playback_protocols: prev.playback_protocols.includes(key)
        ? prev.playback_protocols.filter((p) => p !== key)
        : [...prev.playback_protocols, key],
    }));
  }

  const previewReseller =
    form.mrp && form.reseller_percentage
      ? (Number(form.mrp) * (1 - Number(form.reseller_percentage) / 100)).toFixed(2)
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const clientErrors: Record<string, string[]> = {
      name: [],
      mrp: [],
      customer_price: [],
      duration_days: [],
    };
    if (form.name.trim().length < 2) clientErrors.name.push('Name must be at least 2 characters long');
    if (!form.mrp || Number(form.mrp) < 0) clientErrors.mrp.push('Enter a valid MRP');
    if (!form.customer_price || Number(form.customer_price) < 0) {
      clientErrors.customer_price.push('Enter a valid customer price');
    }
    if (!form.duration_days || Number(form.duration_days) < 1) {
      clientErrors.duration_days.push('Enter a duration of at least 1 day');
    }
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
          <h2 className="text-base font-semibold text-gray-900">{plan ? 'Edit plan' : 'Add plan'}</h2>
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
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputClass} />
              {errors.name?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-red-600">{msg}</p>
              ))}
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <input
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>MRP *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.mrp}
                  onChange={(e) => setField('mrp', e.target.value)}
                  className={inputClass}
                />
                {errors.mrp?.map((msg) => (
                  <p key={msg} className="mt-1 text-xs text-red-600">{msg}</p>
                ))}
              </div>
              <div>
                <label className={labelClass}>Customer price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.customer_price}
                  onChange={(e) => setField('customer_price', e.target.value)}
                  className={inputClass}
                />
                {errors.customer_price?.map((msg) => (
                  <p key={msg} className="mt-1 text-xs text-red-600">{msg}</p>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Reseller discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.reseller_percentage}
                onChange={(e) => setField('reseller_percentage', e.target.value)}
                className={inputClass}
              />
              {previewReseller !== null && (
                <p className="mt-1 text-xs text-gray-400">Reseller price ≈ {previewReseller}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Duration (days) *</label>
              <input
                type="number"
                min="1"
                value={form.duration_days}
                onChange={(e) => setField('duration_days', e.target.value)}
                className={inputClass}
              />
              {errors.duration_days?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-red-600">{msg}</p>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Max streams</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_streams}
                  onChange={(e) => setField('max_streams', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Max connections</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_connections}
                  onChange={(e) => setField('max_connections', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-gray-700">Playback protocols</p>
              <div className="flex flex-wrap gap-1.5">
                {PROTOCOL_KEYS.map((key) => {
                  const enabled = form.playback_protocols.includes(key);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => toggleProtocol(key)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        enabled ? 'bg-flu-pink text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.show_customer}
                  onChange={(e) => setField('show_customer', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-flu-pink focus:ring-flu-pink/40"
                />
                Show to customers
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.show_reseller}
                  onChange={(e) => setField('show_reseller', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-flu-pink focus:ring-flu-pink/40"
                />
                Show to resellers
              </label>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value as PlanStatus)}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
              {isSubmitting ? 'Saving…' : 'Save plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
