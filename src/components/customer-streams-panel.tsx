'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  assignCustomerStreams,
  listCustomerStreams,
  searchAvailableStreams,
} from '@/lib/customer-streams-api';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';
import type { Customer } from '@/types/customer';
import { ApiError } from '@/lib/api-error';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon, XIcon } from './icons';

const PAGE_SIZE = 20;

export function CustomerStreamsPanel({
  open,
  customer,
  onClose,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
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
      const result = await searchAvailableStreams({
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
  }, [customer, debouncedSearch, page]);

  useEffect(() => {
    if (!open || !customer) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [open, customer, load]);

  useEffect(() => {
    if (!open || !customer) return;
    let cancelled = false;
    listCustomerStreams(customer.id)
      .then((assigned) => {
        if (!cancelled) setSelected(new Set(assigned.map((s) => s.id)));
      })
      .catch(() => {
        // best-effort seed; the picker still works, just starts unchecked
      });
    return () => {
      cancelled = true;
    };
  }, [open, customer]);

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
      await assignCustomerStreams(customer.id, Array.from(selected));
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
          <div>
            <h2 className="text-base font-semibold text-gray-900">Assign streams</h2>
            <p className="text-xs text-gray-500">{customer?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close panel"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-6 py-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search streams…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 transition focus:border-flu-pink focus:outline-none focus:ring-2 focus:ring-flu-pink/20"
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {selected.size} stream{selected.size === 1 ? '' : 's'} selected
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Loading streams…
            </p>
          )}

          {!isLoading && loadError && <p className="text-sm text-red-600">{loadError}</p>}

          {!isLoading && !loadError && items.length === 0 && (
            <p className="text-sm text-gray-400">No streams found.</p>
          )}

          {!isLoading && !loadError && items.length > 0 && (
            <ul className="space-y-1">
              {items.map((stream) => (
                <li key={stream.id}>
                  <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-gray-50">
                    <span className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(stream.id)}
                        onChange={() => toggle(stream.id)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-flu-pink focus:ring-flu-pink/40"
                      />
                      <span className="truncate text-sm text-gray-900">{stream.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">{stream.server_name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isLoading && !loadError && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Prev
            </button>
            <span className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="border-t border-gray-200 px-6 py-4">
          {saveError && <p className="mb-2 text-xs text-red-600">{saveError}</p>}
          {saved && <p className="mb-2 text-xs text-green-600">Saved.</p>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-full bg-flu-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-flu-pink/30 transition hover:bg-flu-pink-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
