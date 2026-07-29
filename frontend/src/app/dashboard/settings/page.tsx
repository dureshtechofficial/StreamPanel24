"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Toggle, ToggleField } from "@/components/toggle";
import { SyncRunHistoryPanel } from "@/components/sync-run-history-panel";
import { ArrowPathIcon } from "@/components/icons";
import {
  listSyncSchedules,
  updateSyncSchedule,
} from "@/lib/sync-schedules-api";
import {
  listOrderCancelSettings,
  updateOrderCancelSetting,
} from "@/lib/order-cancel-settings-api";
import {
  listCustomerActionSettings,
  updateCustomerActionSetting,
} from "@/lib/customer-action-settings-api";
import {
  listWalletTopupSettings,
  updateWalletTopupSetting,
} from "@/lib/wallet-topup-settings-api";
import {
  getSmtpSettings,
  updateSmtpSettings,
  sendSmtpTest,
} from "@/lib/smtp-settings-api";
import type { SmtpSetting } from "@/types/smtp-setting";
import { CopyButton } from "@/components/copy-button";
import type { SyncSchedule, SyncType } from "@/types/sync-schedule";
import type { OrderCancelActor, OrderCancelSetting } from "@/types/order-cancel-setting";
import type {
  CustomerAction,
  CustomerActionActor,
  CustomerActionSetting,
} from "@/types/customer-action-setting";
import type { WalletTopupActor, WalletTopupSetting } from "@/types/razorpay";
import { ApiError } from "@/lib/api-error";
import { toastSuccess, toastError } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";
import { usePageTitle } from "@/lib/use-page-title";

const TYPE_INFO: Record<
  SyncType,
  { title: string; description: string; hasManualSync: boolean }
> = {
  server_stats: {
    title: "Server stats sync",
    description:
      "Polls every server's real config/stats endpoint and records a sample.",
    hasManualSync: true,
  },
  streams: {
    title: "Streams sync",
    description:
      "Pulls every server's real stream list (GET streams) and refreshes live data.",
    hasManualSync: true,
  },
  sessions: {
    title: "Sessions sync",
    description:
      "Pulls every server's real session list (GET sessions). IP geolocation is looked up client-side when sessions are viewed, not during this sync.",
    hasManualSync: true,
  },
  order_expiry: {
    title: "Order expiry sweep",
    description:
      "Flips active orders whose service period has ended to expired. Doesn't affect stream assignment or wallet balances.",
    hasManualSync: false,
  },
};

