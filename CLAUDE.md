# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run start:dev` — dev server with watch, on `PORT` (default 3001), routes under `/api/v1`
- `npm run build` / `npm run start:prod` — production build + run
- `npm run lint` — eslint --fix
- `npm run test` — jest unit tests; `npx jest path/to/file.spec.ts` for a single file
- `npm run test:e2e` / `npm run test:cov` — e2e / coverage
- `npm run migration:run` / `npm run migration:revert` — apply/undo TypeORM migrations against `DB_*` env vars
- `npm run migration:generate -- src/database/migrations/Name` — diff entities vs DB schema
- `npm run seed` — seeds `admin@example.com` / `user@example.com` (password `ChangeMe123!`), skips users that already exist

Requires MySQL 8.0.13+ (the `users` migration's `id` column uses an `UUID()` expression default, which needs that version) and a `.env` copied from `.env.example`.

## Architecture

Everything auth-related lives under `src/auth/` plus `src/users/`.

- **Two Passport strategies, two guards**: `jwt-access` (`strategies/jwt-access.strategy.ts`) reads `Authorization: Bearer`; `jwt-refresh` (`strategies/jwt-refresh.strategy.ts`) reads the token from the `refresh_token` **cookie**, not a header, via a custom extractor. `JwtAccessGuard` / `JwtRefreshGuard` (`guards/`) wrap them for `@UseGuards`.
- **Refresh tokens are httpOnly cookies, never JSON**. `auth/utils/cookie.util.ts` sets/clears them, scoped to `path: /api/v1/auth` so the cookie isn't sent on unrelated routes. `POST /auth/refresh` rotates both the access token and the refresh cookie on every call (sliding session — there's no refresh-token blacklist or DB-backed revocation).
- **RBAC is decorator-driven and forward-compatible**: `UserRole` enum (`users/enums/user-role.enum.ts`, currently `admin`/`user`) + `@Roles(...)` decorator + `RolesGuard` (`auth/decorators/roles.decorator.ts`, `auth/guards/roles.guard.ts`) read `request.user.role`, populated by whichever JWT guard ran first. Adding a role is just adding an enum value — no guard changes needed.
- **Password hash never leaves the service layer**: `User.password_hash` (`users/entities/user.entity.ts`) has `select: false` (TypeORM excludes it from default queries) *and* `@Exclude()` (class-transformer strips it if it's ever loaded), enforced globally via `ClassSerializerInterceptor` in `main.ts`. `UsersService.findByEmailWithPassword()` is the one place that explicitly `.addSelect()`s it, used only for login.
- **Errors** all funnel through `common/filters/http-exception.filter.ts` into `{ statusCode, message, error, path, timestamp }`. `message` is a string array for validation errors, from the global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true` — unknown body fields are rejected, not silently dropped).
- **Config** is centralized in `config/configuration.ts` (nested object) with `config/env.validation.ts` (class-validator) enforced via `ConfigModule.forRoot({ validate })` in `app.module.ts` — the app won't boot on missing/invalid env vars.
- **Two separate DB connections by design**: `database/data-source.ts` is the `DataSource` used by the TypeORM CLI (migrations/seed scripts run outside Nest's DI container). `app.module.ts`'s `TypeOrmModule.forRootAsync` is the runtime connection used by the app itself. Both list entities manually — keep them in sync if the entity list changes.
- Login/register are throttled per-IP (`@Throttle` in `auth.controller.ts`) on top of the global `ThrottlerModule` default, via `@nestjs/throttler`.
- **`created_at`/`updated_at` are UTC unix seconds, not MySQL DATETIME/TIMESTAMP**, across every table (`users`, `customers`, `flussonic_servers`, `flussonic_server_stats`). Columns are `BIGINT UNSIGNED` with `unixTimestampTransformer` (`common/utils/unix-timestamp.util.ts`) converting MySQL's string bigint to a plain JS `number`. Since MySQL can't auto-populate a plain bigint the way it does `DEFAULT CURRENT_TIMESTAMP`, every entity sets these itself via `@BeforeInsert`/`@BeforeUpdate` hooks — a new entity needs the same two hooks (copy the pattern from `users/entities/user.entity.ts`), not `@CreateDateColumn`/`@UpdateDateColumn`. `users`/`customers` were retroactively converted from DATETIME via `ConvertUsersTimestampsToUnix*`/`ConvertCustomersTimestampsToUnix*` migrations (add→`UNIX_TIMESTAMP()`-populate→drop-and-rename).
- **`flussonic_servers` CRUD is admin-only** (`src/flussonic-servers/`): `@UseGuards(JwtAccessGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` on the whole controller — unlike `customers`, which any authenticated user can manage. `flussonic_server_stats` still has no service/controller (schema only).
- **`api_password_enc`/`api_access_token` are reversibly encrypted, not hashed**: unlike `User.password_hash` (bcrypt, one-way), the app needs to send these back out to the real Flussonic API later, so they're AES-256-GCM encrypted via `common/utils/encryption.util.ts` (`encryptSecret`/`decryptSecret`) using `CREDENTIALS_ENCRYPTION_KEY` (64-char hex, `openssl rand -hex 32`) — a required env var, validated in `env.validation.ts`. They're still `@Exclude()`d from API responses like the password hash; nothing currently calls `decryptSecret` since there's no outbound Flussonic API integration yet.
