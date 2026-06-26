# Study Tracker — What's Left

> Generated: June 25, 2026
> Based on: PROJECT_GUIDE.md + full conversation history

---

## Status Summary

| Phase | Status |
|---|---|
| Phase 0 — Stabilize | ✅ Complete |
| Phase 1 — Polish | ✅ Complete |
| Phase 2 — Deploy | ❌ Not started |
| Phase 3 — v2 Expansion | ❌ Not started |

---

## 🔴 Phase 2 — Deploy (Immediate Next)

Nothing blocking this. Local is stable. Do in one session.

### Step 1 — Push to GitHub

```bash
cd d:/Projects/Tracker
git add .
git commit -m "feat: phase 1 polish complete — ready for deploy"
git remote add origin https://github.com/Rabbitshah/study-tracker.git
git push -u origin main
```

---

### Step 2 — Backend on Render

1. Go to render.com → New → Web Service
2. Connect GitHub repo
3. Settings:
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `node index.js`
4. Environment variables to add:

```
PORT=10000
DATABASE_URL=<your Neon connection string>
JWT_SECRET=<same as local server/.env>
JWT_REFRESH_SECRET=<same as local server/.env>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://study-tracker.vercel.app
NODE_ENV=production
```

5. Deploy → wait → test:
```bash
curl https://your-render-url.onrender.com/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

### Step 3 — Frontend on Vercel

1. Go to vercel.com → New Project
2. Connect same GitHub repo
3. Settings:
   - Root directory: `client`
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
4. Environment variable:
```
VITE_API_URL=https://your-render-url.onrender.com/api
```
5. Deploy → copy Vercel URL

---

### Step 4 — Cross-Update URLs

- Render → Environment → update `CLIENT_URL` to actual Vercel URL → manual redeploy
- Vercel → Environment → confirm `VITE_API_URL` = actual Render URL → redeploy if changed

---

### Step 5 — Prod Smoke Test

Run this after both are live:

```
1. Open Vercel URL in browser
2. Register new account
3. Log 30 min on GRE Quant
4. Click End Day → confirm modal shows correctly
5. Check Backlog page → GRE Quant shows 15 min owed
6. Go to Courses → enter partial hours on course 3 → verify update
7. Settings → try setting GRE target to 0 → confirm blocked
8. DevTools → delete accessToken → reload → confirm silent refresh, no redirect
9. Check GRE page → countdown shows correct days to Sept 30
10. Check Courses page → on-track status shows correctly
```

All 10 pass → you're live.

---

### Known Deploy Gotchas

- **Render free tier cold start:** ~30 sec on first request after 15 min idle. Acceptable for personal use.
- **Neon + Render SSL:** `db.js` already handles `ssl: { rejectUnauthorized: false }` in production. No changes needed.
- **vercel.json:** Already in `client/` with SPA rewrites. No changes needed.
- **Cron job timezone:** Runs at 00:01 UTC = 05:31 IST. If you end your day before midnight IST, it runs fine. If you study past midnight IST, the cron catches it automatically.
- **Hardcoded deadline in courses.controller.js:** The timezone fix used `new Date(2026, 8, 14)` — this is hardcoded. When you add deadline editing in Phase 3, this needs to be replaced with date-only string comparison.

---

## 🟢 Phase 3 — v2 Expansion (After 1 Week of Daily Use)

**Do not start this until you've used the deployed app for at least 1 week.** Real usage will clarify what actually hurts vs what sounded good in planning.

Ordered by value-to-effort ratio:

---

### Group A — No Schema Changes (Add Anytime)

#### A1. Deadline Countdown on Today Page
**Value:** High — you'll want "83 days to GRE" visible without navigating tabs.
**Effort:** Small — add a banner or header sub-line on `Today.jsx`.

```
Today page header area:
"GRE in 96 days  ·  Certs in 80 days"
Inter 400 12px text-muted, inline with date header
Pull from /api/progress/gre response (days_to_deadline already returned)
```

---

#### A2. Weekly Target View on Today Page
**Value:** High — you check from both phone and laptop, helps without switching tabs.
**Effort:** Small — add summary line below subject cards.

```
Below the 4 subject cards, above End Day button:
"This week: 4h 30m / 10h 30m  (43%)"
Pull from /api/progress/overview, sum all subjects
JetBrains Mono for numbers, Inter for labels
```

---

#### A3. Study Plan Generator on GRE Page
**Value:** High — makes the math visible.
**Effort:** Small — pure frontend calculation, no API changes.

```
GRE page, below the two subject cards:
Glass card titled "Study Plan"
"At your current pace (45 min/day), you need 127 more days.
 Your deadline is in 96 days.
 Recommended: increase to 75 min/day."
