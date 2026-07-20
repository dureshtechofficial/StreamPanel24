# Backend — NestJS Auth API

REST API for user registration and login, backed by MySQL via TypeORM. JWT access tokens + httpOnly-cookie refresh tokens.

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
| `NODE_ENV` | `development` / `production` / `test` |
| `PORT` | Port the API listens on (default `3001`) |
| `API_PREFIX` | Global route prefix (default `api/v1`) |
| `FRONTEND_ORIGIN` | Exact origin allowed by CORS, e.g. `http://localhost:3000` |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | MySQL connection |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN` | Access token secret + lifetime (e.g. `15m`) |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | Refresh token secret + lifetime (e.g. `7d`) — **use a different secret than the access token** |
| `BCRYPT_SALT_ROUNDS` | 10–14, default `12` |

### Database

Create the database (schema is managed by migrations, not `synchronize`):

```sql
CREATE DATABASE project7_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run the migration to create the `users` table:

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

## Endpoints

All under `/api/v1/auth`:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/register` | — | Rate-limited (5/min). Creates a user; does not log in. |
| POST | `/login` | — | Rate-limited (10/min). Returns `{ user, accessToken }`, sets `refresh_token` httpOnly cookie. |
| POST | `/refresh` | refresh cookie | Verifies the `refresh_token` cookie, issues a new access token and rotates the refresh cookie. |
| POST | `/logout` | — | Clears the `refresh_token` cookie. |
| GET | `/me` | `Authorization: Bearer <accessToken>` | Returns the current user. |

Errors always come back as `{ statusCode, message, error, path, timestamp }`.

## Security notes

- Passwords are hashed with bcrypt (cost from `BCRYPT_SALT_ROUNDS`) and the `password_hash` column is never serialized in API responses (`select: false` on the column plus `@Exclude()` + a global `ClassSerializerInterceptor`).
- The refresh token is only ever set as an `httpOnly`, `sameSite=strict` cookie scoped to `/api/v1/auth`, and is never returned in a JSON body — the frontend cannot read it from JS.
- CORS only allows the single configured `FRONTEND_ORIGIN`, with `credentials: true`.
- `ValidationPipe` runs globally with `whitelist` + `forbidNonWhitelisted`, so unexpected body fields are rejected rather than silently dropped or mass-assigned.
- Login/register are throttled per-IP on top of the global throttler to slow brute-force attempts.
- Roles (`admin` / `user`) are enforced with a `@Roles()` decorator + `RolesGuard` that reads `request.user.role`, set up so more roles can be added to the `UserRole` enum later without changing the guard.

## Migrations

```bash
npm run migration:generate -- src/database/migrations/SomeName   # diff entities vs DB
npm run migration:create -- src/database/migrations/SomeName     # empty migration file
npm run migration:run
npm run migration:revert
```
