# TI 26 Kelas A — Universitas Lampung

Responsive class schedule prototype for TI 26 Kelas A, Universitas Lampung.

For an architecture overview, source map, and feature/API flow, see [CODEBASE.md](./CODEBASE.md).

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

For server-backed schedules, tasks, and ebook links locally, create a private `.env` using `.env.example`, apply the migrations in `supabase/migrations/` to your Supabase project in timestamp order, then start Vite. Its local-only middleware exposes the same API routes used by Vercel. Without server configuration, the schedule page indicates that example data is shown and admin edits are unavailable; personal workspace data requires a valid student session and database.

## Environment variables

Copy `.env.example` to `.env` locally, or set these values as server-only environment variables in Vercel:

- `SUPABASE_URL`: project URL from Supabase **Project Settings → API**.
- `SUPABASE_SERVICE_ROLE_KEY`: legacy `service_role` key or a Supabase secret API key from **Project Settings → API**. Never use the `anon`/publishable key here and never expose this value to the browser.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD`: the single admin account. Use a unique password of at least 12 characters.
- `SESSION_SECRET`: at least 32 random characters used to sign sessions. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.
- Optional browser client: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The URL and publishable key are public, but direct table access still requires explicit row-level security policies. Do not put service-role/secret keys in `VITE_*` variables.

Never prefix secrets with `VITE_`; Vite exposes `VITE_*` variables in browser code. `.env` files are ignored by Git.

The optional browser client at `src/lib/supabase.js` uses only the public publishable key and disables client-side session persistence because admin sessions are owned by the server API. It is not used for schedule reads or writes; those continue through the server API and service-role key. A successful app build alone does not verify Supabase connectivity.

## Supabase and deployment

1. Create a Supabase project.
2. In **SQL Editor**, run [`supabase/migrations/20261106160000_initial_schedule_backend.sql`](./supabase/migrations/20261106160000_initial_schedule_backend.sql). It creates the schedule, login-throttling, and audit tables, enables row-level security, restricts direct table access to `service_role`, installs atomic database functions, and inserts the initial class schedule.
3. If the initial migration is already applied, run only [`supabase/migrations/20261106230000_student_workspace.sql`](./supabase/migrations/20261106230000_student_workspace.sql). It creates private student accounts, personal tasks, and ebook-link tables with row-level security enabled.
4. Configure the required environment variables in the local `.env` and Vercel project settings. Keep `SUPABASE_SERVICE_ROLE_KEY` and all admin secrets server-side; never add a `VITE_` prefix.
5. Deploy the project to Vercel. The `api/` functions call Supabase's PostgREST API using server-only credentials. Public schedule reads are served by the API; schedule mutations and student workspace data require the respective admin or student session.

The admin session is an HTTP-only, same-site cookie with an eight-hour expiry. Login attempts are limited in the database, writes verify same-origin requests, schedule fields and conflicts are checked in both the API and an atomic database function, and schedule changes are recorded in `admin_audit_log`. Row-level security is enabled, and database functions are executable only by Supabase's `service_role`.

Admins create student usernames and initial passwords from the account panel on the Tugas/Rak Ebook pages. Passwords are stored as scrypt hashes. There is no self-registration, student password reset, or email-based recovery. Student task and ebook API requests scope every database operation to the signed-in student's ID; ebook records contain links only, not uploaded files.

## Features

- The default schedule is based on the timetable shared for TI 26 Kelas A (20 SKS).
- Daily, weekly, and list views support navigation between weeks; the initial schedule no longer includes the Saturday practical classes.
- Calendar dates, the next-class preview, countdown, and calendar export use the `Asia/Jakarta` time zone and synchronize against the same-origin server's HTTP `Date` header. The clock resynchronizes every five minutes and after a tab resumes; if the server is unreachable, the UI explicitly reports that it is using device time.
- Search, group filters, and `.ics` export.
- Server-backed admin controls to add, edit (including SKS), and delete a class schedule. The server validates fields and schedule conflicts; administrators must sign in.
- Academic calendar for Universitas Lampung's 2026/2027 year, grouped by odd, even, and short semesters and transcribed from the second page of the supplied official calendar.
- Personal task list with due dates and completion tracking, plus an ebook shelf for personal reading links.
- Input validation, limits on editable fields, and escaping of calendar text.
- Content Security Policy and browser security headers in local/preview and Vercel configuration. The Vite development CSP allows its React-refresh inline preamble; the Vercel production CSP is stricter.
- An interactive Canvas 2D gold thread with custom smooth 2D noise, spring-based pointer response, reduced-motion support, and a lighter mobile configuration. Framer Motion powers the headline, feature reveals, countdown, and CTA transition. The landing page also includes a daily schedule preview with a change-feed example and a closing schedule CTA.
- A full-width responsive landing footer with developer credit for `K7YZ`.
- Reduced-motion support and keyboard-focus styling.
- Responsive layouts for desktop, tablet, and 320px+ mobile screens, with an accessible collapsible mobile navigation menu.

## Security scope

Admin access is a single account configured only in the server environment; there is no public registration or invitation-code flow. Session signing, HTTP-only cookies, origin checks, database-backed login throttling, server-side validation, parameterized SQL, and schedule audit records are implemented. Keep dependencies and server secrets private and rotate the admin password/session secret if exposed.

Run checks with `npm test`, `npm run lint`, and `npm run build`.
