# Backend — NestJS Auth API

REST API for user registration/login plus customer and Flussonic-server management, backed by MySQL via TypeORM. JWT access tokens + httpOnly-cookie refresh tokens.

## Stack

- NestJS + TypeScript
- TypeORM + MySQL (`mysql2` driver)
- Passport (`jwt-access` and `jwt-refresh` strategies)
- bcrypt for password hashing
- `@nestjs/throttler` for rate limiting
- `@nestjs/config` with `class-validator`-backed env validation

## Prerequisites

- Node.js 20+
- A running MySQL 8.x server (MySQL 8.0.13+ is required — the users table's `id` column default uses the `UUID()` expression default, which needs that version)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with your MySQL credentials and JWT secrets. **Never use the example secrets in production** — generate strong random values, e.g. `openssl rand -hex 32`.

### Environment variables

| Variable | Description |
| --- | --- |
| `APP_ENV` | `development` / `production` / `test` — controls TypeORM query logging and the refresh cookie's `secure` flag. **Not** `NODE_ENV` (kept distinct from the Node-ecosystem-standard variable other tools may read). |
| `APP_NAME` | Product name, e.g. `Flus24 Manager` — used in the Swagger doc title |
| `PORT` | Port the API listens on (default `3001`) |
| `API_PREFIX` | Global route prefix (default `api/v1`) |
| `FRONTEND_ORIGIN` | Exact origin allowed by CORS, e.g. `http://localhost:3000` |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | MySQL connection |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN` | Access token secret + lifetime (e.g. `15m`) |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | Refresh token secret + lifetime (e.g. `7d`) — **use a different secret than the access token** |
| `BCRYPT_SALT_ROUNDS` | 10–14, default `12` |
| `CREDENTIALS_ENCRYPTION_KEY` | 64-char hex (32 bytes), e.g. `openssl rand -hex 32` — used to reversibly encrypt Flussonic server API passwords/tokens |
| `IPWHOIS_API_URL` | Optional, defaults to `https://ipwho.is` — IP geolocation/ISP lookup used to enrich stream session records |

### Database

Create the database (schema is managed by migrations, not `synchronize`):

```sql
CREATE DATABASE project7_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run all migrations (creates `users`, `customers`, `flussonic_servers`, `flussonic_server_stats`, `flussonic_streams`, and applies the unix-timestamp/soft-delete/access-token/username-password schema changes that came later):

```bash
npm run migration:run
```

Seed two accounts for local testing (skips any that already exist):

```bash
npm run seed
```

This creates:
- `admin@example.com` / `ChangeMe123!` (role: `admin`)
- `user@example.com` / `ChangeMe123!` (role: `user`)

Change these passwords or delete the seeded rows before deploying anywhere real.

## Running

```bash
npm run start:dev   # watch mode
npm run start       # single run
npm run build && npm run start:prod
```

The API is served under `http://localhost:<PORT>/<API_PREFIX>`, e.g. `http://localhost:3001/api/v1`.

## API docs (Swagger)

Interactive docs (Swagger UI) are served at `http://localhost:<PORT>/docs` (outside the `API_PREFIX`, e.g. `http://localhost:3001/docs`), with the raw OpenAPI JSON at `/docs-json`. Click **Authorize** and paste an access token (from `POST /auth/login`) to try protected endpoints from the UI.

Request/response schemas are generated automatically at compile time by the `@nestjs/swagger` CLI plugin (`nest-cli.json` → `compilerOptions.plugins`) — it reads DTO property types and `class-validator` decorators (`@IsEmail`, `@MinLength`, etc.) directly, so schemas stay in sync with the DTOs without hand-written `@ApiProperty()` decorators. Only `@ApiTags`/`@ApiOperation`/`@ApiBearerAuth` are added manually, on controllers, for grouping and the auth padlock.

## Endpoints

All under `/api/v1/auth`:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/register` | — | Rate-limited (5/min). Creates a user; does not log in. |
| POST | `/login` | — | Rate-limited (10/min). Returns `{ user, accessToken }`, sets `refresh_token` httpOnly cookie. |
| POST | `/refresh` | refresh cookie | Verifies the `refresh_token` cookie, issues a new access token and rotates the refresh cookie. |
| POST | `/logout` | — | Clears the `refresh_token` cookie. |
| GET | `/me` | `Authorization: Bearer <accessToken>` | Returns the current user. |

`/api/v1/customers` — full CRUD (`GET`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id`), any authenticated user. Supports `?search=&status=&page=&limit=` on the list endpoint.

`/api/v1/flussonic-servers` — full CRUD, same shape as customers, but **admin role only** (`@Roles(UserRole.ADMIN)`). `api_password` is required on create (write-only, encrypted at rest). `api_access_token` is **not** a request field — it's derived automatically from `api_username`/`api_password` (`base64("username:password")`, Flussonic's own bearer-token scheme) and recomputed on every create/update. Never returned by the API.

`/api/v1/flussonic-servers/:serverId/stats` — `GET` (paginated, newest first) and `POST` to record a metrics sample manually. Admin-only, 404s if the server doesn't exist.

