# TI 26 Kelas A — Universitas Lampung

Responsive class schedule prototype for TI 26 Kelas A, Universitas Lampung.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`).

## Environment variables

The current frontend does not require a `.env` file. Local environment files are ignored by Git; `.env.example` is a safe, non-secret template.

Vite embeds variables prefixed with `VITE_` into browser-delivered code. Treat every such value as public: do not put passwords, API secrets, private keys, database credentials, or private tokens in `VITE_*` variables. Secret values must stay in a server-side environment, which this frontend-only project does not currently have.

## Features

- The default schedule is based on the timetable shared for TI 26 Kelas A (20 SKS).
- Daily, weekly, and list views support navigation between weeks; the initial schedule no longer includes the Saturday practical classes.
- Calendar dates, the next-class preview, countdown, and calendar export use the `Asia/Jakarta` time zone and synchronize against the same-origin server's HTTP `Date` header. The clock resynchronizes every five minutes and after a tab resumes; if the server is unreachable, the UI explicitly reports that it is using device time.
- Search, group filters, and `.ics` export.
- Local demo-admin controls to add, edit (including SKS), and delete a class schedule. Edits are checked for invalid fields and overlapping room/lecturer/group conflicts before saving.
- Input validation, limits on editable fields, and escaping of calendar text.
- Content Security Policy and browser security headers in local/preview and Vercel configuration. The Vite development CSP allows its React-refresh inline preamble; the Vercel production CSP is stricter.
- An interactive Canvas 2D gold thread with custom smooth 2D noise, spring-based pointer response, reduced-motion support, and a lighter mobile configuration. Framer Motion powers the headline, feature reveals, countdown, and CTA transition. The landing page also includes a daily schedule preview with a change-feed example and a closing schedule CTA.
- A full-width responsive landing footer with developer credit for `xyyuzu`.
- Reduced-motion support and keyboard-focus styling.
- Responsive layouts for desktop, tablet, and 320px+ mobile screens, with an accessible collapsible mobile navigation menu.

## Security status

This is still a frontend-only prototype. In development, the clearly labeled demo-admin controls are available for local UI testing only. Schedules are stored in the current browser and are not shared.

The PRD's server-side requirements are not implemented yet: invitation-code registration, password hashing, secure sessions, server-enforced roles, login rate limiting/lockouts, CSRF defenses for authenticated writes, parameterized database queries, audit logs, and API/request limits. Do not use the demo-admin controls or browser storage for real accounts or production administration. Those protections require a backend and database; frontend validation and security headers are not substitutes.

Run checks with `npm test`, `npm run lint`, and `npm run build`.
