'use client';

import { useState, type FormEvent } from 'react';
import type { Plan, PlanInput, PlanStatus } from '@/types/plan';
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
  'w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20';
const labelClass = 'mb-1 block text-xs font-medium text-foreground';

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
    form.customer_price && form.reseller_percentage
      ? (Number(form.customer_price) * (1 - Number(form.reseller_percentage) / 100)).toFixed(2)
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
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent size="md">
        <SheetHeader>
          <SheetTitle>{plan ? 'Edit plan' : 'Add plan'}</SheetTitle>
          <SheetDescription>
            {plan ? 'Update this plan.' : 'Create a new plan.'}
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
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputClass} />
              {errors.name?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-danger">{msg}</p>
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
                  <p key={msg} className="mt-1 text-xs text-danger">{msg}</p>
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
                  <p key={msg} className="mt-1 text-xs text-danger">{msg}</p>
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
                <p className="mt-1 text-xs text-muted-foreground/70">Reseller price ≈ {previewReseller}</p>
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
                <p key={msg} className="mt-1 text-xs text-danger">{msg}</p>
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
              <p className="mb-2 text-xs font-medium text-foreground">Playback protocols</p>
              <div className="flex flex-wrap gap-1.5">
                {PROTOCOL_KEYS.map((key) => {
                  const enabled = form.playback_protocols.includes(key);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => toggleProtocol(key)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        enabled ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.show_customer}
                  onChange={(e) => setField('show_customer', e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring/40"
                />
                Show to customers
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.show_reseller}
                  onChange={(e) => setField('show_reseller', e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring/40"
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
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save plan'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
