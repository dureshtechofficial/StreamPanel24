# Changelog

All notable changes to this frontend are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); this project doesn't cut versioned releases yet, so everything lives under `[Unreleased]`.

## [Unreleased]

### Added
- `/register` and `/login` pages with client-side validation and field-level errors surfaced from the backend.
- `AuthProvider` (`lib/auth-context.tsx`): in-memory access token + user state, silent session restore via `/auth/refresh` on load, `login()`/`register()`/`logout()`.
- `/dashboard` protected route, plus a `ProtectedRoute` wrapper and a `DashboardShell` (sidebar + topbar) used by every authenticated page.
- `/dashboard/customers` — searchable/filterable/paginated table with a slide-over create/edit form and delete confirmation, available to any logged-in user. The form now includes username/password fields (password required on create, optional on edit — blank leaves it unchanged).
- `/dashboard/servers` — same CRUD pattern for Flussonic servers, gated to admins (nav item hidden, page shows "Access restricted" for non-admins). Full-width table with live status, latest client count, and uptime. "Sync all" button syncs every server and shows a per-server result summary.
- `/dashboard/servers/[id]/stats` — paginated stats log for one server, with a "Sync" button that triggers the backend's real Flussonic `config/stats` integration.
- `/dashboard/servers/[id]/streams` — full CRUD for a server's streams (reached via the broadcast icon on the servers table), matching Flussonic's real stream config shape: inputs (dynamic add/remove rows), all 18 protocol flags, and optional `on_play`/`on_publish` auth-hook sections that only appear once toggled on. Boolean fields use a reusable switch component (`components/toggle.tsx`) instead of checkboxes. `name` is read-only once a stream is created (it's baked into the Flussonic API URL).
- Flussonic-inspired visual theme (dark navy nav, blue→violet gradient auth screens, pink accent) via CSS custom properties in `globals.css`.

### Changed
- Stream form: the free-typed `name` field is now built from two inputs — "Application name" (defaults to `live`) and "Key" — shown as a read-only computed `application/key` field; both are disabled after creation like `name` was. Inputs no longer have a manually-typed priority — reorder them with up/down buttons instead, and priority is always derived from position. New defaults: `retry_limit` 20, input `source_timeout` 30, `hls`/`player`/`rtmp`/`srt` protocols on by default, `on_play`/`on_publish` `max_sessions` default to 5 and stay mirrored — changing either one updates both.
- Reskinned login/register/dashboard from a plain gray theme to the Flussonic-inspired theme; sidebar nav switched from a single hardcoded active item to real routing with active-path highlighting.
- `User`/`Customer`/`FlussonicServer` timestamp fields (`created_at`/`updated_at`) changed from ISO date strings to unix-seconds numbers, matching the backend's move to unix timestamps; date formatting updated accordingly.
- Removed the manual "API access token" field from the server form — it's derived automatically by the backend from username/password now.
- The server stats page's "Add sample" button was replaced with "Sync", once the real Flussonic integration landed; the stats table gained Memory/Clients/Scheduler load/Status/Version columns to match.
- Added `NEXT_PUBLIC_APP_NAME` env var and `lib/use-page-title.ts#usePageTitle()`, called on every page to set the browser tab title to `"{APP_NAME} | {page name}"`; the root layout's static `metadata.title` now defaults to `APP_NAME` instead of a hardcoded string.

### Fixed
- A `react-hooks/set-state-in-effect` lint violation in list-fetching effects, resolved via key-based remounting for form resets rather than reset-on-open effects (and a justified inline disable for the one genuine fetch-on-filter-change effect).
- `/login`/`/register` tab titles were getting silently reset back to the bare app name a few milliseconds after mount — Next's root-layout `<title>` is React-reconciled, and `AuthProvider`'s initial `isLoading` flip (once the silent `/auth/refresh` settles) re-renders and stomps a plain `document.title` assignment made before that. `usePageTitle` now uses a `MutationObserver` on the `<title>` element to re-apply the desired title whenever anything else changes it.
