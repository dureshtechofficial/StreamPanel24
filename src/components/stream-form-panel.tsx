'use client';

import { useState, type FormEvent } from 'react';
import type {
  FlussonicStream,
  FlussonicStreamInput,
  StreamProtocols,
} from '@/types/flussonic-stream';
import { ApiError } from '@/lib/api-error';
import { groupFieldErrors } from '@/lib/form-errors';
import { checkStreamName } from '@/lib/flussonic-streams-api';
import { ToggleField } from './toggle';
import { ConfirmDialog } from './confirm-dialog';
import { ChevronDownIcon, PlusIcon, TrashIcon, XIcon } from './icons';

const FIELDS = ['name', 'inputs', 'retry_limit', 'ingest_domain', 'on_play', 'on_publish'];

const DEFAULT_TRUE_PROTOCOLS: (keyof StreamProtocols)[] = ['hls', 'player', 'rtmp', 'srt'];

const URL_PRESETS = ['publish://', 'fake://fake', 'custom'] as const;
type UrlPreset = (typeof URL_PRESETS)[number];

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-700';
const sectionHeaderClass = 'mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400';

const PROTOCOL_KEYS: (keyof StreamProtocols)[] = [
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
  'm4f',
  'm4s',
  'mseld',
  'tshttp',
  'api',
  'whitelist',
];

type InputRow = {
  urlPreset: UrlPreset;
  customUrl: string;
  comment: string;
  source_timeout: string;
};

function resolveInputUrl(row: InputRow): string {
  return row.urlPreset === 'custom' ? row.customUrl.trim() : row.urlPreset;
}

type AuthHookState = {
  url: string;
  max_sessions: string;
  domains: string;
  allowed_countries: string;
  disallowed_countries: string;
  soft_limitation: boolean;
  session_keys: string;
};

const EMPTY_INPUT_ROW: InputRow = {
  urlPreset: 'publish://',
  customUrl: '',
  comment: '',
  source_timeout: '30',
};

const EMPTY_AUTH_HOOK: AuthHookState = {
  url: '',
  max_sessions: '5',
  domains: '',
  allowed_countries: '',
  disallowed_countries: '',
  soft_limitation: false,
  session_keys: 'name,token,proto,ip',
};

const EMPTY_PROTOCOLS: Record<keyof StreamProtocols, boolean> = PROTOCOL_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: DEFAULT_TRUE_PROTOCOLS.includes(key) }),
  {} as Record<keyof StreamProtocols, boolean>,
);

type FormState = {
  applicationName: string;
  key: string;
  comment: string;
  title: string;
  static: boolean;
  disabled: boolean;
  retry_limit: string;
  ingest_domain: string;
  inputs: InputRow[];
  protocols: Record<keyof StreamProtocols, boolean>;
  onPlayEnabled: boolean;
  onPlay: AuthHookState;
  onPublishEnabled: boolean;
  onPublish: AuthHookState;
};

const EMPTY_FORM: FormState = {
  applicationName: 'live',
  key: '',
  comment: '',
  title: '',
  static: true,
  disabled: false,
  retry_limit: '20',
  ingest_domain: '',
  inputs: [EMPTY_INPUT_ROW],
  protocols: EMPTY_PROTOCOLS,
  onPlayEnabled: false,
  onPlay: EMPTY_AUTH_HOOK,
  onPublishEnabled: false,
  onPublish: EMPTY_AUTH_HOOK,
};

function computeName(applicationName: string, key: string): string {
  return `${applicationName.trim()}/${key.trim()}`;
}

function splitName(name: string): { applicationName: string; key: string } {
  const index = name.indexOf('/');
  if (index === -1) return { applicationName: name, key: '' };
  return { applicationName: name.slice(0, index), key: name.slice(index + 1) };
}

function toAuthHookState(hook: FlussonicStream['config_json']['on_play']): AuthHookState {
  if (!hook) return EMPTY_AUTH_HOOK;
  return {
    url: hook.url,
    max_sessions: hook.max_sessions !== undefined ? String(hook.max_sessions) : '5',
    domains: (hook.domains ?? []).join(','),
    allowed_countries: (hook.allowed_countries ?? []).join(','),
    disallowed_countries: (hook.disallowed_countries ?? []).join(','),
    soft_limitation: hook.soft_limitation ?? false,
    session_keys: (hook.session_keys ?? []).join(','),
  };
}

