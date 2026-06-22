# Study Tracker — What's Done

> Last updated: June 21, 2026

---

## Infrastructure

| Item | Status | Detail |
|---|---|---|
| Neon PostgreSQL | ✅ Connected | `neondb` on ap-southeast-1 |
| Schema applied | ✅ Done | 5 tables + 4 indexes |
| User registered | ✅ Done | maanavshah09@gmail.com |
| 4 subjects seeded | ✅ Done | GRE Quant, GRE Verbal, Meta Android, Unity |
| 17 courses seeded | ✅ Done | 12 Meta Android + 5 Unity |
| Backend running | ✅ Running | http://localhost:5000 |
| Frontend running | ✅ Running | http://localhost:5173 |

---

## Backend — Server (Node/Express)

### Config & Database
- `server/src/config/db.js` — pg Pool with SSL, auto-reconnect, pooling (max 10)
- `server/src/config/schema.sql` — full 5-table schema with indexes
- `server/src/config/seed.js` — seeds 4 subjects + 17 courses + backlog rows on register

### Auth (`/api/auth/*`)
- `POST /register` — bcrypt (12 rounds), JWT pair, auto-seeds user data
- `POST /login` — validates password, issues tokens
- `POST /refresh` — validates refresh token against DB, issues new access token
- `POST /logout` — nullifies refresh token in DB
- Refresh tokens stored in `users.refresh_token` column
- Rate limited: 100 req / 15 min per IP

### Subjects (`/api/subjects`)
- `GET /subjects` — all active subjects ordered by priority
- `POST /subjects` — create + auto-init backlog row
- `PATCH /subjects/:id` — dynamic update (any fields), ownership-guarded
- `DELETE /subjects/:id` — soft delete (`active = false`)

### Logs (`/api/logs`)
- `GET /logs?date=` — returns all active subjects with planned (base + carry) and completed for a date
- `POST /logs` — **upsert-add**: adds minutes to existing log, doesn't replace (burst-logging safe)
- `PATCH /logs/:id` — direct override for corrections
- `POST /logs/end-day` — triggers backlog calc, idempotent via `day_ended` guard

### Backlog (`/api/backlog`)
- `GET /backlog` — all subjects with `accumulated_minutes` + `accumulated_hours`
- `DELETE /backlog/:subject_id` — emergency reset to 0, ownership-guarded

### Progress (`/api/progress`)
- `GET /overview` — per-subject planned/completed/% for current week
- `GET /streak` — consecutive days ≥ 50% completion (current + best)
- `GET /weekly` — last 7 days per subject (chart data)
- `GET /gre` — GRE-specific stats: hours this week, total, days to deadline

### Courses (`/api/courses`)
- `GET /courses` — grouped by cert, with on-track status per cert
- `PATCH /courses/:id` — update completed hours (validates ≤ total)
- `POST /courses/:id/complete` — marks complete, sets completed_hours = total

### Core Services
- `backlogService.js` — **calculateEndOfDay**: DB transaction, per-subject delta, 2× cap on carry, idempotency guard
- `backlogService.js` — **getNextDayPlanned**: base + MIN(backlog, base×2)
- `midnightEndDay.js` — node-cron 00:01 UTC, processes all users with un-ended logs

### App Wiring
- CORS restricted to `CLIENT_URL`
- Global JSON error handler `{ error, status }`
- `GET /health` endpoint
- `Dockerfile` for Render deployment

---

## Frontend — React Vite

### Foundation
- Vite 8 + React 18
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- `index.css` — full dark theme design system with CSS tokens, utilities, animations
- Inter font (Google Fonts)
- `vercel.json` — SPA rewrites for client-side routing

### State & Data
- **Zustand** (`useAppStore.js`) — auth state: user, token, login/logout
- **TanStack Query** — all server state with caching, invalidation, background refetch
- **axios** (`api.js`) — request interceptor (attach token), response interceptor (silent 401 refresh → retry → redirect)
- `useAuth.js` — session restore on mount by validating token against API
- `dateHelpers.js` — todayStr, isWeekend, formatMinutes, lastNDays, formatDateLong
- `backlogCalc.js` — backlogColor, completionColor, statusColor

### Auth Screens
- `Login.jsx` — dark card, error display, link to register
- `Register.jsx` — same design, 8-char password validation

### Routing (`App.jsx`)
- Public: `/login`, `/register`
- Protected (auth guard): `/`, `/weekly`, `/backlog`, `/courses`, `/gre`, `/settings`
- `ProtectedLayout` — renders NavBar + QuickLogButton + Outlet
- 404 redirects to `/`

### Components
- `NavBar.jsx` — bottom nav (mobile < 768px), left sidebar (desktop ≥ 768px), logout button
- `SubjectCard.jsx` — color dot, backlog badge, progress bar, +15/30/45/60 buttons, custom input, upsert-add on tap
- `EndDayModal.jsx` — Framer Motion animated, per-subject summary table (✅⚠️❌), shows backlog delta after confirm
- `StreakBanner.jsx` — 🔥 banner shown when streak ≥ 3 days
- `QuickLogButton.jsx` — fixed FAB, Framer Motion bottom sheet, subject grid → amount picker → POST /logs, success toast

### Pages
- `Today.jsx` — date header, day-type badge, streak banner, 4 subject cards, total summary bar, End Day button
- `Weekly.jsx` — 7-day completion grid (color-coded), streak stats, Recharts bar chart, weekly summary table
- `Backlog.jsx` — total header, per-subject severity-colored cards (green/yellow/orange/red), clear with confirm, 2-week warning banner
- `Courses.jsx` — Meta Android + Unity sections, on-track badge, locked sequence, Mark Complete
- `GRE.jsx` — Quant + Verbal cards, hours this week / total, days to Sept 30, Recharts weekly chart with target reference line
- `Settings.jsx` — per-subject weekday/weekend targets, deadline editor, active toggle, backlog reset, logout

---

## Backlog Logic — Implemented

| Rule | Implemented |
|---|---|
| delta = planned - completed | ✅ |
| delta > 0 → backlog += delta | ✅ |
| delta ≤ 0 → backlog = MAX(0, backlog - abs(delta)) | ✅ |
| effective carry = MIN(backlog, base × 2) | ✅ |
| Skip if weekend_target = 0 | ✅ |
| Skip if subject inactive | ✅ |
| End Day idempotent (day_ended guard) | ✅ |
| Midnight cron safety net | ✅ |
| Backlog stored in DB (O(1) reads) | ✅ |
| Transaction rollback on error | ✅ |
| Large backlog warning (> 2 weeks) | ✅ |

---

## Verified Working

- ✅ `GET /health` → `{"status":"ok"}`
- ✅ `POST /register` → user created, 4 subjects + 17 courses seeded
- ✅ `GET /subjects` → returns all 4 subjects with correct targets
- ✅ Frontend builds (1105 modules, 0 errors)
- ✅ Both dev servers running simultaneously
