# Doctor Tracker — Clinic Management Portal (Frontend)

A role-based clinic management web app: practitioners and their schedules, patients, appointment booking with conflict handling, clinical visit notes, and an admin audit trail. Built with **Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 and TanStack Query**, on top of the [Doctor Tracker API](https://github.com/nafismuhymeen/doctor-tracker-backend) (Express 5, MongoDB).

> **Live demo:** [Live Link](https://doctor-tracker-frontend-lime.vercel.app) · **Demo login (read-only viewer):** email: viewer@doctortracker.dev password: admin123 
> All data is synthetic. This is a portfolio project and not a certified HIPAA-compliant system.

<!-- TODO: add 4–6 current screenshots here (dashboard, appointments calendar, booking dialog, visit form, audit log, dark mode). The old WhatsApp screenshots show the pre-expansion UI. -->

---

## Features

| Area | What it does |
|---|---|
| **Authentication** | Sign-in with httpOnly cookie sessions. Short-lived access token plus rotating refresh token handled transparently: concurrent requests share a single refresh (single-flight), multi-tab races are handled, and an expired session redirects to sign-in with a return URL (open-redirect safe). |
| **Roles (RBAC)** | `admin`, `staff`, `doctor`, `viewer`. A central `can(role, action, ctx)` map in `lib/permissions.ts` drives navigation, buttons, route guards and the command palette. The backend enforces the same rules; the UI only mirrors them. |
| **Doctors & schedules** | Directory with search and filters. Weekly working hours and slot length are edited per doctor with validation that matches the API (no overlapping shifts, hours must align to the slot length). Each doctor has an IANA timezone. |
| **Patients** | Registry with search, filters and assignment to a practitioner. Deleting a doctor requires reassigning their patients. |
| **Appointments** | Custom week / day / list calendar (no calendar library). Booking flow: doctor → date → available slot → assigned patient → reason. Handles slot conflicts, double bookings, out-of-hours attempts and invalid status transitions with specific messages. Reschedule, cancel, complete, no-show. |
| **Clinical visits** | Visit notes (vitals, diagnosis, prescriptions) for the treating doctor, editable for 24 hours; afterwards only append-only addenda can be added. Admin can read but not write. Visit data is cached briefly and never placed in URLs. |
| **Audit log (admin)** | Filterable event log (filters live in the URL, so a view can be shared), detail drawer, from → to diff viewer, with sensitive values shown as "Redacted". Append-only: no edit or delete UI. |
| **Dashboards** | Admin/viewer statistics (Recharts), an appointments dashboard, and a "My day" view for doctors. |
| **Polish** | Command palette (`Ctrl/Cmd + K`), offline banner, error boundaries and not-found pages, loading skeletons, dark mode, responsive layout. |

---

## Tech stack

- **Framework:** Next.js 16.4 (App Router), React 19, TypeScript
- **Styling / UI:** Tailwind CSS 4, Radix UI primitives with shadcn-style components, Lucide icons, `next-themes`, Sonner toasts
- **Data:** TanStack Query 5, TanStack Table 8, API types generated from the backend's OpenAPI spec (`openapi-typescript`)
- **Forms / validation:** React Hook Form + Zod 4
- **Dates / timezones:** date-fns 4 + `@date-fns/tz`
- **Charts:** Recharts 3
- **Testing:** Vitest + React Testing Library + MSW (unit/component), Playwright + `@axe-core/playwright` (end-to-end and accessibility)
- **Delivery:** Docker (multi-stage, non-root), GitHub Actions CI

---

## Architecture

```
Browser
  │  same-origin requests to /api/v1/*   (httpOnly cookies, no CORS)
  ▼
Next.js 16 server  ──  rewrites /api/v1/:path*  ──►  Express 5 API  ──►  MongoDB (replica set)
  (UI, route guards)                                  (auth, RBAC, audit)
```

Key decisions:

1. **Same-origin API proxy.** The browser only talks to the Next.js origin, and Next rewrites `/api/v1/*` to the API. Auth cookies therefore stay first-party, so sign-in keeps working in browsers that block third-party cookies. Because Next resolves rewrites **at build time**, the backend address is a build argument (`BACKEND_INTERNAL_URL`), not a runtime variable.
2. **Single source of truth for permissions.** UI gating, route guards and the command palette all call `can()`. The server remains the authority: a doctor requesting out-of-scope records gets a 404, and the UI shows a not-found view.
3. **Timezone correctness.** The API sends UTC. Appointment times, day and week boundaries and booking dates are computed in the **doctor's** timezone, never the browser's, and the UI labels the zone. Unit tests run with the browser in a different timezone from the doctor.
4. **Server-state discipline.** All server data goes through TanStack Query with centralized query keys (`lib/query-keys.ts`). Mutations invalidate precisely, and logout clears the cache.
5. **Contract-first typing.** `contracts/openapi.json` is exported from the backend and turned into types with `yarn gen:api`, so contract drift shows up as a compile error.
6. **Error codes, not strings.** The API returns machine-readable `code` values (`SLOT_TAKEN`, `EDIT_WINDOW_EXPIRED`, …). The UI maps codes to specific messages and recovery actions instead of matching message text.
7. **Accessibility is tested.** Axe scans run in CI against every main authenticated page; critical and serious violations fail the build.

---

## Getting started

**Prerequisites:** Node.js 20 or 22, Yarn 1.x, MongoDB 6+ running as a **replica set** (the API uses transactions; Docker or Atlas is the easiest way).

### 1. Backend

```bash
git clone https://github.com/nafismuhymeen/doctor-tracker-backend
cd doctor-tracker-backend
yarn install
cp .env.example .env     # set MONGODB_URI and a JWT_SECRET of at least 32 characters
yarn seed:demo           # development only; refuses to run when NODE_ENV=production
yarn dev                 # http://localhost:5000/api/v1  (Swagger UI at /api/docs)
```

### 2. Frontend

```bash
git clone https://github.com/nafismuhymeen/doctor-tracker-frontend
cd doctor-tracker-frontend
yarn install
cp .env.example .env.local
yarn dev                 # http://localhost:3000
```

### Seeded development accounts

`yarn seed:demo` (development only) creates these accounts, all with the password `Password123!`. They exist for local development and tests only. Never deploy them.

| Role | Email |
|---|---|
| admin | `admin@clinic.com` |
| staff | `staff@clinic.com` |
| doctor | `doctor@clinic.com` (linked to Dr. Sarah Johnson) |
| viewer | `viewer@clinic.com` |

---

## Environment variables

| Variable | When read | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **build** | API base URL used by the browser. Use `/api/v1` with the proxy (default). Use a full URL such as `http://localhost:5000/api/v1` only for direct-mode development. |
| `BACKEND_INTERNAL_URL` | **build** | Where the Next.js server proxies `/api/v1/*` (default `http://localhost:5000`). |
| `NEXT_PUBLIC_DEMO_EMAIL`, `NEXT_PUBLIC_DEMO_PASSWORD` | **build** | Optional "Fill demo account" button on the login page. These values are public in the client bundle, so only ever use a **read-only viewer** account. |

---

## Scripts

| Command | Description |
|---|---|
| `yarn dev` | Development server |
| `yarn build` / `yarn start` | Production build (standalone output) and server |
| `yarn lint` / `yarn typecheck` | ESLint and TypeScript checks |
| `yarn test` | Unit and component tests (Vitest, 146 tests) |
| `yarn test:e2e` | Playwright end-to-end and accessibility tests (needs the backend running with seeded data) |
| `yarn gen:api` | Regenerate API types from `contracts/openapi.json` |

---

## Testing

- **Unit/component (Vitest, RTL, MSW):** permissions, validation schemas, auth and refresh behavior, timezone handling, booking and status flows, visits, audit filters and diff viewer.
- **End-to-end (Playwright, 21 tests):** sign-in for every role, session survival after the access cookie expires, booking a slot and the slot-conflict path, admin creating a doctor with a schedule, a doctor recording a visit and an addendum, role restrictions, the audit trail, and axe accessibility scans of the main pages.
- **CI:** GitHub Actions runs lint, typecheck, unit tests and the production build, then starts MongoDB, the backend and the built frontend and runs Playwright.

---

## Docker

`docker-compose.yml` runs MongoDB (replica set), the API (built from `../doctor-tracker-backend`) and this app behind the same-origin proxy.

```bash
# Backend repository checked out next to this one (JWT secret must be at least 32 characters)
export JWT_ACCESS_SECRET="$(openssl rand -hex 32)"
docker compose up --build
# App: http://localhost:3000
```

The compose file passes `BACKEND_INTERNAL_URL` and the `NEXT_PUBLIC_*` values as **build arguments**, because Next.js bakes them in at build time. The API runs with `NODE_ENV=production`, which refuses `yarn seed:demo`. Provision data with the production-safe seed in the backend (`yarn seed:demo-prod`; see the backend README).

---

## Deployment notes

<!-- TODO: fill in once deployed: hosting provider, region, and the build arguments used. -->

- Deploy the frontend with `BACKEND_INTERNAL_URL` set to the API's public URL **at build time**.
- Serve both over HTTPS. The API sets `Secure` cookies when `NODE_ENV=production`.
- For a public demo, expose only a read-only viewer account on the login page and keep the admin password secret.

---

## Performance

<!-- TODO: add measured Lighthouse numbers (desktop and mobile) for /login and /dashboard from a production build. Do not publish figures that were not measured. -->

---

## Limitations and next steps

- Not a certified HIPAA system. It has no field-level encryption and no real-time updates.
- No email or SMS reminders. Appointment changes are only visible after a refetch or navigation.
- The calendar is custom and focused on one practitioner at a time, with no drag-and-drop rescheduling.
- Possible next steps: WebSocket or SSE updates, a multi-practitioner calendar overlay, internationalization, and Playwright runs on more browsers.

---

## License

MIT