function toFormState(stream: FlussonicStream | null): FormState {
  if (!stream) return EMPTY_FORM;
  const config = stream.config_json;
  const { applicationName, key } = splitName(config.name);
  return {
    applicationName,
    key,
    comment: config.comment ?? '',
    title: config.title ?? '',
    static: config.static ?? true,
    disabled: config.disabled ?? false,
    retry_limit: config.retry_limit !== undefined ? String(config.retry_limit) : '',
    ingest_domain: stream.ingest_domain ?? '',
    inputs:
      config.inputs && config.inputs.length > 0
        ? config.inputs.map((i) => {
            const isKnownPreset = i.url === 'publish://' || i.url === 'fake://fake';
            return {
              urlPreset: isKnownPreset ? (i.url as UrlPreset) : 'custom',
              customUrl: isKnownPreset ? '' : i.url,
              comment: i.comment ?? '',
              source_timeout: i.source_timeout !== undefined ? String(i.source_timeout) : '30',
            };
          })
        : [EMPTY_INPUT_ROW],
    protocols: { ...EMPTY_PROTOCOLS, ...config.protocols },
    onPlayEnabled: Boolean(config.on_play),
    onPlay: toAuthHookState(config.on_play),
    onPublishEnabled: Boolean(config.on_publish),
    onPublish: toAuthHookState(config.on_publish),
  };
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function toAuthHookPayload(state: AuthHookState) {
  return {
    url: state.url.trim(),
    max_sessions: state.max_sessions ? Number(state.max_sessions) : undefined,
    domains: splitList(state.domains).length ? splitList(state.domains) : undefined,
    allowed_countries: splitList(state.allowed_countries).length
      ? splitList(state.allowed_countries)
      : undefined,
    disallowed_countries: splitList(state.disallowed_countries).length
      ? splitList(state.disallowed_countries)
      : undefined,
    soft_limitation: state.soft_limitation,
    session_keys: splitList(state.session_keys).length ? splitList(state.session_keys) : undefined,
  };
}

function toPayload(form: FormState): FlussonicStreamInput {
  return {
    name: computeName(form.applicationName, form.key),
    comment: form.comment.trim() || undefined,
    title: form.title.trim() || undefined,
    static: form.static,
    disabled: form.disabled,
    inputs: form.inputs
      .filter((i) => resolveInputUrl(i))
      .map((i, index) => ({
        url: resolveInputUrl(i),
        priority: index + 1,
        comment: i.comment.trim() || undefined,
        source_timeout: i.source_timeout ? Number(i.source_timeout) : undefined,
      })),
    retry_limit: form.retry_limit ? Number(form.retry_limit) : undefined,
    protocols: form.protocols,
    ingest_domain: form.ingest_domain.trim() || undefined,
    on_play: form.onPlayEnabled ? toAuthHookPayload(form.onPlay) : undefined,
    on_publish: form.onPublishEnabled ? toAuthHookPayload(form.onPublish) : undefined,
  };
}

export function StreamFormPanel({
  open,
  serverId,
  stream,
  onClose,
  onSubmit,
}: {
  open: boolean;
  serverId: string;
  stream: FlussonicStream | null;
  onClose: () => void;
  onSubmit: (payload: FlussonicStreamInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(stream));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [pendingOverwriteConfirm, setPendingOverwriteConfirm] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setInputRow(index: number, patch: Partial<InputRow>) {
    setForm((prev) => ({
      ...prev,
      inputs: prev.inputs.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function addInputRow() {
    setForm((prev) => ({ ...prev, inputs: [...prev.inputs, EMPTY_INPUT_ROW] }));
  }

  function removeInputRow(index: number) {
    setForm((prev) => ({
      ...prev,
      inputs: prev.inputs.length > 1 ? prev.inputs.filter((_, i) => i !== index) : prev.inputs,
    }));
  }

  function moveInputRow(index: number, direction: -1 | 1) {
    setForm((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.inputs.length) return prev;
      const inputs = [...prev.inputs];
      [inputs[index], inputs[target]] = [inputs[target], inputs[index]];
      return { ...prev, inputs };
    });
  }

  function setProtocol(key: keyof StreamProtocols, value: boolean) {
    setForm((prev) => ({ ...prev, protocols: { ...prev.protocols, [key]: value } }));
  }

  function setOnPlay(next: AuthHookState) {
    setForm((prev) => ({
      ...prev,
      onPlay: next,
      onPublish:
        next.max_sessions !== prev.onPlay.max_sessions
          ? { ...prev.onPublish, max_sessions: next.max_sessions }
          : prev.onPublish,
    }));
  }

  function setOnPublish(next: AuthHookState) {
    setForm((prev) => ({
      ...prev,
      onPublish: next,
      onPlay:
        next.max_sessions !== prev.onPublish.max_sessions
          ? { ...prev.onPlay, max_sessions: next.max_sessions }
          : prev.onPlay,
    }));
  }

  async function submitForm(confirmOverwrite: boolean) {
    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit({ ...toPayload(form), confirmOverwrite: confirmOverwrite || undefined });
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const clientErrors: Record<string, string[]> = {
      applicationName: [],
      key: [],
      inputs: [],
    };
    if (form.applicationName.trim().length < 1) {
      clientErrors.applicationName.push('Application name is required');
    }
    if (form.key.trim().length < 1) {
      clientErrors.key.push('Key is required');
    }
    if (!form.inputs.some((i) => resolveInputUrl(i))) {
      clientErrors.inputs.push('At least one input URL is required');
    }
    if (form.onPlayEnabled && !form.onPlay.url.trim()) {
      clientErrors.inputs.push('on_play URL is required when enabled');
    }
    if (form.onPublishEnabled && !form.onPublish.url.trim()) {
      clientErrors.inputs.push('on_publish URL is required when enabled');
    }
    if (Object.values(clientErrors).some((v) => v.length > 0)) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});

    const computedName = computeName(form.applicationName, form.key);
    const nameChanged = !stream || computedName !== stream.config_json.name;

    // Only re-check availability when the name is actually changing — checking
    // an unchanged name would always find "itself" and falsely look taken.
    if (nameChanged) {
      setIsCheckingName(true);
      try {
        const check = await checkStreamName(serverId, computedName);
        if (check.existsInDb) {
          setErrors({ key: ['A stream with this name already exists on this server.'] });
          return;
        }
        if (check.existsOnServer) {
          setPendingOverwriteConfirm(true);
          return;
        }
      } catch (err) {
        setErrors({
          general: [
            err instanceof ApiError
              ? err.message
              : 'Failed to verify whether this name is already in use.',
          ],
        });
        return;
      } finally {
        setIsCheckingName(false);
      }
    }

    await submitForm(false);
  }

  async function handleConfirmOverwrite() {
    setPendingOverwriteConfirm(false);
    await submitForm(true);
  }

  const name = computeName(form.applicationName, form.key);

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {stream ? 'Edit stream' : 'Add stream'}
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
          <div className="flex-1 space-y-5 px-6 py-5">
            {errors.general && errors.general.length > 0 && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.general.map((msg) => (
                  <p key={msg}>{msg}</p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Application name *</label>
                <input
                  value={form.applicationName}
                  onChange={(e) => setField('applicationName', e.target.value)}
                  placeholder="live"
                  className={inputClass}
                />
                {errors.applicationName?.map((msg) => (
                  <p key={msg} className="mt-1 text-xs text-red-600">
                    {msg}
                  </p>
                ))}
              </div>
              <div>
                <label className={labelClass}>Key *</label>
                <input
                  value={form.key}
                  onChange={(e) => setField('key', e.target.value)}
                  placeholder="unique key"
                  className={inputClass}
                />
                {errors.key?.map((msg) => (
                  <p key={msg} className="mt-1 text-xs text-red-600">
                    {msg}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Name</label>
              <input
                value={name}
                disabled
                readOnly
                className={`${inputClass} bg-gray-50 text-gray-500`}
              />
              <p className="mt-1 text-xs text-gray-400">
                Built automatically from application name and key.
                {stream && ' Renaming deletes the old stream on Flussonic and recreates it under the new name.'}
              </p>
              {errors.name?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-red-600">
                  {msg}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="Hockey Channel"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Ingest domain</label>
                <input
                  value={form.ingest_domain}
                  onChange={(e) => setField('ingest_domain', e.target.value)}
                  placeholder="ingest.example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Comment</label>
              <input
                value={form.comment}
                onChange={(e) => setField('comment', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Retry limit</label>
                <input
                  type="number"
                  min={0}
                  value={form.retry_limit}
                  onChange={(e) => setField('retry_limit', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex items-end gap-6 pb-1">
                <ToggleField
                  label="Static"
                  checked={form.static}
                  onChange={(v) => setField('static', v)}
                />
                <ToggleField
                  label="Disabled"
                  checked={form.disabled}
                  onChange={(v) => setField('disabled', v)}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className={sectionHeaderClass}>Inputs *</p>
                <button
                  type="button"
                  onClick={addInputRow}
                  className="flex items-center gap-1 text-xs font-medium text-flu-pink hover:text-flu-pink-dark"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add input
                </button>
              </div>
              {errors.inputs?.map((msg) => (
                <p key={msg} className="mb-2 text-xs text-red-600">
                  {msg}
                </p>
              ))}
              <div className="space-y-3">
                {form.inputs.map((row, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <label className={labelClass}>URL — Priority {index + 1}</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveInputRow(index, -1)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-flu-pink disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Move input up"
                        >
                          <ChevronDownIcon className="h-3.5 w-3.5 rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveInputRow(index, 1)}
                          disabled={index === form.inputs.length - 1}
                          className="text-gray-400 hover:text-flu-pink disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Move input down"
                        >
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                        </button>
                        {form.inputs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInputRow(index)}
                            className="text-gray-400 hover:text-red-600"
                            aria-label="Remove input"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <select
                      value={row.urlPreset}
                      onChange={(e) => setInputRow(index, { urlPreset: e.target.value as UrlPreset })}
                      className={inputClass}
                    >
                      {URL_PRESETS.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset === 'custom' ? 'Custom' : preset}
                        </option>
                      ))}
                    </select>
                    {row.urlPreset === 'custom' && (
                      <input
                        value={row.customUrl}
                        onChange={(e) => setInputRow(index, { customUrl: e.target.value })}
                        placeholder="rtsp://camera.example.com/stream"
                        className={`${inputClass} mt-2`}
                      />
                    )}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Source timeout</label>
                        <input
                          type="number"
                          min={0}
                          value={row.source_timeout}
                          onChange={(e) => setInputRow(index, { source_timeout: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Comment</label>
                        <input
                          value={row.comment}
                          onChange={(e) => setInputRow(index, { comment: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className={sectionHeaderClass}>Protocols</p>
              <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
                {PROTOCOL_KEYS.map((key) => (
                  <ToggleField
                    key={key}
                    label={key}
                    checked={form.protocols[key]}
                    onChange={(v) => setProtocol(key, v)}
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <ToggleField
                label="on_play authentication"
                hint="Restricts playback with an auth callback"
                checked={form.onPlayEnabled}
                onChange={(v) => setField('onPlayEnabled', v)}
              />
              {form.onPlayEnabled && <AuthHookFields value={form.onPlay} onChange={setOnPlay} />}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <ToggleField
                label="on_publish authentication"
                hint="Restricts publishing with an auth callback"
                checked={form.onPublishEnabled}
                onChange={(v) => setField('onPublishEnabled', v)}
              />
              {form.onPublishEnabled && (
                <AuthHookFields value={form.onPublish} onChange={setOnPublish} />
              )}
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
              disabled={isSubmitting || isCheckingName}
              className="rounded-full bg-flu-pink px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCheckingName ? 'Checking…' : isSubmitting ? 'Saving…' : 'Save stream'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={pendingOverwriteConfirm}
        title="Stream already exists"
        message={`A stream named "${name}" already exists on this Flussonic server (it wasn't created through this app). Overwriting it will replace its current configuration. Continue?`}
        confirmLabel="Overwrite"
        isBusy={isSubmitting}
        onConfirm={handleConfirmOverwrite}
        onCancel={() => setPendingOverwriteConfirm(false)}
      />
    </div>
  );
}

function AuthHookFields({
  value,
  onChange,
}: {
  value: AuthHookState;
  onChange: (value: AuthHookState) => void;
}) {
  function setField<K extends keyof AuthHookState>(key: K, v: AuthHookState[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-gray-200 p-3">
      <div>
        <label className={labelClass}>Callback URL *</label>
        <input
          value={value.url}
          onChange={(e) => setField('url', e.target.value)}
          placeholder="{{streamAuthUrl}}"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Max sessions</label>
          <input
            type="number"
            min={0}
            value={value.max_sessions}
            onChange={(e) => setField('max_sessions', e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">Kept in sync with on_publish.</p>
        </div>
        <div className="flex items-end pb-1">
          <ToggleField
            label="Soft limitation"
            checked={value.soft_limitation}
            onChange={(v) => setField('soft_limitation', v)}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Session keys (comma-separated)</label>
        <input
          value={value.session_keys}
          onChange={(e) => setField('session_keys', e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Domains (comma-separated)</label>
        <input
          value={value.domains}
          onChange={(e) => setField('domains', e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Allowed countries</label>
          <input
            value={value.allowed_countries}
            onChange={(e) => setField('allowed_countries', e.target.value)}
            placeholder="US,GB"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Disallowed countries</label>
          <input
            value={value.disallowed_countries}
            onChange={(e) => setField('disallowed_countries', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
