"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { ToggleField } from "@/components/toggle";
import { ArrowPathIcon } from "@/components/icons";
import {
  listSyncSchedules,
  updateSyncSchedule,
} from "@/lib/sync-schedules-api";
import type { SyncSchedule, SyncType } from "@/types/sync-schedule";
import { ApiError } from "@/lib/api-error";
import { useAuth } from "@/lib/auth-context";
import { usePageTitle } from "@/lib/use-page-title";

const TYPE_INFO: Record<SyncType, { title: string; description: string }> = {
  server_stats: {
    title: "Server stats sync",
    description:
      "Polls every server's real config/stats endpoint and records a sample.",
  },
  streams: {
    title: "Streams sync",
    description:
      "Pulls every server's real stream list (GET streams) and refreshes live data.",
  },
  sessions: {
    title: "Sessions sync",
    description:
      "Pulls every server's real session list (GET sessions); new IPs are enriched via ipwho.is.",
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

type Draft = { enabled: boolean; cron_expression: string };

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
  return null;
}

function ScheduleCard({
  type,
  schedule,
  onSaved,
}: {
  type: SyncType;
  schedule: SyncSchedule;
  onSaved: (updated: SyncSchedule) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    enabled: schedule.enabled,
    cron_expression: schedule.cron_expression,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    draft.enabled !== schedule.enabled ||
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
    <div className="animate-fade-in-up rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {info.title}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{info.description}</p>
        </div>
        <ToggleField
          label="Enabled"
          checked={draft.enabled}
          onChange={(v) => setDraft((prev) => ({ ...prev, enabled: v }))}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Cron expression
          </label>
          <input
            value={draft.cron_expression}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, cron_expression: e.target.value }))
            }
            placeholder="*/15 * * * *"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
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

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400">
          Last run: {formatRelativeTime(schedule.last_run_at)}
          {lastRunText ? ` — ${lastRunText}` : ""}
        </p>
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="rounded-full bg-flu-pink px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function SettingsContent() {
  usePageTitle("Settings");
  const [schedules, setSchedules] = useState<SyncSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Schedule automatic syncing for each sync type, applied across every
          registered server.
        </p>
      </div>

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          Loading schedules…
        </p>
      )}

      {!isLoading && loadError && (
        <p className="text-sm text-red-600">{loadError}</p>
      )}

      {!isLoading && !loadError && (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.sync_type}
              type={schedule.sync_type}
              schedule={schedule}
              onSaved={handleSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RestrictedNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900">Access restricted</h1>
      <p className="mt-2 text-sm text-gray-500">
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
