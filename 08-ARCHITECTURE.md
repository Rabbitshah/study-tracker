# Architecture

Decisions made, why, and what was rejected.

---

## System Overview

```
Browser
  │
  ▼
Vercel (React Vite)
  │  REST + JSON
  ▼
Render (Express API)
  │  pg Pool
  ▼
Render PostgreSQL
  │
  ▼
node-cron (midnight job, same process)
```

Single backend process. No microservices. No message queue. No cache layer. Appropriate for one user's personal tracker.

---

## Key Decisions

### 1. Custom JWT over Firebase Auth

**Chose:** bcrypt + JWT (access + refresh tokens), stored in localStorage.

**Rejected:** Firebase Auth.

**Why:**
- Stack already has Node/Express. Adding Firebase SDK = extra dependency for zero benefit at this scale.
- Custom JWT gives full control over token shape, expiry, refresh logic.
- No vendor lock-in. Portable to any host.

**Tradeoff:** Must handle token refresh manually. Axios interceptor handles this — on 401, attempt refresh, retry original request once.

---

### 2. PostgreSQL over NoSQL

**Chose:** PostgreSQL.

**Rejected:** MongoDB, Firestore.

**Why:**
- Data is relational. Subjects → logs → backlog all join by user_id and subject_id.
- Aggregation queries (weekly totals, streaks, completion %) are natural SQL — would be awkward in document stores.
- UNIQUE constraints (one log per subject per day) enforced at DB level, not application level.
- Already familiar with it from iPharmaAI stack.

---

### 3. Backlog Stored in DB, Not Computed on Read

**Chose:** Persist `accumulated_minutes` in `backlog` table. Update on End Day.

**Rejected:** Compute backlog on every read from daily_logs history.

**Why:**
- Computing from history = scan all past logs on every page load. Gets slow over time.
- Stored value = O(1) read. Simple join.
- Tradeoff: Must keep backlog table in sync with daily_logs. Handled by running calculateEndOfDay inside a DB transaction — both log update and backlog update succeed or both roll back.

---

### 4. End Day = Explicit Trigger + Nightly Cron

**Chose:** Both button-triggered and cron at 00:01.

**Rejected:** Auto-trigger at midnight only, or button-only.

**Why:**
- Button only: if user forgets to press End Day, backlog never updates. Defeats the purpose.
- Cron only: user gets no immediate feedback after studying.
- Both: user gets instant feedback via modal. Cron is safety net for forgotten days.
- Cron checks `day_ended = true` before running — safe to run repeatedly.

---

### 5. Backlog Capped at 2x Daily Target Per Day

**Chose:** `effective_carry = MIN(backlog, base_target * 2)`

**Rejected:** Uncapped carry (full backlog adds to next day).

**Why:**
- Missed 5 days of GRE (5 × 45 = 225 min backlog). Uncapped = day 6 shows 270 min planned. That's 4.5 hrs of GRE in one day. Nobody does that.
- Impossible targets → user ignores the app entirely.
- Capped at 2x = max 90 extra min per day. Realistic. Painful but doable.
- Total backlog still visible on `/backlog` page. User knows the debt. Just drains it slowly.

---

### 6. TanStack Query over Redux/Zustand for Server State

**Chose:** TanStack Query for all API data. Zustand only for auth state.

**Rejected:** Full Redux Toolkit, or Zustand for everything.

**Why:**
- Server state (logs, backlog, courses) needs: cache, invalidation, background refetch, loading/error states. TanStack Query handles all of this out of the box.
- Auth state (user, token) is pure client state with no server sync needed. Zustand is simpler here.
- Redux for this app = massive overkill. 6 routes, no complex client-side state machine.

---

### 7. No ORM — Raw SQL with pg

**Chose:** `pg` Pool, parameterized queries directly.

**Rejected:** Prisma, Sequelize, Drizzle.

**Why:**
- Schema is stable and small (5 tables).
- Backlog service has complex transaction logic that's cleaner in raw SQL.
- ORMs add abstraction cost. When you need to debug a backlog transaction, you want to see the actual SQL.
- Tradeoff: more boilerplate in model files. Acceptable for this size.

---

### 8. Monorepo (client + server in one repo)

**Chose:** Single repo, `client/` and `server/` subdirectories.

**Rejected:** Two separate repos.

**Why:**
- One PR touches both frontend and backend for feature work.
- Vercel and Render both support subdirectory deployments natively.
- Simpler for a solo project. Two repos = two sets of CI, two sets of env vars to keep in sync.

---

## What's Deliberately Missing

**No Redis caching:** Not needed. Backend serves one user. No hot paths that need caching.

**No WebSockets:** No real-time requirement. User logs time, page refreshes data. TanStack Query background refetch is sufficient.

**No email:** No password reset, no notifications. Add later if needed.

**No TypeScript on backend:** Project spec uses JS backend. Adding TS now = scope creep. If the app grows, migrate.

**No test suite:** Personal tool. Manual verification checklist in DEPLOYMENT.md covers critical paths. Add Vitest + Supertest if others start using it.

**No migration tool (Flyway/node-pg-migrate):** Schema is built once. If schema changes, run SQL manually in DB console. Add migrations if schema evolves significantly.

---

## Data Flow: Logging a Study Session

```
User taps +30 on GRE Quant card
  │
  ▼
SubjectCard onClick
  → useMutation fires POST /api/logs
  → { subject_id, log_date: today, completed_minutes: 30 }
  │
  ▼
logs.controller.js → logs.model.js
  → UPSERT daily_logs
  → If log exists: UPDATE SET completed_minutes = completed_minutes + 30
  → If not: INSERT with planned_minutes from getNextDayPlanned()
  │
  ▼
Response: updated log row
  │
  ▼
TanStack Query invalidates ['today', date]
  → GET /logs?date=today refetches
  → SubjectCard re-renders with new progress bar
```

---

## Data Flow: End of Day

```
User clicks "End Day"
  │
  ▼
EndDayModal shows summary preview (no API call yet)
User clicks "Confirm"
  │
  ▼
POST /api/logs/end-day { date }
  │
  ▼
logs.controller.js
  → Check if any log has day_ended = true → if yes, return cached summary
  │
  ▼
backlogService.calculateEndOfDay(userId, date)
  BEGIN TRANSACTION
  For each active subject:
    → Get log (or assume 0 completed)
    → Compute delta
    → UPSERT backlog table
    → Mark log day_ended = true
  COMMIT
  │
  ▼
Response: summary array
  │
  ▼
Frontend: show toast, invalidate ALL queries
  → Tomorrow's GET /logs will call getNextDayPlanned()
  → planned_minutes = base_target + MIN(backlog, base_target * 2)
```

---

## Scalability Ceiling

This architecture handles one user comfortably. If this becomes multi-user:

- Add connection pool sizing (`max: 10` currently — fine for personal use)
- Add rate limiting on log endpoints (currently only on auth)
- Cron job iterates all users — becomes slow past ~1000 users. Move to a job queue (BullMQ) per user instead
- Backlog calculation is synchronous within a transaction — fine for one user, needs async queue for many

Not a concern for current scope.