`/api/v1/flussonic-servers/:serverId/stats/sync` — `POST`, no body. Fetches the server's real `config/stats` endpoint (`https://{domain}:443/...` if `use_ssl`, else `http://{hostname}:{port}/...`, path `{api_base_path}/{api_version_tag}/config/stats`), authenticating with `Authorization: Bearer <api_access_token>`. Stores the result as a new sample (full raw JSON kept in `raw_response` for fields we don't have dedicated columns for), and updates the server's `flussonic_version`/`status`. Returns 502 (and marks the server `unreachable`) if the fetch fails.

`/api/v1/flussonic-servers/sync-all` — `POST`, no body. Syncs every non-deleted server one at a time; one server failing doesn't stop the rest. Returns `{ total, succeeded, failed, results: [{ serverId, name, ok, error? }] }`.

`/api/v1/flussonic-servers/:serverId/streams` — full CRUD, admin-only, nested under a server. `POST`/`PATCH` build the exact Flussonic stream config (`name`, `comment`, `title`, `static`, `disabled`, `inputs`, `retry_limit`, `protocols`, optional `on_play`/`on_publish`) and `PUT` it to that server's real `{api_base_path}/{api_version_tag}/streams/urlencode(name)` endpoint (same SSL/domain/port rule as stats sync) before caching the result locally in `flussonic_streams`. `name` is required and unique per server; changing it on `PATCH` renames the stream (`PUT`s the new name, then `DELETE`s the old one — see `check-name` below for the same-name safety check this and create share). `DELETE` calls the real Flussonic `DELETE` endpoint (tolerating an already-404 upstream) before soft-deleting locally.

`/api/v1/flussonic-servers/:serverId/streams/check-name?name=...` — `GET`, returns `{ existsInDb, existsOnServer }`. `existsOnServer` is a live check against the real Flussonic server, since a stream can exist there without a local row (created outside this app, or the cache drifted). `POST`/`PATCH` reject an `existsInDb` name outright (409, no override); an `existsOnServer`-only name also 409s unless the request sets `confirmOverwrite: true`.

`/api/v1/flussonic-servers/:serverId/streams/sync` — `POST`, no body. Pulls the server's real `GET streams` list (cursor-paginated via `next`, followed to exhaustion) and stores each stream's raw entry in `live_stats_json` (live bitrate, client count, media tracks, per-input health, etc. — kept verbatim, not modeled column-by-column). A stream found upstream with no matching local row is imported using its `config_on_disk` as the seed config. Returns `{ total, created, updated }`.

`/api/v1/flussonic-servers/:serverId/sessions` — `GET` (paginated, newest-updated first, `?search=` matches stream name/IP/country) and `POST .../sessions/sync` (no body). Sync pulls the server's real `GET sessions` (cursor-paginated, one flat list covering every stream on the server) and upserts each by its Flussonic session id into `flussonic_stream_sessions` — one row per real session, matched to a local stream by name. A brand-new session's IP is looked up via `IPWHOIS_API_URL` and the full response stored in `ipwhois_json` (best-effort; a failed lookup doesn't fail the sync). Sessions have no server id of their own, so listing attributes them to a server via the matched stream's `flussonic_server_id`.

`DELETE` on `customers`/`flussonic-servers` never removes a row — it's a soft delete that sets `status: 'deleted'`. Deleted rows are excluded from every list/get, and you can't set `status: 'deleted'` directly through create/update (400).

Errors always come back as `{ statusCode, message, error, path, timestamp }`. Every resource's `created_at`/`updated_at` is a UTC unix timestamp in seconds (a plain number), not an ISO date string.

## Security notes

- Passwords are hashed with bcrypt (cost from `BCRYPT_SALT_ROUNDS`) and the `password_hash` column is never serialized in API responses (`select: false` on the column plus `@Exclude()` + a global `ClassSerializerInterceptor`).
- The refresh token is only ever set as an `httpOnly`, `sameSite=strict` cookie scoped to `/api/v1/auth`, and is never returned in a JSON body — the frontend cannot read it from JS.
- CORS only allows the single configured `FRONTEND_ORIGIN`, with `credentials: true`.
- `ValidationPipe` runs globally with `whitelist` + `forbidNonWhitelisted`, so unexpected body fields are rejected rather than silently dropped or mass-assigned.
- Login/register are throttled per-IP on top of the global throttler to slow brute-force attempts.
- Roles (`admin` / `user`) are enforced with a `@Roles()` decorator + `RolesGuard` that reads `request.user.role`, set up so more roles can be added to the `UserRole` enum later without changing the guard.
- Flussonic server API credentials are AES-256-GCM encrypted (`CREDENTIALS_ENCRYPTION_KEY`), not hashed — bcrypt is one-way and unsuitable here since the app needs the plaintext back to authenticate against the real Flussonic API later.

## Migrations

```bash
npm run migration:generate -- src/database/migrations/SomeName   # diff entities vs DB
npm run migration:create -- src/database/migrations/SomeName     # empty migration file
npm run migration:run
npm run migration:revert
```
