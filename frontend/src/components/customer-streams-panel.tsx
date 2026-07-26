'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  assignCustomerStreams,
  listCustomerStreams,
  searchAvailableStreams,
  type SearchAvailableStreamsParams,
} from '@/lib/customer-streams-api';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { Customer } from '@/types/customer';
import type { PaginatedResult } from '@/types/pagination';
import { ApiError } from '@/lib/api-error';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon, XIcon } from './icons';
import { Badge } from './ui/badge';

const PAGE_SIZE = 20;

const DEFAULT_API = {
  listCustomerStreams,
  assignCustomerStreams,
  searchAvailableStreams,
};

export interface CustomerStreamsPanelApi {
  listCustomerStreams: (customerId: string) => Promise<FlussonicStreamDirectoryEntry[]>;
  assignCustomerStreams: (
    customerId: string,
    streamIds: string[],
  ) => Promise<FlussonicStreamDirectoryEntry[]>;
  searchAvailableStreams: (
    params: SearchAvailableStreamsParams,
  ) => Promise<PaginatedResult<FlussonicStreamDirectoryEntry>>;
}

export function CustomerStreamsPanel({
  open,
  customer,
  onClose,
  api = DEFAULT_API,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  /** Defaults to the admin-scoped API (/customers/:id/streams, /flussonic-streams) — pass the reseller-scoped equivalents to reuse this panel in the reseller portal. */
  api?: CustomerStreamsPanelApi;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<FlussonicStreamDirectoryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Reset all transient state whenever the panel is (re)opened for a customer,
  // adjusted during render rather than an effect (see "Adjusting state when a prop changes").
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  if (open && customer && initializedFor !== customer.id) {
    setInitializedFor(customer.id);
    setSelected(new Set());
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    setSaved(false);
    setSaveError(null);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const load = useCallback(async () => {
    if (!customer) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await api.searchAvailableStreams({
        search: debouncedSearch || undefined,
        availableForCustomerId: customer.id,
        page,
        limit: PAGE_SIZE,
      });
      setItems(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load streams.');
    } finally {
      setIsLoading(false);
    }
  }, [customer, debouncedSearch, page, api]);

  useEffect(() => {
    if (!open || !customer) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [open, customer, load]);

  useEffect(() => {
    if (!open || !customer) return;
    let cancelled = false;
    api
      .listCustomerStreams(customer.id)
      .then((assigned) => {
        if (!cancelled) setSelected(new Set(assigned.map((s) => s.id)));
      })
      .catch(() => {
        // best-effort seed; the picker still works, just starts unchecked
      });
    return () => {
      cancelled = true;
    };
  }, [open, customer, api]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!customer) return;
    setIsSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.assignCustomerStreams(customer.id, Array.from(selected));
      setSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : 'Failed to save stream assignment.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Assign streams</h2>
            <p className="text-xs text-muted-foreground">{customer?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground"
            aria-label="Close panel"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border px-6 py-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search streams…"
              className="w-full rounded-lg border border-input py-2 pl-9 pr-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            {selected.size} stream{selected.size === 1 ? '' : 's'} selected
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground/70">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Loading streams…
            </p>
          )}

          {!isLoading && loadError && <p className="text-sm text-danger">{loadError}</p>}

          {!isLoading && !loadError && items.length === 0 && (
            <p className="text-sm text-muted-foreground/70">No streams found.</p>
          )}

          {!isLoading && !loadError && items.length > 0 && (
            <ul className="space-y-1">
              {items.map((stream) => {
                const assignedToOther =
                  stream.customer_id != null && stream.customer_id !== customer?.id;
                const assignedToThis =
                  stream.customer_id != null && stream.customer_id === customer?.id;
                const ownerName = stream.customer_name ?? 'another customer';

                return (
                  <li key={stream.id}>
                    <label
                      className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 ${
                        assignedToOther
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:bg-muted'
                      }`}
                      title={assignedToOther ? `Assigned to ${ownerName}` : undefined}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected.has(stream.id)}
                          disabled={assignedToOther}
                          onChange={() => toggle(stream.id)}
                          className="h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-ring/40 disabled:cursor-not-allowed"
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-foreground">
                              {stream.title || stream.name}
                            </span>
                            {assignedToThis && (
                              <Badge variant="success" className="shrink-0">
                                Assigned
                              </Badge>
                            )}
                            {assignedToOther && (
                              <Badge variant="warning" className="shrink-0">
                                Taken
                              </Badge>
                            )}
                          </span>
                          {stream.title && (
                            <span className="truncate text-xs text-muted-foreground/70">
                              {stream.name}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                        {stream.customer_id && (
                          <span
                            className={`max-w-36 truncate text-xs font-medium ${
                              assignedToOther ? 'text-warning' : 'text-success'
                            }`}
                          >
                            {assignedToThis ? 'for ' : 'assigned to '}
                            {assignedToThis ? customer?.name : ownerName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/70">{stream.server_name}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!isLoading && !loadError && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Prev
            </button>
            <span className="text-xs text-muted-foreground/70">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="border-t border-border px-6 py-4">
          {saveError && <p className="mb-2 text-xs text-danger">{saveError}</p>}
          {saved && <p className="mb-2 text-xs text-success">Saved.</p>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
