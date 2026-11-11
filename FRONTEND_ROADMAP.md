# Doctor Tracker Frontend: Implementation Roadmap (Phases F1–F6)

This file is the single source of truth for the next stage of the **frontend only** (`doctor-tracker-frontend`).
The backend (`doctor-tracker-backend`, branch merged to `main`) is **finished**. Do **not** modify the backend repository. If you find a backend bug or a missing field, stop and report it instead of working around it silently.

---

## 0. How to work with this file

1. Read this entire file before doing anything. Also read `AGENTS.md` and the relevant guides in `node_modules/next/dist/docs/` (this is Next.js 16 with `cacheComponents` and `partialPrefetching` enabled; conventions differ from older versions, e.g. check how route protection and rewrites are done in this version before writing any).
2. Work on **one phase at a time**, and only the phase the user names. Never start the next phase on your own.
3. For every phase, in this order:
   1. Reply with a **plan** (files to create/change, new dependencies, risks, anything in this file you disagree with). **Stop and wait for approval.**
   2. After approval, implement in the order given.
   3. Run `yarn lint`, `yarn build` and (once it exists) `yarn test`. Fix every failure.
   4. **Manually verify against the running backend** (see section 1). Unit tests with mocks are not enough, because the biggest risk on this project is the frontend disagreeing with the real API.
   5. Reply with: files changed, new dependencies, deviations from this file and why, and anything unfinished.
4. If this file conflicts with the actual code or the real API responses, **stop and ask**. State every judgment call explicitly in your summary.
5. After each phase, tick its row in the Status table at the bottom. Do not edit anything else in this file.

---

## 1. Context

### Current frontend (what exists today)
Next.js 16.4 (App Router), React 19, TypeScript, Tailwind 4, TanStack Query 5 and TanStack Table, react-hook-form with Zod 4, Recharts, sonner toasts, date-fns 4, lucide-react. UI primitives are hand-written in `components/ui/` (shadcn style: alert-dialog, badge, button, calendar, card, date-picker, dialog, dropdown-menu, input, label, popover, select, skeleton, table, tabs). There is **no** textarea, checkbox, tooltip, sheet or switch component yet. Add them in the same style when needed.

Existing pages: `/login`, `/dashboard`, `/doctors`, `/doctors/[id]`, `/patients`. Existing conventions to keep:
- Files are kebab-case. Pages are `"use client"` and wrap themselves in `<AppLayout>`.
- Data fetching: `useQuery({ queryKey, queryFn: () => api.get<ApiResponse<...>>(url) })`; mutations with `useMutation` plus `queryClient.invalidateQueries`.
- List pages: `useState` filters, `useDebounce(…, 400)`, reset to page 1 on filter change, TanStack Table, `Skeleton` loading rows.
- Forms: react-hook-form with `zodResolver`; errors shown with sonner toasts.
- Data layer: `lib/api.ts` (a `fetch` wrapper with `credentials: "include"`) and hand-written `types/index.ts`.

Not present: tests, CI, Docker, `.env.example`, role awareness, token refresh.

### The backend (what changed since the frontend was written)
Base URL `http://localhost:5000/api/v1` (`NEXT_PUBLIC_API_URL`). Swagger UI at `http://localhost:5000/api/docs`, raw spec at `/api/openapi.json`. **The full contract is in the backend repo: `docs/api-changelog.md` and `openapi.json`.** Read both before Phase F1. Where the changelog and a real response disagree, the real response wins; report the difference.

**Setup for manual verification:** run the backend (`docker compose up` or `yarn dev` with a replica-set Mongo), run its seed scripts, and sign in once as each role (`admin`, `staff`, `doctor`, `viewer`). Find the seeded demo credentials in the backend's `README.md` and `src/scripts/seed-demo.ts`. Never hardcode credentials in the frontend source.

### Breaking changes the current frontend does not handle yet
These are why Phase F1 comes first. The app is **broken against the new backend** until it is done.

