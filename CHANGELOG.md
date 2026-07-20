# Changelog

All notable changes to this frontend are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); this project doesn't cut versioned releases yet, so everything lives under `[Unreleased]`.

## [Unreleased]

### Added
- `/register` and `/login` pages with client-side validation and field-level errors surfaced from the backend.
- `AuthProvider` (`lib/auth-context.tsx`): in-memory access token + user state, silent session restore via `/auth/refresh` on load, `login()`/`register()`/`logout()`.
- `/dashboard` protected route, plus a `ProtectedRoute` wrapper and a `DashboardShell` (sidebar + topbar) used by every authenticated page.
- `/dashboard/customers` — searchable/filterable/paginated table with a slide-over create/edit form and delete confirmation, available to any logged-in user.
- `/dashboard/servers` — same CRUD pattern for Flussonic servers, gated to admins (nav item hidden, page shows "Access restricted" for non-admins). Full-width table with live status, latest client count, and uptime. "Sync all" button syncs every server and shows a per-server result summary.
- `/dashboard/servers/[id]/stats` — paginated stats log for one server, with a "Sync" button that triggers the backend's real Flussonic `config/stats` integration.
- Flussonic-inspired visual theme (dark navy nav, blue→violet gradient auth screens, pink accent) via CSS custom properties in `globals.css`.

### Changed
- Reskinned login/register/dashboard from a plain gray theme to the Flussonic-inspired theme; sidebar nav switched from a single hardcoded active item to real routing with active-path highlighting.
- `User`/`Customer`/`FlussonicServer` timestamp fields (`created_at`/`updated_at`) changed from ISO date strings to unix-seconds numbers, matching the backend's move to unix timestamps; date formatting updated accordingly.
- Removed the manual "API access token" field from the server form — it's derived automatically by the backend from username/password now.
- The server stats page's "Add sample" button was replaced with "Sync", once the real Flussonic integration landed; the stats table gained Memory/Clients/Scheduler load/Status/Version columns to match.

### Fixed
- A `react-hooks/set-state-in-effect` lint violation in list-fetching effects, resolved via key-based remounting for form resets rather than reset-on-open effects (and a justified inline disable for the one genuine fetch-on-filter-change effect).
