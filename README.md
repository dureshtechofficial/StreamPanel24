# Frontend — Next.js Auth Demo

Registration/login UI for the [backend](../backend) auth API, built with Next.js App Router, TypeScript, and Tailwind CSS.

## Prerequisites

- Node.js 20+
- The backend running (see `../backend/README.md`) — this app only talks to it over HTTP, it never touches the database directly.

## Setup

```bash
npm install
cp .env.example .env.local
```

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API, e.g. `http://localhost:3001/api/v1` |

## Running

```bash
npm run dev     # dev server on http://localhost:3000
npm run build
npm run start   # serve the production build
```

## Pages

- `/` — redirects to `/dashboard` or `/login` depending on session state.
- `/register` — name/email/password form with client-side validation and field-level errors from the API.
- `/login` — email/password form; on success redirects to `/dashboard`.
- `/dashboard` — protected route wrapped in `<ProtectedRoute>`; shows the current user and a logout button.
- `/dashboard/customers` — full CRUD (search, filter, paginate, add/edit slide-over, delete-confirm) for any logged-in user.
- `/dashboard/servers` — same CRUD pattern for Flussonic servers, but admin-only: the nav item is hidden for non-admins and the page itself shows an "Access restricted" notice if visited directly, mirroring the backend's `@Roles(UserRole.ADMIN)` guard.

## How auth state works

- `src/lib/auth-context.tsx` — `AuthProvider` holds `user` and `accessToken` in React state (never in `localStorage`/`sessionStorage`). On mount it silently calls `POST /auth/refresh` (which relies on the httpOnly refresh cookie) to restore a session across page reloads. Exposes `login()`, `register()`, and `logout()`.
- `src/lib/token-store.ts` — a small in-memory singleton the low-level API client reads the current access token from, so `api-client.ts` doesn't need to import React.
- `src/lib/api-client.ts` — wraps `fetch`, always sends `credentials: 'include'` so the refresh cookie travels with requests, attaches `Authorization: Bearer <accessToken>`, and on a `401` transparently calls the refresh handler and retries the request once.
- `src/components/protected-route.tsx` — client-side wrapper that redirects to `/login` once the initial silent refresh has finished and there's still no user. (There's no Next.js `proxy`/middleware gate: the refresh token is an httpOnly cookie the client can't read, and verifying it needs the backend anyway, so the real check happens through `AuthProvider`.)

## Notes

- Field-level errors on the register form are derived from the backend's `{ statusCode, message, error }` shape — `message` is an array of validation strings, bucketed by field name in `src/lib/form-errors.ts`.
- CORS/cookies mean this app must be served from the exact origin the backend's `FRONTEND_ORIGIN` env var allows.