1. `POST /auth/login`, `POST /auth/refresh` and `GET /auth/me` return `data.user` (`{ id, name, email, role, doctorId? }`), **not** `data.admin`.
2. Access tokens last **15 minutes**. Refresh uses an httpOnly `refreshToken` cookie (path `/api/v1/auth`) with rotation. Today any 401 sends the user to `/login`.
3. Every existing endpoint is now role-scoped (see Appendix A). A `doctor` calling `GET /dashboard/stats` gets 403, and a doctor asking for another doctor's data gets **404**.
4. Errors carry a machine-readable `code` (Appendix C). `ApiError` in `lib/api.ts` does not keep it.
5. `Doctor` has new fields: `timezone`, `slotMinutes`, `workingHours`. Soft-deleted doctors/patients disappear from lists.
6. Mixed id naming: user objects use `id`; most other objects use `_id`. Pagination total keys differ per resource (see Appendix B).

---

## 2. Global conventions (apply to all phases)

- **Roles:** `admin | staff | doctor | viewer`. All role logic goes through one helper, `lib/permissions.ts` (`can(role, action)`, built from Appendix A). No scattered `role === "admin"` checks in components.
- **The UI mirrors the backend; it never replaces it.** Hiding a button is UX, and the server remains the authority. Still handle 403/404 from the server gracefully.
- **Query keys:** a central factory (`lib/query-keys.ts`), e.g. `qk.appointments.list(params)`. Mutations invalidate by key prefix.
- **API layer:** every request goes through `lib/api.ts`. No raw `fetch` in components. `ApiError` exposes `status`, `code`, `message`, and `fieldErrors` when the backend sends an `errors` array.
- **Types:** domain types live in `types/index.ts`. Generate API types from the backend spec with `openapi-typescript` (copy the backend's `openapi.json` to `contracts/openapi.json`; script `gen:api` writes `types/api.generated.ts`). Use generated types where the spec matches real responses; wrap or correct them in domain types where it does not.
- **Time:** the API sends UTC ISO strings. Appointments are displayed in the **doctor's timezone** (`doctor.timezone`, default `Asia/Dhaka`), never the browser's, and the UI says which timezone is shown. Use `Intl.DateTimeFormat` with `timeZone`, or `@date-fns/tz` if compatible with date-fns 4 (verify). The `date` parameter of the availability endpoint is a calendar date **in the doctor's timezone**.
- **States:** every data view has loading (skeleton), empty, and error states. Mutations disable their trigger while pending and show success/failure toasts.
- **Accessibility:** keyboard operable dialogs and menus, visible focus, labelled inputs, `aria-live` for toasts and slot changes, no information by colour alone (status badges have text).
- **Responsive:** every new page works at 375px width; tables become cards or scroll horizontally inside their container, with no page-level horizontal scroll.
- **Security:** never store tokens in JS-accessible storage (the cookies are httpOnly, so nothing to store). Never log API bodies containing patient data. Render clinical text as plain text (React escaping), never as HTML.
- **Privacy:** all seed/demo data is synthetic. The README states this is a demo and not HIPAA-compliant.
- **Scope discipline:** keep the existing design language (sidebar layout, gradient brand mark, card styles). Do not restyle existing pages beyond what a phase requires.

---

# Phase F1: Foundation: auth migration, roles, refresh, navigation

Goal: make the app work against the new backend and become role-aware. **No new feature pages in this phase.**

### F1.1 API layer (`lib/api.ts`)
- `ApiError` gains `code?: string`, `fieldErrors?: Array<{ path?: string; message: string }>`.
- **Single-flight refresh:** on a `401` from any endpoint **except** `/auth/login`, `/auth/refresh` and `/auth/logout`, call `POST /auth/refresh` once (shared promise, so many concurrent 401s trigger one refresh), then retry the original request once. If refresh fails with `401 SESSION_REVOKED` or `SESSION_TERMINATED`, clear auth state and go to `/login` with a message.
- **Multi-tab race:** if `/auth/refresh` returns `409 TOKEN_ROTATED`, another tab already rotated the cookies. Do **not** log out: retry the original request once.
- Handle empty/204 and non-JSON bodies without throwing a parse error. Support `AbortSignal` via `options.signal`.
- Network failure (`fetch` throws) becomes an `ApiError` with `status: 0` and a friendly message.
- `429` surfaces a "Too many attempts, try again later" message (login is limited to 10 per 15 minutes).
- Keep `credentials: "include"`. Keep the `get/post/patch/delete` helper shape so existing pages keep compiling.

### F1.2 Types and permissions
- Replace `Admin` with `User { id, name, email, role: Role, doctorId?: string }` and export `Role`.
- Update `Doctor` (`timezone`, `slotMinutes`, `workingHours`), and add `WorkingHours`, `Appointment`, `Visit`, `AuditLog`, `AppUser`, plus a generic `Paginated<T>` and `ApiResponse<T>` handling the per-resource total key names (Appendix B).
- Create `lib/permissions.ts` with a typed action list (see Appendix A) and `can(role, action, ctx?)`. Unit-test it as a table (every action × every role).
- Create `lib/query-keys.ts`.

### F1.3 Auth provider
- Replace the `useEffect` that calls `/auth/me` on **every pathname change** with a single `useQuery(["auth","me"])` (no refetch on navigation). `useAuth()` exposes `{ user, role, isLoading, isAuthenticated, login, logout, can }`.
- Keep `login(user)`, but it should set the query cache, and route by role: `doctor` → `/appointments` (once it exists; until F3, `/dashboard`), everyone else → `/dashboard`.
- `logout()` calls `POST /auth/logout`, clears the **entire** query cache (important: no patient data may remain for the next user), then routes to `/login`.
- Add `logoutAll()` (`POST /auth/logout-all`).
- When the session dies mid-use, show one toast ("Your session expired, please sign in again") instead of silently redirecting.

### F1.4 Route structure and guards
- Move authenticated pages into a route group, e.g. `app/(app)/…` with one shared layout that renders `AppLayout` and the auth gate, so pages no longer wrap themselves. Keep URLs unchanged. `/login` stays outside the group.
- Add a `RequireRole` guard used by the layout/pages: unauthenticated → `/login?next=<path>`; authenticated but not permitted → a friendly "You don't have access to this page" view (not a blank page or a redirect loop). After login, honour `next` (validate it is a same-origin relative path to avoid open-redirects).
- Check the Next 16 docs for the correct place for edge-level protection (`middleware`/`proxy` naming differs by version). The cookie is httpOnly and issued by another origin, so edge code cannot verify it; keep the client-side gate as the source of truth and note this in the README.

### F1.5 Navigation and header
- Sidebar items come from a config filtered by `can(...)`. Visibility by role (pages not built yet are added in later phases):

| Item | admin | staff | doctor | viewer |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ (appointment view only, F3) | ✓ |
| Doctors | ✓ | ✓ | ✓ | ✓ |
| Patients | ✓ | ✓ | ✓ (own) | ✓ |
| Appointments (F3) | ✓ | ✓ | ✓ | ✓ |
| Users (F2) | ✓ | ✗ | ✗ | ✗ |
| Audit log (F5) | ✓ | ✗ | ✗ | ✗ |

- Replace the static "Admin Portal" label with the user's role. Header shows name, email and a role badge. Add menu items: **Change password**, **Sign out**, **Sign out of all devices**.
- Add a **Change password** dialog (`PATCH /auth/password`; fields `currentPassword`, `newPassword` with the 10–72 chars, ≥1 letter, ≥1 digit rule enforced client-side as well; confirm field). On success the backend rotates your session cookies, so just refresh the `me` query and toast.

### F1.6 Login page
- Read `data.user`. Map error codes: `INVALID_CREDENTIALS` → "Incorrect email or password"; `ACCOUNT_DISABLED` → "This account has been deactivated"; `429` → rate-limit message; network → connection message. Do not reveal whether an email exists.
- Remove the "Default Seeded Admin Credentials" hint box. Replace it with an optional **"Try the demo"** section controlled by env vars `NEXT_PUBLIC_DEMO_EMAIL` and `NEXT_PUBLIC_DEMO_PASSWORD` (the backend's read-only `viewer` account). It renders only when both are set, and fills the form rather than auto-submitting.

### F1.7 Fix existing pages for the new contract
- `/dashboard`: `doctor` role must **not** call `/dashboard/stats` (403). Until F3, a doctor sees a simple welcome card. Admin/staff/viewer keep the current dashboard.
- `/doctors`, `/doctors/[id]`, `/patients`: hide create/edit/delete controls the role cannot use (Appendix A). Handle `404` for out-of-scope doctor/patient with a "Not found" view. Handle the doctor role's scoped patient list.
- Update dialogs to the new error behavior (`ApiError.code`).

### F1.8 Test and tooling baseline
- Add Vitest, React Testing Library, `@testing-library/user-event`, MSW. Scripts: `test`, `test:watch`. Test: `api.ts` refresh logic (single-flight, retry-once, `TOKEN_ROTATED`, logout on `SESSION_REVOKED`), `permissions.ts`, login form error mapping.
- Add `.env.example` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_EMAIL`, `NEXT_PUBLIC_DEMO_PASSWORD`). Add a `.github/workflows/ci.yml` (install, lint, typecheck, test, build) that runs on push and pull request.
- Add `typecheck` script (`tsc --noEmit`).

**Done when:** you can sign in as each of the four roles against the real backend, stay signed in past 15 minutes (verify by setting `ACCESS_TOKEN_TTL_MINUTES=1` on the backend), the sidebar differs per role, a doctor user never triggers a 403 in the network tab, and lint/typecheck/test/build pass.

---

# Phase F2: Users admin and doctor management completion

Goal: admin tooling that the new backend supports but the UI lacks.

### F2.1 Users page (`/users`, admin only)
- Table: name, email, role badge, active status, last login, created. Filters: `search` (debounced), `role`, `isActive`. Pagination (`totalUsers`).
- **Create user** dialog: name, email, password (policy hints, show/hide toggle), role select. When role is `doctor`, a doctor picker is required (searchable list from `/doctors`).
- **Edit user** dialog: name, role, `doctorId`, active toggle. Show a warning that changing role or deactivating signs the user out everywhere.
- **Reset password** dialog (admin sets a new password; no email flow exists).
- Error UX: `EMAIL_IN_USE`, `DOCTOR_ALREADY_ASSIGNED`, `LAST_ADMIN`, and the self-demotion/self-deactivation 400s all have specific messages. Disable the role and active controls for the signed-in user's own row, with a tooltip explaining why.

### F2.2 Doctors: edit, delete, schedule
- **Edit doctor** dialog (admin): name, specialization, hospital, phone, email (`PATCH /doctors/:id`). Duplicate email shows the 409 message.
- **Delete doctor** (admin): confirmation dialog. If the doctor has patients, require choosing a `reassignToDoctorId` (searchable list excluding this doctor) and send it as a **query parameter** (`DELETE /doctors/:id?reassignToDoctorId=…`). Handle `409 DOCTOR_HAS_APPOINTMENTS` by explaining the doctor still has N future appointments, with a link to `/appointments?doctorId=…` (F3).
- **Schedule editor** on `/doctors/[id]` (admin, and the doctor for their **own** profile): timezone (IANA list; searchable select), slot length (10–120 in steps of 5), and per-day working-hour ranges (day-of-week 0 = Sunday, `HH:mm`, multiple ranges per day, no overlaps, start before end, aligned to the slot length). Validate client-side with Zod, mirroring the backend rules; still show server validation errors. A doctor sends **only** schedule fields.
- Doctor detail page shows the weekly schedule in a readable summary.

### F2.3 Tests
Role-gated rendering (a non-admin never sees `/users`), the reassign-and-delete flow, schedule validation (overlaps, alignment), and user dialog error mapping.

---

# Phase F3: Appointments and the appointment dashboard

Goal: the core scheduling feature. This is the centrepiece of the project; spend the effort here.

### F3.1 Appointments page (`/appointments`)
- **Views:** Week, Day and List (tabs). The calendar is built in-house with CSS grid and date-fns (no heavy calendar dependency): a time axis from the earliest working-hour start to the latest end, one column per day (week view). Appointments are positioned by time and show patient name, status, and reason. Colour **plus** text/icon for status (`scheduled`, `completed`, `cancelled`, `no_show`).
- **Filters:** doctor (required for the calendar views for admin/staff/viewer; fixed to self for the `doctor` role), status, date range. Sync `doctorId`, `view` and `date` to the URL search params so views are linkable.
- Data: `GET /appointments?doctorId&from&to&limit=200` for calendar ranges (limit max is 200); the List view uses normal pagination (`totalAppointments`).
- Show the timezone in use ("Times shown in Asia/Dhaka (doctor's timezone)"). Show non-working hours as visually inactive using `workingHours`.
- Clicking an appointment opens a **details drawer/dialog**: patient, doctor, time, reason, cancel reason, status, and (for `admin`/treating `doctor` only) a link to the visit if `visitId` is present (F4).

### F3.2 Booking flow ("New appointment" dialog; roles admin, staff, doctor)
1. Pick **doctor** (fixed for the `doctor` role).
2. Pick **date** (date picker; disable past dates).
3. Pick a **slot** from `GET /doctors/:id/availability?date=` (grid of time buttons in the doctor's timezone; unavailable slots disabled with an accessible label such as "09:30, unavailable"; show the empty state "No slots this day" with a prompt to try another date).
4. Pick **patient**: the backend requires the patient to be **assigned to that doctor**, so the picker is a searchable list from `GET /doctors/:id/patients`. If none exist, say so and offer to add a patient.
5. Optional reason (max 300 characters, with a counter).
6. Submit → `POST /appointments { doctorId, patientId, startsAt, reason }`. The client **never** sends `endsAt`.

Error UX (use `ApiError.code`):
- `SLOT_TAKEN`: toast "That slot was just booked", **refetch availability**, deselect the slot, keep the other inputs.
- `PATIENT_DOUBLE_BOOKED`: explain the patient already has an overlapping appointment.
- `OUTSIDE_WORKING_HOURS`: refetch availability (the schedule may have changed).
- `400` lead-time/horizon messages (minimum lead 15 minutes, max 180 days ahead): show server text.

### F3.3 Status and reschedule
- Status menu on an appointment: **Mark completed**, **Mark no-show**, **Cancel** (with optional reason ≤ 300). Confirmation dialog for cancel. `completed`/`no_show` are only allowed once the start time has passed; the UI disables them for future appointments with an explanation, but still handles the server's 400.
- `INVALID_STATUS_TRANSITION` (another user already changed it): toast and refetch. Final states (`completed`, `cancelled`, `no_show`) have no further actions.
- **Reschedule** dialog: reuses the slot picker (same doctor), `PATCH /appointments/:id/reschedule { startsAt }`, same error handling as booking.
- Disable all write actions for `viewer`. Cache invalidation: after any mutation, invalidate appointments lists, the availability query for that doctor, and the appointments dashboard.

### F3.4 Appointment dashboard
`GET /dashboard/appointments?range=` (all roles; **scoped** for `doctor`).
- Cards: today (total / scheduled / completed / cancelled / no-show), no-show rate for the selected range.
- Recharts bar chart: next 7 days of scheduled counts.
- "Busiest doctors" list **only when `topBusiestDoctors` is present** (absent for the `doctor` role).
- `range` selector (`7d | 30d | 90d | 1y | all`).
- Layout: the existing `/dashboard` keeps the patient/doctor stats for admin/staff/viewer and gains an **Appointments** tab or section. For the `doctor` role, `/dashboard` becomes "My day": today's schedule list plus the appointment cards, and no call to `/dashboard/stats`.
- Add an "Upcoming appointments" card to `/doctors/[id]` (next 7 days for that doctor).

### F3.5 Tests
Slot picker (unavailable slots, empty state, refetch after `SLOT_TAKEN`), timezone rendering (a UTC slot appears at the right wall-clock time for `Asia/Dhaka` and for a non-Dhaka doctor), booking error mapping, status transition UI, doctor-role scoping of filters.

---

# Phase F4: Patient detail and clinical visits

Goal: a per-patient clinical timeline, with least-privilege UI.

### F4.1 Patient detail page (`/patients/[id]`)
- Header: name, age, gender, phone, email, condition, assigned doctor, with links from the patients table and the doctor page. Tabs: **Overview**, **Appointments** (that patient's, via `GET /appointments?patientId=`), **Visits** (only for `admin` and the treating `doctor`; staff and viewer **do not see the tab at all**, and a direct URL shows the access-denied view, because the API returns 403).

### F4.2 Visits timeline (admin read-only; treating doctor read/write)
- `GET /patients/:patientId/visits` (paginated, `totalVisits`), newest first. Each entry: date, doctor, chief complaint, diagnosis, collapsible notes, vitals chips, prescriptions table, follow-up date, and the **addenda** list (author, timestamp).
- **New visit** form (doctor only): chief complaint (≤ 300), diagnosis (≤ 300), notes (≤ 5000, with counter), visit date, optional follow-up date, vitals (optional, with ranges: BP systolic 50–250, diastolic 30–150, heart rate 30–250, temperature 30–45 °C, weight 1–300 kg), prescriptions as a dynamic field array (max 20; drug, dose, frequency, durationDays 1–365). Validate with Zod exactly as the backend does. Support linking an `appointmentId` (see F4.3).
- **Edit visit** (author doctor only) is available for the **edit window** (24 hours from creation). Show "Editable for X more hours" using `createdAt`. After the window, hide Edit and show only **Add addendum**. If the server returns `409 EDIT_WINDOW_EXPIRED` (clock skew), swap the UI to addendum mode and explain. Addenda are append-only: no edit/delete UI.
- **Add addendum** (doctor, ≤ 2000 characters).
- `409 VISIT_EXISTS`: "A visit is already recorded for this appointment" with a link to it.

### F4.3 Appointment → visit link
- In the appointment details (F3.1), for the treating doctor: if the appointment is `completed` or `scheduled` with a start time in the past and has no `visitId`, show **Record visit** (opens the visit form prefilled with patient and `appointmentId`). Creating the visit auto-completes a past scheduled appointment, so invalidate appointment queries afterwards. If `visitId` exists, show **View visit**.
- Never offer visit recording for future scheduled, cancelled or no-show appointments.

### F4.4 Privacy handling in the client
- Visit queries use a shorter `gcTime`, and the cache is fully cleared on logout (F1.3). No clinical text in URLs, `localStorage`, analytics or console logs. Do not put clinical content in `document.title`.

### F4.5 Tests
Tab visibility per role, edit-window countdown and expiry behavior, prescription field-array validation, vitals range validation, `VISIT_EXISTS` handling.

---

# Phase F5: Audit log viewer (admin only)

### F5.1 Audit page (`/audit`)
- Table from `GET /audit`: time, actor (email and role), action, entity type, entity id, outcome badge (`success`/`failure`), IP. Pagination uses `totalAuditLogs`.
- Filters: `action`, `entityType` (User, Doctor, Patient, Appointment, Visit, Auth, Access), `outcome`, `actorId` (user picker from `/users`), `entityId`, date range (`from`/`to`). Keep filter state in the URL so a filtered view is shareable.
- **Detail drawer** (`GET /audit/:id`): full metadata (IP, user agent, request id) and a **diff viewer** for `changes` (`field`, `from → to`). Values equal to `"[redacted]"` render as a "Redacted" chip with an explanation tooltip ("PII is not stored in the audit log"). Clinical content never appears in the log; do not try to show it.
- Dates in the viewer's local timezone with the zone shown.
- Quick presets: "Failed logins", "Access denied", "Clinical record reads" (`action=visit.read`/`visit.list`).

### F5.2 Entity history shortcut
- On `/doctors/[id]` and `/patients/[id]` (admin only), a "History" button opens the audit drawer pre-filtered by `entityType` and `entityId`.

### F5.3 Tests
Admin-only route guard, diff rendering including redacted values, filter-to-query-param mapping.

---

# Phase F6: Quality, delivery and portfolio polish

Goal: everything a reviewer looks for beyond features.

### F6.1 End-to-end tests (Playwright)
- Tests run against the real backend. In CI, check out the backend repo, run its `docker compose up` (replica-set Mongo), run the backend seed script, then run Playwright. Use test accounts from env vars/secrets.
- Scenarios: login/logout for each role; session survives access-token expiry (use a short TTL in the CI backend env); admin creates a doctor and sets a schedule; staff books an appointment and a second booking of the same slot fails with `SLOT_TAKEN`; doctor records a visit; viewer cannot see write controls; staff cannot open `/audit` or see the Visits tab; admin sees the audit entries for those actions.
- Add `@axe-core/playwright` accessibility checks on the main pages.

### F6.2 Robustness and UX polish
- Route-level `error.tsx` and `not-found.tsx`; a global error boundary with a retry button; offline/network banner.
- Consistent empty states and skeletons on every list. Confirm destructive actions everywhere. Keyboard shortcuts are optional: **Cmd/Ctrl+K** command palette to jump between pages and search patients/doctors (pick one polish feature, do it well).
- Verify dark mode on every new page. Verify 375px, 768px, 1280px.
- Performance: code-split the calendar and chart components (`next/dynamic`), keep list queries debounced, avoid refetch storms (check the network tab). Run Lighthouse and record the scores in the README.

### F6.3 Deployment and cookies (important)
The API sets httpOnly cookies. If the frontend and backend are on **different registrable domains** (e.g. `*.vercel.app` and `*.onrender.com`), browsers increasingly block them as third-party cookies, and login silently breaks on Safari and some Chrome settings. Preferred fix: serve the API **same-origin** by proxying through the Next.js app (a rewrite from `/api/v1/*` to the backend URL; verify the correct config in the Next 16 docs) and set `NEXT_PUBLIC_API_URL=/api/v1`. The backend can then use `COOKIE_SAME_SITE=lax`. Implement this, document it, and keep the direct-URL mode working for local development.
- Add a production `Dockerfile` (multi-stage, `output: "standalone"` if compatible with the current Next config, non-root user) and a `docker-compose.yml` example that runs frontend and backend together (reference the backend image/repo).
- Deploy a live demo with the read-only `viewer` account exposed on the login page (F1.6). Confirm the deployed backend is **not** running the demo seed with a known admin password.

### F6.4 README rewrite (this is the portfolio piece)
Replace the current README with: one-paragraph pitch and live demo link (with the viewer demo credentials), screenshots or a short GIF of the **booking flow** and the **visit timeline**, feature list per role (a table), architecture overview (route groups, API layer, auth/refresh flow diagram), a **Technical Decisions** section covering at least: (1) single-flight token refresh and the `TOKEN_ROTATED` multi-tab case; (2) permission helper mirroring the server matrix while the server stays authoritative; (3) timezone-correct slot rendering; (4) why the calendar is custom-built; (5) same-origin proxy for cookies; (6) query-cache clearing on logout for patient privacy. Include setup, env vars, scripts, test instructions, and a "limitations and what I'd do next" section, plus the note that this is a demo with synthetic data and is not HIPAA-compliant.

### F6.5 Final checks
`yarn lint && yarn typecheck && yarn test && yarn build` pass; Playwright suite green locally and in CI; Lighthouse and axe results recorded; README accurate (every claim verified against the code).

---

# Appendix A: Permission matrix (mirror of the backend)

`own` = a `doctor` user only sees their own doctor record, patients and appointments (out-of-scope → server 404). `✓` allowed, `✗` forbidden (server 403).

| Action | admin | staff | doctor | viewer |
|---|---|---|---|---|
| Change own password, sign out (all devices) | ✓ | ✓ | ✓ | ✓ |
| Users: list / create / edit / reset password | ✓ | ✗ | ✗ | ✗ |
| Doctors: list / view / availability | ✓ | ✓ | ✓ | ✓ |
| Doctors: create / delete | ✓ | ✗ | ✗ | ✗ |
| Doctors: edit profile | ✓ | ✗ | ✗ | ✗ |
| Doctors: edit schedule fields | ✓ | ✗ | own | ✗ |
| Patients: list / view | ✓ | ✓ | own | ✓ |
| Patients: create / edit | ✓ | ✓ | own | ✗ |
| Patients: delete | ✓ | ✓ | ✗ | ✗ |
| Dashboard stats (`/dashboard/stats`) | ✓ | ✓ | ✗ | ✓ |
| Dashboard appointments | ✓ | ✓ | own | ✓ |
| Appointments: list / view | ✓ | ✓ | own | ✓ |
| Appointments: book / status / reschedule | ✓ | ✓ | own | ✗ |
| Visits: read (timeline and single) | ✓ | ✗ | own | ✗ |
| Visits: create / edit / addendum | ✗ | ✗ | own | ✗ |
| Audit log | ✓ | ✗ | ✗ | ✗ |

`lib/permissions.ts` and its table test must cover every row.

# Appendix B: Backend contract gotchas

1. Auth responses use `data.user`; user objects use `id`. Doctors, patients, appointments, visits and audit logs use `_id` (the visit-create example in the changelog shows `id`; **verify against a real response** and normalize in one place).
2. Pagination total keys: `totalDoctors`, `totalPatients`, `totalUsers`, `totalAppointments`, `totalVisits`, `totalAuditLogs`; all share `currentPage`, `limit`, `totalPages`, `hasNextPage`, `hasPreviousPage`.
3. `appointment.doctorId` and `appointment.patientId` are **populated objects** (not ids) in list/detail responses, and may be `null` if the referenced record was soft-deleted. Render defensively.
4. `topBusiestDoctors` is absent from the appointments dashboard for the `doctor` role.
5. Availability: `startsAt`/`endsAt` are UTC ISO; `date` and day boundaries are in the doctor's timezone; `days` is 1–14.
6. Appointment list `limit` max is 200; other lists default to 10–20 with their own maxima (users 100, audit 100, visits 100).
7. `GET /appointments/:id` includes `visitId` only for `admin` and the treating `doctor`.
8. `PATCH /doctors/:id` from a `doctor` user must contain schedule fields only (`timezone`, `slotMinutes`, `workingHours`).
9. `DELETE /doctors/:id` takes `reassignToDoctorId` as a **query parameter**.
10. Soft-deleted doctors/patients vanish from lists; deleting a patient cancels their future scheduled appointments (`cancelReason: "Patient removed"`).
11. Audit `changes` values for patient `phone`/`email` are the literal string `"[redacted]"`.
12. Auth cookies are httpOnly; the refresh cookie is only sent to `/api/v1/auth/*`. `credentials: "include"` is mandatory on every call.
13. Rate limits: login 10 per 15 minutes per IP; general 300 per 15 minutes per IP. Avoid refetch storms (check the network tab on every new page).

# Appendix C: Error code to UX map

| Code / status | Where | UX |
|---|---|---|
| `INVALID_CREDENTIALS` (401/400) | login, change password | Inline/toast "Incorrect email or password" / "Current password is incorrect" |
| `ACCOUNT_DISABLED` (403) | login, any | "This account has been deactivated"; sign out |
| `SESSION_REVOKED`, `SESSION_TERMINATED` (401) | refresh | Sign out, go to `/login`, toast "Session ended, please sign in again" |
| `TOKEN_ROTATED` (409) | refresh | Silent: retry the original request once |
| `429` | login, any | "Too many attempts, try again later" |
| `FORBIDDEN` (403) | any | Access-denied view (route level) or toast (action level) |
| `404` on a scoped resource | doctor role | "Not found" view (do not hint it exists elsewhere) |
| `SLOT_TAKEN` (409) | book, reschedule | Toast, refetch availability, deselect slot |
| `PATIENT_DOUBLE_BOOKED` (409) | book, reschedule | Inline explanation |
| `OUTSIDE_WORKING_HOURS` (400) | book, reschedule | Refetch availability |
| `INVALID_STATUS_TRANSITION` (409) | status, reschedule | Toast, refetch the appointment |
| `DOCTOR_HAS_APPOINTMENTS` (409) | delete doctor | Dialog with count and link to filtered appointments |
| `EDIT_WINDOW_EXPIRED` (409) | edit visit | Switch UI to addendum mode with explanation |
| `VISIT_EXISTS` (409) | create visit | Message with link to the existing visit |
| `LAST_ADMIN` (409) | edit user | "At least one active admin is required" |
| `EMAIL_IN_USE`, `DOCTOR_ALREADY_ASSIGNED` (409) | create/edit user | Field-level message |
| Other `400` with `errors[]` | forms | Map `fieldErrors` to form fields where `path` matches, else show the message |

# Appendix D: New dependencies (verify versions and compatibility before installing)

Runtime: `@date-fns/tz` (only if it works with date-fns 4; otherwise use `Intl`). Dev: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `msw`, `@playwright/test`, `@axe-core/playwright`, `openapi-typescript`. Do not add a calendar library, a state-management library or a UI kit.

---

# Status

| Phase | Description | Status |
|---|---|---|
| F1 | Foundation: auth migration, roles, refresh, navigation | [ ] |
| F2 | Users admin and doctor management completion | [ ] |
| F3 | Appointments and the appointment dashboard | [ ] |
| F4 | Patient detail and clinical visits | [ ] |
| F5 | Audit log viewer | [ ] |
| F6 | Quality, delivery and portfolio polish | [ ] |
