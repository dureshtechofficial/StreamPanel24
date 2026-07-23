# Changelog (project overview)

High-level, cross-app summary. For full detail, see [`backend/CHANGELOG.md`](backend/CHANGELOG.md) and [`frontend/CHANGELOG.md`](frontend/CHANGELOG.md) — each app versions independently.

## [Unreleased]

### Added
- User registration/login (JWT access + httpOnly refresh cookie), with `admin`/`user` role-based access control.
- Customer management: full CRUD with search/filter/pagination, usable by any logged-in user.
- Flussonic server management: full CRUD (admin-only), encrypted API credentials, and a real integration that syncs each server's live `config/stats` (individually or all at once) into a stats history log.
- Soft delete across `customers` and `flussonic_servers` — rows are never physically removed, only marked.
- Swagger/OpenAPI docs for the backend API at `/docs`.
- A Flussonic-inspired visual theme across the frontend (dark navy nav, gradient auth screens, pink accent).

### Changed
- All timestamp columns moved from MySQL `DATETIME`/`TIMESTAMP` to UTC unix-seconds integers, maintained by the application.
- Flussonic server API access tokens are derived automatically from username/password rather than being entered manually.

### Fixed
- The Flussonic access-token encoding used the wrong separator (`/` instead of `:`) in an early implementation; corrected and backfilled onto existing data.
