# TI 26 Kelas A — Universitas Lampung

Responsive class schedule prototype for TI 26 Kelas A, Universitas Lampung.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`).

## Features

- The default schedule is based on the timetable shared for TI 26 Kelas A (20 SKS).
- Daily, weekly, and list views include Saturday classes.
- Dates, the next-class preview, and calendar export use the `Asia/Jakarta` time zone and the device's current clock; no internet time service is required. The device clock must itself be accurate.
- Search, group filters, and `.ics` export.
- Local demo-admin controls to add, edit (including SKS), and delete a class schedule. Edits are checked for invalid fields and overlapping room/lecturer/group conflicts before saving.
- Input validation, limits on editable fields, and escaping of calendar text.
- Content Security Policy and browser security headers in local/preview and Vercel configuration. The Vite development CSP allows its React-refresh inline preamble; the Vercel production CSP is stricter.
- A scroll-drawn gold thread, staged hero headline, subtle CTA shimmer, and feature-card reveal/glow; motion respects `prefers-reduced-motion`.
- Reduced-motion support and keyboard-focus styling.

## Security status

This is still a frontend-only prototype. In development, the clearly labeled demo-admin controls are available for local UI testing only. Schedules are stored in the current browser and are not shared.

The PRD's server-side requirements are not implemented yet: invitation-code registration, password hashing, secure sessions, server-enforced roles, login rate limiting/lockouts, CSRF defenses for authenticated writes, parameterized database queries, audit logs, and API/request limits. Do not use the demo-admin controls or browser storage for real accounts or production administration. Those protections require a backend and database; frontend validation and security headers are not substitutes.

Run checks with `npm test`, `npm run lint`, and `npm run build`.