Recalculate on page load from existing /api/progress/gre data
```

---

#### A4. Consistency Score
**Value:** Medium — more forgiving than streaks, shows long-term habit.
**Effort:** Small — backend query on /api/progress/streak or new endpoint.

```
New metric alongside streak:
"Consistent 18 / 30 days (60%)"
Definition: days in last 30 where completed >= 50% of planned
Add to Weekly page or GRE page
Backend: new GET /api/progress/consistency endpoint
```

---

#### A5. Dark/Light Theme Toggle
**Value:** Low for you (you chose dark intentionally), medium for others.
**Effort:** Small — CSS token system already in place.

```
Settings page → toggle switch
Add [data-theme="light"] block to index.css
Store preference in localStorage
```

---

#### A6. Export to CSV
**Value:** Medium — useful for reviewing in spreadsheets.
**Effort:** Small — frontend only, convert TanStack Query data to CSV blob.

```
Weekly page → "Export CSV" button
Columns: date, subject, planned_minutes, completed_minutes
Use browser Blob API, trigger download
No backend change needed
```

---

### Group B — UI Only, API Already Supports It

#### B1. Manual Log Override UI
**Value:** High — `POST /logs` always adds. Accidental double-log has no UI fix.
**Effort:** Small — API `PATCH /logs/:id` already exists.

```
SubjectCard.jsx → small "Edit" icon next to completed minutes
Click → inline input replaces the number (set mode, not add mode)
On Enter/blur → PATCH /logs/:id with { completed_minutes: value }
Invalidate ['today'] query
```

---

### Group C — Schema Changes Required

**Decision point:** When you're ready for Group C, the cleanest move is:

1. Drop all tables
2. Run updated `schema.sql` with new tables added
3. Re-seed your user

You have no irreplaceable data at this point. Do this cleanly rather than writing ALTER migrations.

---

#### C1. Mock Test Score Tracker
**Value:** High for GRE prep — track practice test scores over time.
**Effort:** Medium.

```sql
-- New table
CREATE TABLE mock_tests (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  test_name VARCHAR(100),
  quant_score INT,
  verbal_score INT,
  total_score INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```
GRE page → new section "Practice Tests"
Input: test name, date, Q score, V score
Line chart: score over time, target line at 320
API: POST /api/mock-tests, GET /api/mock-tests
```

---

#### C2. Topic Mastery Map
**Value:** High for GRE — track which topics are weak.
**Effort:** Medium.

```sql
-- New table
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'not_started',
  -- status: 'not_started' | 'in_progress' | 'mastered'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```
GRE page → "Topic Tracker" section
3-column kanban: Not Started | In Progress | Mastered
Drag topics between columns (or tap to cycle status)
Pre-seed with standard GRE topics on register:
  Quant: Arithmetic, Algebra, Geometry, Data Analysis, Word Problems
  Verbal: Reading Comp, Text Completion, Sentence Equivalence, Vocab
API: CRUD on /api/topics
```

---

#### C3. Calendar Heatmap View
**Value:** Medium — motivating visual of long-term consistency.
**Effort:** Medium.

```
New page /calendar or section on Weekly page
Full month grid, each day = colored square
Color = completion % (green shades, grey = no data)
Click day → popover shows that day's logs
No schema change — uses existing daily_logs
Backend: GET /api/progress/calendar?month=YYYY-MM
Returns: [{ date, total_planned, total_completed, pct }]
```

---

#### C4. Session Logs Table (Burst Tracking)
**Value:** Low initially — current upsert-add works fine for burst logging.
**Effort:** Large — replaces core logging pattern.

```
Only add this if you find yourself wanting to know:
"I logged 4 sessions today — when were they?"
```

```sql
-- New table (replaces current upsert behavior)
CREATE TABLE session_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  minutes INT NOT NULL,
  difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),
  energy_level INT CHECK (energy_level BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- daily_logs becomes a rollup cache of session_logs totals
```

**Recommendation:** Skip until you actually feel the pain of not having it. Most likely you won't.

---

## What the PROJECT_GUIDE.md Says Is Left vs Reality

The guide lists these as pending:

| Guide says pending | Actual status |
|---|---|
| DB Configuration (Neon string) | ✅ Done — Neon connected, seeded |
| Schema Execution | ✅ Done — 5 tables live |
| Core Loop Verification | ✅ Done — Phase 0 complete |
| Deadline Timezone Shift | ✅ Done — Fixed in Phase 0 |
| Touch Target Audit | ✅ Done — Phase 1 complete |
| Production Deployment | ❌ Not done — Phase 2 |

The guide is outdated relative to what's been built. Everything it lists as pending except deployment is done.

---

## GRE Vocab Tool

`gre_vocab_960.html` is mentioned in PROJECT_GUIDE.md as complete. This is a standalone file — no deploy action needed. Keep it in the repo root. Open directly in browser.

---

## Priority Order Going Forward

```
TODAY
  └─ Deploy (Phase 2) — Push → Render → Vercel → smoke test

AFTER 1 WEEK OF USE
  └─ A1. Deadline countdown on Today page     (30 min)
  └─ A2. Weekly target view on Today page     (30 min)
  └─ B1. Manual log override UI               (1 hr)
  └─ A3. Study plan generator on GRE page     (1 hr)

AFTER ENOUGH PAIN
  └─ C1. Mock test tracker
  └─ C2. Topic mastery map
  └─ C3. Calendar heatmap

PROBABLY NEVER NEEDED
  └─ C4. Session logs table
  └─ A5. Light theme toggle
```
