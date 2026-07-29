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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
  "w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20";
const labelClass = "mb-1 block text-xs font-medium text-foreground";

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
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent size="md">
        <SheetHeader>
          <SheetTitle>{server ? "Edit server" : "Add server"}</SheetTitle>
          <SheetDescription>
            {server ? "Update this server connection." : "Register a new Flussonic server."}
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
                onChange={(e) => setField("name", e.target.value)}
                placeholder="SRV-01"
                className={inputClass}
              />
              {errors.name?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-danger">
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
                  <p key={msg} className="mt-1 text-xs text-danger">
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

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.use_ssl}
                onChange={(e) => setField("use_ssl", e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              Use SSL
            </label>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
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
                    <p key={msg} className="mt-1 text-xs text-danger">
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
                    <p key={msg} className="mt-1 text-xs text-danger">
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

                <p className="text-xs text-muted-foreground/70">
                  The Flussonic API access token is derived automatically from
                  the username and password above.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
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
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save server"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
