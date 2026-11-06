# TI 26 Kelas A — Universitas Lampung

Responsive class schedule prototype for TI 26 Kelas A, Universitas Lampung.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

For server-backed schedules locally, create a private `.env` using `.env.example`, apply `database/schema.sql` to your Neon database, then start Vite. Its local-only middleware exposes the same API routes used by Vercel. Without server configuration the page clearly indicates that example schedule data is shown and admin edits are unavailable.

## Environment variables

Copy `.env.example` to `.env` locally, or set these values as server-only environment variables in Vercel:

- `DATABASE_URL`: Neon Postgres connection string.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD`: the single admin account. Use a unique password of at least 12 characters.
- `SESSION_SECRET`: at least 32 random characters used to sign sessions. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.

Never prefix secrets with `VITE_`; Vite exposes `VITE_*` variables in browser code. `.env` files are ignored by Git.

## Database and deployment

1. Create a Neon Postgres database and execute [`database/schema.sql`](./database/schema.sql) in its SQL editor. This creates the schedule, login-throttling, and audit tables and inserts the initial class schedule.
2. Set `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET` in the Vercel project's server environment settings. Do not commit credentials.
3. Deploy the project to Vercel. The `api/` functions serve schedules and admin login/session/logout; the public schedule is read-only, while create/update/delete require the admin session.

The admin session is an HTTP-only, same-site cookie with an eight-hour expiry. Login attempts are limited in the database, writes verify same-origin requests, schedule fields and conflicts are checked again on the server, and schedule changes are recorded in `admin_audit_log`. Course schedule edits are shared through Postgres rather than browser storage.

## Features

- The default schedule is based on the timetable shared for TI 26 Kelas A (20 SKS).
- Daily, weekly, and list views support navigation between weeks; the initial schedule no longer includes the Saturday practical classes.
- Calendar dates, the next-class preview, countdown, and calendar export use the `Asia/Jakarta` time zone and synchronize against the same-origin server's HTTP `Date` header. The clock resynchronizes every five minutes and after a tab resumes; if the server is unreachable, the UI explicitly reports that it is using device time.
- Search, group filters, and `.ics` export.
- Server-backed admin controls to add, edit (including SKS), and delete a class schedule. The server validates fields and schedule conflicts; administrators must sign in.
- Academic calendar for Universitas Lampung's 2026/2027 year, grouped by odd, even, and short semesters and transcribed from the second page of the supplied official calendar.
- Input validation, limits on editable fields, and escaping of calendar text.
- Content Security Policy and browser security headers in local/preview and Vercel configuration. The Vite development CSP allows its React-refresh inline preamble; the Vercel production CSP is stricter.
- An interactive Canvas 2D gold thread with custom smooth 2D noise, spring-based pointer response, reduced-motion support, and a lighter mobile configuration. Framer Motion powers the headline, feature reveals, countdown, and CTA transition. The landing page also includes a daily schedule preview with a change-feed example and a closing schedule CTA.
- A full-width responsive landing footer with developer credit for `xyyuzu`.
- Reduced-motion support and keyboard-focus styling.
- Responsive layouts for desktop, tablet, and 320px+ mobile screens, with an accessible collapsible mobile navigation menu.

## Security scope

Admin access is a single account configured only in the server environment; there is no public registration or invitation-code flow. Session signing, HTTP-only cookies, origin checks, database-backed login throttling, server-side validation, parameterized SQL, and schedule audit records are implemented. Keep dependencies and server secrets private and rotate the admin password/session secret if exposed.

Run checks with `npm test`, `npm run lint`, and `npm run build`.