const CRON_PRESETS = [
  { label: "Every 5 seconds", value: "*/5 * * * * *" },
  { label: "Every 15 seconds", value: "*/15 * * * * *" },
  { label: "Every 30 seconds", value: "*/30 * * * * *" },
  { label: "Every 1 minutes", value: "0 * * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
];

type Draft = {
  enabled: boolean;
  manual_sync_enabled: boolean;
  cron_expression: string;
};

function formatRelativeTime(unixSeconds: number | null): string {
  if (unixSeconds === null) return "Never";
  const diffSeconds = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

function summarizeLastRun(
  summary: Record<string, unknown> | null,
): string | null {
  if (!summary) return null;
  if (typeof summary.error === "string") return `Failed: ${summary.error}`;
  const succeeded = summary.succeeded;
  const total = summary.total;
  const failed = summary.failed;
  if (typeof succeeded === "number" && typeof total === "number") {
    return (
      `${succeeded}/${total} server${total === 1 ? "" : "s"} synced` +
      (typeof failed === "number" && failed > 0 ? `, ${failed} failed` : "")
    );
  }
  const expired = summary.expired;
  if (typeof expired === "number") {
    return `${expired} order${expired === 1 ? "" : "s"} expired`;
  }
  return null;
}

const ORDER_CANCEL_ACTOR_LABELS: Record<OrderCancelActor, string> = {
  admin: "Admin",
  reseller: "Reseller",
  customer: "Customer",
};

const ORDER_CANCEL_ACTOR_ORDER: OrderCancelActor[] = ["admin", "reseller", "customer"];

function OrderCancelSection() {
  const [settings, setSettings] = useState<OrderCancelSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingActor, setSavingActor] = useState<OrderCancelActor | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listOrderCancelSettings();
      setSettings(result);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load order-cancel settings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleToggle(actorType: OrderCancelActor, enabled: boolean) {
    setSavingActor(actorType);
    setError(null);
    try {
      const updated = await updateOrderCancelSetting(actorType, enabled);
      setSettings((prev) =>
        prev.map((s) => (s.actor_type === actorType ? updated : s)),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save order-cancel setting.",
      );
    } finally {
      setSavingActor(null);
    }
  }

  return (
    <div className="animate-fade-in-up mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Order cancellation</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Control who is currently allowed to cancel an order, independently for
        each role.
      </p>

      {isLoading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground/70">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      )}

      {!isLoading && loadError && (
        <p className="mt-4 text-sm text-danger">{loadError}</p>
      )}

      {!isLoading && !loadError && (
        <div className="mt-4 divide-y divide-border">
          {ORDER_CANCEL_ACTOR_ORDER.map((actorType) => {
            const setting = settings.find((s) => s.actor_type === actorType);
            if (!setting) return null;
            return (
              <div key={actorType} className="flex items-center justify-between py-2">
                <ToggleField
                  label={`${ORDER_CANCEL_ACTOR_LABELS[actorType]} can cancel orders`}
                  checked={setting.enabled}
                  onChange={(v) => handleToggle(actorType, v)}
                />
                {savingActor === actorType && (
                  <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground/70" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

const CUSTOMER_ACTION_ACTOR_ORDER: CustomerActionActor[] = ["admin", "reseller"];
const CUSTOMER_ACTION_ACTOR_LABELS: Record<CustomerActionActor, string> = {
  admin: "Admin",
  reseller: "Reseller",
};
const CUSTOMER_ACTION_ORDER: CustomerAction[] = ["edit", "delete", "assign"];
const CUSTOMER_ACTION_LABELS: Record<CustomerAction, string> = {
  edit: "Edit customer",
  delete: "Delete customer",
  assign: "Assign streams",
};

function CustomerActionsSection() {
  const [settings, setSettings] = useState<CustomerActionSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listCustomerActionSettings();
      setSettings(result);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load customer-action settings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleToggle(
    actorType: CustomerActionActor,
    action: CustomerAction,
    enabled: boolean,
  ) {
    const key = `${actorType}:${action}`;
    setSavingKey(key);
    setError(null);
    try {
      const updated = await updateCustomerActionSetting(actorType, action, enabled);
      setSettings((prev) =>
        prev.map((s) =>
          s.actor_type === actorType && s.action === action ? updated : s,
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save customer-action setting.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="animate-fade-in-up mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Customer management</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Control who is currently allowed to edit, delete, or assign streams to
        a customer, independently for admin and resellers.
      </p>

      {isLoading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground/70">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      )}

      {!isLoading && loadError && (
        <p className="mt-4 text-sm text-danger">{loadError}</p>
      )}

      {!isLoading && !loadError && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="pb-2 pr-4 font-medium text-muted-foreground"></th>
                {CUSTOMER_ACTION_ACTOR_ORDER.map((actorType) => (
                  <th
                    key={actorType}
                    className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground/70"
                  >
                    {CUSTOMER_ACTION_ACTOR_LABELS[actorType]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CUSTOMER_ACTION_ORDER.map((action) => (
                <tr key={action}>
                  <td className="py-2 pr-4 text-foreground">
                    {CUSTOMER_ACTION_LABELS[action]}
                  </td>
                  {CUSTOMER_ACTION_ACTOR_ORDER.map((actorType) => {
                    const setting = settings.find(
                      (s) => s.actor_type === actorType && s.action === action,
                    );
                    const key = `${actorType}:${action}`;
                    if (!setting) return <td key={actorType} className="px-3 py-2" />;
                    return (
                      <td key={actorType} className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Toggle
                            label={`${CUSTOMER_ACTION_ACTOR_LABELS[actorType]} can ${CUSTOMER_ACTION_LABELS[action].toLowerCase()}`}
                            checked={setting.enabled}
                            onChange={(v) => handleToggle(actorType, action, v)}
                          />
                          {savingKey === key && (
                            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-muted-foreground/70" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

const WALLET_TOPUP_ACTOR_ORDER: WalletTopupActor[] = ["reseller", "customer"];
const WALLET_TOPUP_ACTOR_LABELS: Record<WalletTopupActor, string> = {
  reseller: "Reseller",
  customer: "Customer",
};

function WalletTopupSection() {
  const [settings, setSettings] = useState<WalletTopupSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingActor, setSavingActor] = useState<WalletTopupActor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minimumDrafts, setMinimumDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listWalletTopupSettings();
      setSettings(result);
      setMinimumDrafts(
        Object.fromEntries(result.map((s) => [s.actor_type, s.minimum_amount])),
      );
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load wallet top-up settings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleToggle(actorType: WalletTopupActor, enabled: boolean) {
    setSavingActor(actorType);
    setError(null);
    try {
      const updated = await updateWalletTopupSetting(actorType, { enabled });
      setSettings((prev) => prev.map((s) => (s.actor_type === actorType ? updated : s)));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save wallet top-up setting.",
      );
    } finally {
      setSavingActor(null);
    }
  }

  async function handleSaveMinimum(actorType: WalletTopupActor) {
    const draft = minimumDrafts[actorType];
    const value = Number(draft);
    if (!draft || Number.isNaN(value) || value <= 0) {
      setError("Enter a minimum amount greater than zero.");
      return;
    }
    setSavingActor(actorType);
    setError(null);
    try {
      const updated = await updateWalletTopupSetting(actorType, { minimum_amount: value });
      setSettings((prev) => prev.map((s) => (s.actor_type === actorType ? updated : s)));
      setMinimumDrafts((prev) => ({ ...prev, [actorType]: updated.minimum_amount }));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save wallet top-up setting.",
      );
    } finally {
      setSavingActor(null);
    }
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/razorpay/webhook`;

  return (
    <div className="animate-fade-in-up mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Wallet top-up (Razorpay)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Let resellers/customers add money to their own wallet online, and set the minimum
        amount allowed per top-up.
      </p>

      {isLoading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground/70">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      )}

      {!isLoading && loadError && (
        <p className="mt-4 text-sm text-danger">{loadError}</p>
      )}

      {!isLoading && !loadError && (
        <div className="mt-4 divide-y divide-border">
          {WALLET_TOPUP_ACTOR_ORDER.map((actorType) => {
            const setting = settings.find((s) => s.actor_type === actorType);
            if (!setting) return null;
            const draft = minimumDrafts[actorType] ?? setting.minimum_amount;
            const isDirty = draft !== setting.minimum_amount;
            return (
              <div
                key={actorType}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <ToggleField
                  label={`${WALLET_TOPUP_ACTOR_LABELS[actorType]}s can top up their own wallet`}
                  checked={setting.enabled}
                  onChange={(v) => handleToggle(actorType, v)}
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Minimum</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={draft}
                    onChange={(e) =>
                      setMinimumDrafts((prev) => ({ ...prev, [actorType]: e.target.value }))
                    }
                    className="w-24 rounded-lg border border-input px-2 py-1 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    onClick={() => handleSaveMinimum(actorType)}
                    disabled={!isDirty || savingActor === actorType}
                    className="rounded-full border border-input px-3 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save
                  </button>
                  {savingActor === actorType && (
                    <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground/70" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          Razorpay webhook URL
        </p>
        <p className="mb-2 text-xs text-muted-foreground">
          Paste this into the Razorpay dashboard&apos;s webhook settings (event:
          payment.captured).
        </p>
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
          <span className="flex-1 truncate font-mono text-xs text-foreground">{webhookUrl}</span>
          <CopyButton text={webhookUrl} />
        </div>
      </div>
    </div>
  );
}

const smtpInputClass =
  "w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20";
const smtpLabelClass = "mb-1 block text-xs font-medium text-foreground";

type SmtpDraft = {
  enabled: boolean;
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
};

function toSmtpDraft(s: SmtpSetting): SmtpDraft {
  return {
    enabled: s.enabled,
    host: s.host,
    port: String(s.port),
    secure: s.secure,
    username: s.username ?? "",
    password: "",
    from_email: s.from_email,
    from_name: s.from_name ?? "",
  };
}

function EmailSmtpSection() {
  const [setting, setSetting] = useState<SmtpSetting | null>(null);
  const [draft, setDraft] = useState<SmtpDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await getSmtpSettings();
      setSetting(result);
      setDraft(toSmtpDraft(result));
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load email settings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function setField<K extends keyof SmtpDraft>(key: K, value: SmtpDraft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!draft) return;
    if (!draft.host.trim()) {
      toastError(null, "SMTP host is required.");
      return;
    }
    if (!draft.from_email.trim()) {
      toastError(null, "A “from” email address is required.");
      return;
    }
    const port = Number(draft.port);
    setIsSaving(true);
    try {
      const updated = await updateSmtpSettings({
        enabled: draft.enabled,
        host: draft.host.trim(),
        port: Number.isFinite(port) && port > 0 ? port : undefined,
        secure: draft.secure,
        username: draft.username.trim(),
        password: draft.password ? draft.password : undefined,
        from_email: draft.from_email.trim(),
        from_name: draft.from_name.trim(),
      });
      setSetting(updated);
      setDraft(toSmtpDraft(updated));
      toastSuccess("Email settings saved");
    } catch (err) {
      toastError(err, "Failed to save email settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    const to = testEmail.trim();
    if (!to) {
      toastError(null, "Enter a recipient email address to test.");
      return;
    }
    setIsTesting(true);
    try {
      await sendSmtpTest(to);
      toastSuccess("Test email sent", `Delivered to ${to}`);
    } catch (err) {
      toastError(err, "Failed to send test email.");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="animate-fade-in-up mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Email (SMTP)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Store the outbound mail server used to send transactional email, and
            send yourself a test to confirm it works.
          </p>
        </div>
        {setting && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              setting.enabled
                ? "bg-success-soft text-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {setting.enabled ? "Enabled" : "Disabled"}
          </span>
        )}
      </div>

      {isLoading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground/70">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      )}

      {!isLoading && loadError && (
        <p className="mt-4 text-sm text-danger">{loadError}</p>
      )}

      {!isLoading && !loadError && draft && (
        <>
          <div className="mt-4 border-t border-border pt-4">
            <ToggleField
              label="Enable outbound email"
              checked={draft.enabled}
              onChange={(v) => setField("enabled", v)}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label className={smtpLabelClass}>SMTP host</label>
              <input
                value={draft.host}
                onChange={(e) => setField("host", e.target.value)}
                placeholder="smtp.example.com"
                className={smtpInputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={smtpLabelClass}>Port</label>
              <input
                type="number"
                min={1}
                max={65535}
                value={draft.port}
                onChange={(e) => setField("port", e.target.value)}
                placeholder="587"
                className={smtpInputClass}
              />
            </div>

            <div className="sm:col-span-3">
              <label className={smtpLabelClass}>Username</label>
              <input
                value={draft.username}
                onChange={(e) => setField("username", e.target.value)}
                placeholder="apikey / user@example.com"
                autoComplete="off"
                className={smtpInputClass}
              />
            </div>
            <div className="sm:col-span-3">
              <label className={smtpLabelClass}>Password</label>
              <input
                type="password"
                value={draft.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder={
                  setting?.has_password ? "•••••••• (leave blank to keep)" : "SMTP password"
                }
                autoComplete="new-password"
                className={smtpInputClass}
              />
            </div>

            <div className="sm:col-span-3">
              <label className={smtpLabelClass}>From email</label>
              <input
                type="email"
                value={draft.from_email}
                onChange={(e) => setField("from_email", e.target.value)}
                placeholder="no-reply@example.com"
                className={smtpInputClass}
              />
            </div>
            <div className="sm:col-span-3">
              <label className={smtpLabelClass}>From name</label>
              <input
                value={draft.from_name}
                onChange={(e) => setField("from_name", e.target.value)}
                placeholder="Optional display name"
                className={smtpInputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <ToggleField
              label="Use implicit TLS (SSL) — enable for port 465, off for 587/STARTTLS"
              checked={draft.secure}
              onChange={(v) => setField("secure", v)}
            />
          </div>

          <div className="mt-4 flex justify-end border-t border-border pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save email settings"}
            </button>
          </div>

          <div className="mt-4 rounded-lg bg-subtle/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Send a test email
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Uses the saved settings above — save any changes first.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className={`${smtpInputClass} sm:flex-1`}
              />
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTesting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                {isTesting ? "Sending…" : "Send test"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ScheduleCard({
  type,
  schedule,
  onSaved,
  onViewHistory,
}: {
  type: SyncType;
  schedule: SyncSchedule;
  onSaved: (updated: SyncSchedule) => void;
  onViewHistory: (type: SyncType) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    enabled: schedule.enabled,
    manual_sync_enabled: schedule.manual_sync_enabled,
    cron_expression: schedule.cron_expression,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    draft.enabled !== schedule.enabled ||
    draft.manual_sync_enabled !== schedule.manual_sync_enabled ||
    draft.cron_expression !== schedule.cron_expression;

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      const updated = await updateSyncSchedule(type, draft);
      onSaved(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save schedule.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const info = TYPE_INFO[type];
  const lastRunText = summarizeLastRun(schedule.last_run_summary);

  return (
    <div className="animate-fade-in-up rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {info.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{info.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <ToggleField
            label="Scheduled (cron)"
            checked={draft.enabled}
            onChange={(v) => setDraft((prev) => ({ ...prev, enabled: v }))}
          />
          {info.hasManualSync && (
            <ToggleField
              label="Manual sync button"
              checked={draft.manual_sync_enabled}
              onChange={(v) =>
                setDraft((prev) => ({ ...prev, manual_sync_enabled: v }))
              }
            />
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Cron expression
          </label>
          <input
            value={draft.cron_expression}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, cron_expression: e.target.value }))
            }
            placeholder="*/15 * * * *"
            className="w-full rounded-lg border border-input px-3 py-2 font-mono text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Quick presets
          </label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                setDraft((prev) => ({
                  ...prev,
                  cron_expression: e.target.value,
                }));
              }
            }}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="">Choose a preset…</option>
            {CRON_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <p className="text-xs text-muted-foreground/70">
          Last run: {formatRelativeTime(schedule.last_run_at)}
          {lastRunText ? ` — ${lastRunText}` : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewHistory(type)}
            className="rounded-full border border-input px-4 py-1.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            History
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsContent() {
  usePageTitle("Settings");
  const [schedules, setSchedules] = useState<SyncSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyType, setHistoryType] = useState<SyncType | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listSyncSchedules();
      setSchedules(result);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Failed to load sync schedules.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function handleSaved(updated: SyncSchedule) {
    setSchedules((prev) =>
      prev.map((s) => (s.sync_type === updated.sync_type ? updated : s)),
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule automatic syncing across every registered server, plus
          background jobs like the order expiry sweep.
        </p>
      </div>

      <EmailSmtpSection />
      <OrderCancelSection />
      <CustomerActionsSection />
      <WalletTopupSection />

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground/70">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          Loading schedules…
        </p>
      )}

      {!isLoading && loadError && (
        <p className="text-sm text-danger">{loadError}</p>
      )}

      {!isLoading && !loadError && (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.sync_type}
              type={schedule.sync_type}
              schedule={schedule}
              onSaved={handleSaved}
              onViewHistory={setHistoryType}
            />
          ))}
        </div>
      )}

      <SyncRunHistoryPanel
        open={historyType !== null}
        type={historyType}
        title={historyType ? TYPE_INFO[historyType].title : ""}
        onClose={() => setHistoryType(null)}
      />
    </div>
  );
}

function RestrictedNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Access restricted</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Managing sync schedules requires an admin account. Contact an
        administrator if you need access.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardShell>
        {user?.role === "admin" ? <SettingsContent /> : <RestrictedNotice />}
      </DashboardShell>
    </ProtectedRoute>
  );
}
