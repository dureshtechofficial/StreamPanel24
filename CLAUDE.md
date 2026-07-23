# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This directory is **not** a git repo itself — it holds two independent app repos, each with their own `.git` and their own `CLAUDE.md`:

- `backend/` — NestJS + TypeORM + MySQL REST API. See `backend/CLAUDE.md`.
- `frontend/` — Next.js App Router UI. See `frontend/CLAUDE.md` (and `frontend/AGENTS.md` — this app runs Next.js 16, which has breaking changes from older training data).

They communicate only over HTTP: the frontend calls the backend's `/api/v1` routes (`NEXT_PUBLIC_API_URL`) and never touches the database directly. Work on each app independently — a change in one only requires touching the other when the API contract itself changes (DTO shapes, route paths, cookie/header names).

## Quick reference

| | Backend | Frontend |
|---|---|---|
| Dev server | `cd backend && npm run start:dev` (port 3001) | `cd frontend && npm run dev` (port 3000) |
| Build | `npm run build` | `npm run build` |
| Lint | `npm run lint` | `npm run lint` |
| Tests | `npm run test` / `npm run test:e2e` | none configured |
| Env setup | `cp .env.example .env`, then `npm run migration:run && npm run seed` | `cp .env.example .env.local` |

Seeded accounts (from `backend`'s seed script): `admin@example.com` / `user@example.com`, password `ChangeMe123!`.

Full architecture notes (auth flow, RBAC, token handling, UI theme system) live in each app's own `CLAUDE.md` — read those before making non-trivial changes.
