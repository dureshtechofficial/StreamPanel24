"use client";

import { useState, type FormEvent } from "react";
import type {
  ApiVersionTag,
  FlussonicServer,
  FlussonicServerInput,
  FlussonicServerStatus,
} from "@/types/flussonic-server";
import { ApiError } from "@/lib/api-error";
import { groupFieldErrors } from "@/lib/form-errors";
import { XIcon } from "./icons";

const FIELDS = [
  "name",
  "hostname",
  "domain",
  "port",
  "api_username",
  "api_password",
  "api_base_path",
  "flussonic_version",
];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20";
const labelClass = "mb-1 block text-xs font-medium text-gray-700";

type FormState = {
  name: string;
  hostname: string;
  domain: string;
  port: string;
  use_ssl: boolean;
  api_username: string;
  api_password: string;
  api_base_path: string;
  flussonic_version: string;
  api_version_tag: ApiVersionTag;
  status: FlussonicServerStatus;
};

const EMPTY_FORM: FormState = {
  name: "",
  hostname: "",
  domain: "",
  port: "80",
  use_ssl: false,
  api_username: "",
  api_password: "",
  api_base_path: "/streamer/api",
  flussonic_version: "",
  api_version_tag: "v3",
  status: "active",
};

function toFormState(server: FlussonicServer | null): FormState {
  if (!server) return EMPTY_FORM;
  return {
    name: server.name,
    hostname: server.hostname,
    domain: server.domain ?? "",
    port: String(server.port),
    use_ssl: server.use_ssl,
    api_username: server.api_username,
    api_password: "",
    api_base_path: server.api_base_path,
    flussonic_version: server.flussonic_version ?? "",
    api_version_tag: server.api_version_tag,
    status: server.status,
  };
}

function toPayload(form: FormState): FlussonicServerInput {
  return {
    name: form.name.trim(),
    hostname: form.hostname.trim(),
    domain: form.domain.trim() || undefined,
    port: form.port ? Number(form.port) : undefined,
    use_ssl: form.use_ssl,
    api_username: form.api_username.trim(),
    api_password: form.api_password || undefined,
    api_base_path: form.api_base_path.trim() || undefined,
    flussonic_version: form.flussonic_version.trim() || undefined,
    api_version_tag: form.api_version_tag,
    status: form.status,
  };
}

export function ServerFormPanel({
  open,
  server,
  onClose,
  onSubmit,
}: {
  open: boolean;
  server: FlussonicServer | null;
  onClose: () => void;
  onSubmit: (payload: FlussonicServerInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(server));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const clientErrors: Record<string, string[]> = {
      name: [],
      hostname: [],
      api_username: [],
      api_password: [],
    };
    if (form.name.trim().length < 2)
      clientErrors.name.push("Name must be at least 2 characters long");
    if (form.hostname.trim().length < 1)
      clientErrors.hostname.push("Hostname is required");
    if (form.api_username.trim().length < 1)
      clientErrors.api_username.push("API username is required");
    if (!server && form.api_password.trim().length < 1) {
      clientErrors.api_password.push("API password is required");
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
        setErrors({ general: ["Something went wrong. Please try again."] });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {server ? "Edit server" : "Add server"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close panel"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
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
                onChange={(e) => setField("name", e.target.value)}
                placeholder="SRV-01"
                className={inputClass}
              />
              {errors.name?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-red-600">
                  {msg}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Hostname *</label>
                <input
                  value={form.hostname}
                  onChange={(e) => setField("hostname", e.target.value)}
                  placeholder="10.0.1.15 or fqdn"
                  className={inputClass}
                />
                {errors.hostname?.map((msg) => (
                  <p key={msg} className="mt-1 text-xs text-red-600">
                    {msg}
                  </p>
                ))}
              </div>
              <div>
                <label className={labelClass}>Port</label>
                <input
                  type="number"
                  value={form.port}
                  onChange={(e) => setField("port", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Domain</label>
              <input
                value={form.domain}
                onChange={(e) => setField("domain", e.target.value)}
                placeholder="cdn.example.com"
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.use_ssl}
                onChange={(e) => setField("use_ssl", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-flu-pink focus:ring-flu-pink"
              />
              Use SSL
            </label>

            <div className="border-t border-gray-100 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                API access
              </p>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>API username *</label>
                  <input
                    value={form.api_username}
                    onChange={(e) => setField("api_username", e.target.value)}
                    className={inputClass}
                  />
                  {errors.api_username?.map((msg) => (
                    <p key={msg} className="mt-1 text-xs text-red-600">
                      {msg}
                    </p>
                  ))}
                </div>

                <div>
                  <label className={labelClass}>
                    API password {server ? "" : "*"}
                  </label>
                  <input
                    type="password"
                    value={form.api_password}
                    onChange={(e) => setField("api_password", e.target.value)}
                    placeholder={
                      server ? "Leave blank to keep existing" : undefined
                    }
                    className={inputClass}
                  />
                  {errors.api_password?.map((msg) => (
                    <p key={msg} className="mt-1 text-xs text-red-600">
                      {msg}
                    </p>
                  ))}
                </div>

                <div>
                  <label className={labelClass}>API base path</label>
                  <input
                    value={form.api_base_path}
                    onChange={(e) => setField("api_base_path", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <p className="text-xs text-gray-400">
                  The Flussonic API access token is derived automatically from
                  the username and password above.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
              <div>
                <label className={labelClass}>API version</label>
                <select
                  value={form.api_version_tag}
                  onChange={(e) =>
                    setField("api_version_tag", e.target.value as ApiVersionTag)
                  }
                  className={inputClass}
                >
                  <option value="v3">v3</option>
                  <option value="v4">v4</option>
                  <option value="v5">v5</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setField("status", e.target.value as FlussonicServerStatus)
                  }
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="unreachable">Unreachable</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Flussonic version</label>
              <input
                value={form.flussonic_version}
                onChange={(e) => setField("flussonic_version", e.target.value)}
                placeholder="e.g. 23.09 (filled after first sync)"
                className={inputClass}
              />
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
              {isSubmitting ? "Saving…" : "Save server"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
