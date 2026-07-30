# Stream Panel 24

A full-stack demo app: user auth, customer management, and Flussonic media-server management/monitoring .

- **`backend/`** — NestJS + TypeORM + MySQL REST API. See [`backend/README.md`](backend/README.md).
- **`frontend/`** — Next.js (App Router) + Tailwind CSS UI. See [`frontend/README.md`](frontend/README.md).

These are two independent apps/repos (each with its own `.git`, `README.md`, and `CHANGELOG.md`) that talk to each other only over HTTP — the frontend calls the backend's REST API and never touches the database directly.

## Quick start

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # fill in MySQL creds, JWT secrets, CREDENTIALS_ENCRYPTION_KEY
npm run migration:run
npm run seed                 # optional: seeds admin@example.com / user@example.com
npm run start:dev            # http://localhost:3001/api/v1

# 2. Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:3000
```

Then open `http://localhost:3000` — it redirects to `/login`. Seeded accounts (if you ran `npm run seed`): `admin@example.com` / `user@example.com`, password `ChangeMe123!`.

Interactive API docs (Swagger UI) are at `http://localhost:3001/docs` once the backend is running.

## What's here

- **Auth** — JWT access tokens (in-memory on the frontend, never `localStorage`) + an httpOnly refresh cookie, with silent session restore on page load.
- **RBAC** — `admin`/`user` roles, enforced with a reusable `@Roles()` decorator + guard on the backend and mirrored in the frontend nav/route gating.
- **Customers** — full CRUD, searchable/filterable/paginated, available to any logged-in user.
- **Flussonic servers** — full CRUD (admin-only), with encrypted API credentials and a Bearer token derived automatically from the server's username/password.
- **Flussonic server stats** — a real integration that polls each server's own `config/stats` endpoint and records the result; a single "Sync all" button syncs every registered server.
- **Soft delete** — `customers` and `flussonic_servers` are never physically deleted; `DELETE` just marks a row's status, and every read path excludes it.

For architecture notes aimed at future development (not just usage), see [`CLAUDE.md`](CLAUDE.md), `backend/CLAUDE.md`, and `frontend/CLAUDE.md`.

## Changelog

Each app tracks its own history: [`backend/CHANGELOG.md`](backend/CHANGELOG.md), [`frontend/CHANGELOG.md`](frontend/CHANGELOG.md).
