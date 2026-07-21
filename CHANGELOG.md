# Changelog

All notable changes to this backend are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); this project doesn't cut versioned releases yet, so everything lives under `[Unreleased]`.

## [Unreleased]

### Added
- Auth API: `POST /auth/register`, `/login`, `/refresh`, `/logout`, `GET /auth/me`. JWT access tokens + httpOnly `refresh_token` cookie, bcrypt password hashing, role-based access control (`admin`/`user`) via `@Roles()` + `RolesGuard`.
- Customers CRUD (`/api/v1/customers`) — any authenticated user. Search/status filter/pagination on the list endpoint; phone and username uniqueness enforced.
- `customers.username`/`customers.password_hash`: required on create, optional on update (blank password leaves it unchanged). Password is bcrypt-hashed the same way as `users.password_hash` (`select: false` + `@Exclude()`, never returned by the API) — unlike Flussonic server credentials, nothing needs the plaintext back.
- Flussonic servers CRUD (`/api/v1/flussonic-servers`) — admin only. API credentials (`api_password`, derived `api_access_token`) encrypted at rest with AES-256-GCM.
- Flussonic server stats (`/api/v1/flussonic-servers/:id/stats`): manual sample recording, plus a real integration (`POST .../stats/sync`) that polls the server's actual `config/stats` endpoint and records the result. `POST /flussonic-servers/sync-all` syncs every server in one call, tolerating individual failures.
- Soft delete for `customers` and `flussonic_servers` — `DELETE` sets `status: 'deleted'` instead of removing the row; every list/get excludes deleted rows, and `status: 'deleted'` can't be set directly through create/update.
- Swagger/OpenAPI docs at `/docs` (`/docs-json` for the raw spec), generated via the `@nestjs/swagger` CLI plugin — schemas are inferred from DTOs and `class-validator` decorators automatically.
- Seed script (`npm run seed`) for local test accounts.
- Flussonic streams CRUD (`/api/v1/flussonic-servers/:serverId/streams`) — admin only, nested under a server. Create/update `PUT` the exact Flussonic payload (`name`, `inputs`, `protocols`, optional `on_play`/`on_publish`, etc.) to that server's real `/streams/urlencode(name)` endpoint, then cache the result in `flussonic_streams` (`flussonic_server_id`, `ingest_domain`, `config_json`, `status`, `created_at`/`updated_at`/`deleted_at`); delete calls the real `DELETE` endpoint before soft-deleting locally. `name` is immutable after creation (it's baked into the URL) and unique per server.

### Changed
- Renamed the `NODE_ENV` env var to `APP_ENV` (kept distinct from the Node-ecosystem-standard variable other tooling may read); added `APP_NAME` (used in the Swagger doc title, matches the frontend's `NEXT_PUBLIC_APP_NAME`).
- `created_at`/`updated_at` (and other timestamp-like columns) moved from MySQL `DATETIME`/`TIMESTAMP` to `BIGINT UNSIGNED` UTC unix seconds across every table, maintained by the app via `@BeforeInsert`/`@BeforeUpdate` hooks (`common/utils/unix-timestamp.util.ts`) since MySQL can't auto-populate a plain bigint.
- `flussonic_servers.api_access_token` is now derived automatically from `api_username`/`api_password` (`base64("username:password")`, Flussonic's own bearer-token scheme) on every create/update, rather than being a client-supplied field.
- `flussonic_servers` now caches `last_total_clients`/`last_uptime_seconds` from the most recent successful sync, so the list endpoint can surface them without querying `flussonic_server_stats`.
- Every server-to-server call (`config/stats` sync) authenticates with `Authorization: Bearer <api_access_token>` unconditionally (previously fell back to HTTP Basic when no token was set).
- Extracted `buildFlussonicApiUrl` (`flussonic-servers/utils/flussonic-api-url.util.ts`) out of the stats sync's URL builder so streams can reuse the same SSL/domain/port rule for a different path suffix (`streams/{name}` vs `config/stats`).

### Fixed
- The Flussonic access-token separator was originally `/` (`base64("user/pass")`); corrected to `:` (the real scheme, same encoding as HTTP Basic) and backfilled onto existing rows via a data migration (`FixFlussonicAccessTokenSeparator*`).
