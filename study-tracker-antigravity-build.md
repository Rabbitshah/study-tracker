# Study Tracker — Antigravity Build Guide
> Step-by-step execution plan with Codex prompts, manual steps, and skill activations

---

## Pre-Build Checklist (Manual — Do This First)

- [ ] Node.js 20+ installed
- [ ] PostgreSQL running locally (or use Neon/Render free tier)
- [ ] Git repo initialized
- [ ] Vercel account ready
- [ ] Render account ready
- [ ] Codex / Claude Code open in root of project

---

## Project Structure Setup (Manual)

```bash
mkdir study-tracker && cd study-tracker
mkdir client server
cd client && npm create vite@latest . -- --template react
cd ../server && npm init -y
git init
```

---

## PHASE 1 — Backend Foundation

### Step 1.1 — Database Schema

**Skills to activate:** `postgres-pro`, `secure-code-guardian`

**Codex Prompt:**
```
Using skills: postgres-pro, secure-code-guardian, nodejs-backend-patterns

Create the PostgreSQL schema for a study tracker app. Run this in server/src/config/db.js using pg (node-postgres).

Schema requirements:
- users table: id (UUID), name, email (unique), password_hash, created_at
- subjects table: id, user_id (FK), name, color (hex), weekday_target_minutes, weekend_target_minutes, priority (1-3), active (bool), deadline (date), created_at
- daily_logs table: id, user_id, subject_id, log_date (DATE), planned_minutes, completed_minutes (default 0), notes, day_ended (bool default false), created_at. UNIQUE(user_id, subject_id, log_date)
- backlog table: id, user_id, subject_id, accumulated_minutes (default 0), last_updated. UNIQUE(user_id, subject_id)
- course_progress table: id, user_id, course_name, parent_cert (Meta Android or Unity), total_hours decimal, completed_hours decimal default 0, deadline, order_index, completed bool default false

Add indexes: daily_logs(user_id, log_date), backlog(user_id), course_progress(user_id)

Output:
1. schema.sql file in server/src/config/
2. db.js with pg Pool connection using DATABASE_URL env var
3. A seed function that pre-loads 4 default subjects and 17 courses for a new user
```

---

### Step 1.2 — Auth System

**Skills to activate:** `secure-code-guardian`, `nodejs-backend-patterns`

**Codex Prompt:**
```
Using skills: secure-code-guardian, nodejs-backend-patterns

Build JWT auth for Node.js/Express in the server/ directory.

Stack: Express, bcryptjs, jsonwebtoken, pg

Files to create:
- server/src/controllers/auth.controller.js
- server/src/routes/auth.routes.js
- server/src/middleware/auth.middleware.js

Requirements:
- POST /api/auth/register: hash password with bcrypt (12 rounds), insert user, return accessToken (15m) + refreshToken (7d)
- POST /api/auth/login: verify password, return same tokens
- POST /api/auth/refresh: validate refresh token, return new accessToken
- POST /api/auth/logout: invalidate refresh token (store in DB or blacklist)
- auth.middleware.js: verify Bearer token from Authorization header, attach req.user = { id, email }
- On register: auto-create 4 default subjects and seed course_progress for that user (call the seed function from db.js)

Use process.env.JWT_SECRET and JWT_REFRESH_SECRET
Never return password_hash in any response
```

---

### Step 1.3 — Subjects API

**Skills to activate:** `api-designer`, `nodejs-backend-patterns`

**Codex Prompt:**
```
Using skills: api-designer, nodejs-backend-patterns

Build the subjects CRUD API for the study tracker.

Files:
- server/src/controllers/subjects.controller.js
- server/src/routes/subjects.routes.js
- server/src/models/subject.model.js

Endpoints (all require auth middleware):
- GET /api/subjects — return all active subjects for req.user.id
- POST /api/subjects — create subject, body: { name, color, weekday_target_minutes, weekend_target_minutes, priority, deadline }
- PATCH /api/subjects/:id — update any field, verify ownership
- DELETE /api/subjects/:id — soft delete: set active = false

Model layer should use parameterized queries only (no string interpolation).
Always filter by user_id to prevent cross-user data access.
```

---

### Step 1.4 — Core Backlog Service

**Skills to activate:** `nodejs-backend-patterns`, `postgres-pro`

**Codex Prompt:**
```
Using skills: nodejs-backend-patterns, postgres-pro

Build the backlog calculation service — this is the most critical business logic.

File: server/src/services/backlogService.js

Function: calculateEndOfDay(userId, date)
Logic:
1. Fetch all active subjects for user
2. For each subject, fetch daily_log for that date
3. Determine if it's weekend (Sat/Sun) or weekday
4. Use weekday_target or weekend_target accordingly
5. If target is 0 for that day type, skip (rest day)
6. delta = planned_minutes - completed_minutes
7. If delta > 0: backlog[subject_id] += delta
8. If delta <= 0: backlog[subject_id] -= abs(delta), floor at 0
9. Update backlog table for each subject
10. Set day_ended = true on all logs for that date

Also build: getNextDayPlanned(userId, subjectId, date)
Logic:
- base_target = weekday or weekend target based on date
- backlog_carry = MIN(backlog.accumulated_minutes, base_target * 2)  ← cap at 2x
- return { planned: base_target + backlog_carry, carry: backlog_carry }

File: server/src/jobs/midnightEndDay.js
- Use node-cron to run calculateEndOfDay for all users at 00:01 daily
- Log results, never throw uncaught errors
```

---

### Step 1.5 — Logs and Backlog API

**Skills to activate:** `api-designer`, `nodejs-backend-patterns`

**Codex Prompt:**
```
Using skills: api-designer, nodejs-backend-patterns

Build the daily logs and backlog API.

Files:
- server/src/controllers/logs.controller.js
- server/src/routes/logs.routes.js
- server/src/controllers/backlog.controller.js
- server/src/routes/backlog.routes.js

Log Endpoints:
- GET /api/logs?date=YYYY-MM-DD
  Return all subject logs for that date. For subjects with no log yet, return planned_minutes from getNextDayPlanned(). Include backlog carry in response.
  
- POST /api/logs
  Body: { subject_id, log_date, completed_minutes, notes }
  Upsert: if log exists for that subject+date, ADD completed_minutes to existing (don't replace — user may log multiple times per day)
  Verify subject belongs to user.

- PATCH /api/logs/:id
  Body: { completed_minutes, notes }
  Verify ownership.

- POST /api/logs/end-day
  Body: { date: 'YYYY-MM-DD' }
  Call backlogService.calculateEndOfDay(userId, date)
  Return summary: [{ subject_name, planned, completed, delta, backlog_added }]
  If day already ended, return cached summary (no-op).

Backlog Endpoints:
- GET /api/backlog — return accumulated_minutes per subject
- DELETE /api/backlog/:subject_id — reset to 0, verify ownership
```

---

### Step 1.6 — Progress and Courses API

**Skills to activate:** `api-designer`, `postgres-pro`

**Codex Prompt:**
```
Using skills: api-designer, postgres-pro

Build the progress and course tracking APIs.

Files:
- server/src/controllers/progress.controller.js
- server/src/routes/progress.routes.js
- server/src/controllers/courses.controller.js
- server/src/routes/courses.routes.js

Progress Endpoints:
- GET /api/progress/overview
  Return: per subject — total planned this week, total completed, completion %
  
- GET /api/progress/streak
  Logic: count consecutive days where sum(completed) >= 50% of sum(planned)
  Return: { current_streak, best_streak }

- GET /api/progress/weekly
  Return last 7 days: [{ date, subject_id, subject_name, planned, completed }]

- GET /api/progress/gre
  Return for GRE Quant + GRE Verbal:
  { hours_this_week, hours_total, days_to_deadline, daily_avg_needed }

Course Endpoints:
- GET /api/courses
  Return all courses grouped by parent_cert, with per-cert totals and on-track status
  On-track logic:
    hours_remaining = total_hours - completed_hours
    days_remaining = deadline - today
    hours_per_day_needed = hours_remaining / days_remaining
    if hours_per_day_needed <= subject daily target: "On Track"
    elif <= target * 1.5: "Slightly Behind"
    else: "Behind"

- PATCH /api/courses/:id
  Body: { completed_hours }
  Validate completed_hours <= total_hours

- POST /api/courses/:id/complete
  Set completed = true, completed_hours = total_hours
  Verify ownership
```

---

### Step 1.7 — App Entry Point

**Skills to activate:** `nodejs-backend-patterns`

**Codex Prompt:**
```
Using skills: nodejs-backend-patterns

Wire up the Express app.

Files:
- server/src/app.js — Express app with middleware, routes
- server/index.js — entry point, HTTP server + cron job start
- server/src/middleware/errorHandler.js — global error handler

Requirements:
- CORS with CLIENT_URL env var
- express.json() body parser
- Rate limiting on /api/auth routes (100 req/15min per IP) using express-rate-limit
- Mount all routes under /api prefix
- Global error handler: return { error: message, status } JSON
- In index.js: start cron job, listen on PORT env var

package.json scripts:
  "start": "node index.js"
  "dev": "nodemon index.js"

Dependencies to install:
  express, pg, bcryptjs, jsonwebtoken, cors, express-rate-limit, node-cron, dotenv, nodemon (dev)
```

---

## PHASE 2 — Frontend Foundation

### Step 2.1 — Vite + Tailwind Setup

**Manual steps:**
```bash
cd client
npm install tailwindcss @tailwindcss/vite framer-motion @mui/material @emotion/react @emotion/styled zustand @tanstack/react-query axios react-router-dom
```

**Codex Prompt:**
```
Using skills: react-expert, tailwind-patterns

Set up the React Vite frontend for the study tracker.

Files to create/modify:
- client/vite.config.js — add @tailwindcss/vite plugin
- client/src/index.css — Tailwind base import, CSS variables for theme colors
- client/src/main.jsx — wrap app with QueryClientProvider and BrowserRouter
- client/src/App.jsx — routes setup

CSS Variables to define in index.css:
  --color-gre-quant: #6366f1
  --color-gre-verbal: #8b5cf6
  --color-android: #f59e0b
  --color-unity: #10b981
  --color-bg: #0f0f0f
  --color-surface: #1a1a1a
  --color-border: #2a2a2a
  --color-text: #f0f0f0
  --color-muted: #666

Dark theme by default on body.

Routes in App.jsx:
  /login → Login screen
  /register → Register screen
  Protected routes (redirect to /login if no token):
    / → Today page
    /weekly → Weekly page
    /backlog → Backlog page
    /courses → Courses page
    /gre → GRE page
    /settings → Settings page
```

---

### Step 2.2 — API Service + Auth Store

**Skills to activate:** `react-expert`

**Codex Prompt:**
```
Using skills: react-expert, typescript-pro

Build the API service layer and auth state.

Files:
- client/src/services/api.js
  - axios instance with baseURL from VITE_API_URL
  - Request interceptor: attach Authorization: Bearer {token} from localStorage
  - Response interceptor: on 401, attempt token refresh via POST /api/auth/refresh, retry original request once, on second failure clear tokens and redirect to /login

- client/src/store/useAppStore.js (Zustand)
  State:
    user: null
    accessToken: null
    isAuthenticated: bool
  Actions:
    login(user, accessToken, refreshToken): store tokens in localStorage, update state
    logout(): clear localStorage, reset state
    setUser(user)

- client/src/hooks/useAuth.js
  On mount: check localStorage for tokens, validate, restore session
  Return: { user, isAuthenticated, login, logout, loading }

- client/src/screens/Login.jsx
  Form: email + password
  On submit: POST /api/auth/login, call login() action, redirect to /

- client/src/screens/Register.jsx
  Form: name + email + password
  On submit: POST /api/auth/register, call login() action, redirect to /
```

---

### Step 2.3 — Today Page (Core UI)

**Skills to activate:** `react-expert`, `frontend-design`

**Codex Prompt:**
```
Using skills: react-expert, frontend-design, tailwind-patterns

Build the Today page — the most important screen of the app.

File: client/src/pages/Today.jsx

Layout (dark theme, mobile-first):
- Header: "Today — [Day, Date]" + "WEEKDAY" or "WEEKEND" badge
- Streak banner (only if streak >= 3): "🔥 {n} day streak"
- Subject cards (one per subject, sorted by priority)
- Bottom bar: total planned vs completed for the day
- "End Day" button (fixed bottom on mobile)

SubjectCard component (client/src/components/SubjectCard.jsx):
Props: { subject, log, backlog, onLog }
Show:
  - Color dot + subject name
  - Red backlog badge if backlog.accumulated_minutes > 0: shows "+{n} min backlog"
  - Progress bar: completed / planned (color matches subject color)
  - Minutes text: "{completed} / {planned} min"
  - Quick log buttons: [+15] [+30] [+45] [+60] + custom input field
  - On button click: call POST /api/logs with that increment

Data fetching:
  useQuery(['today', date], () => api.get('/logs?date=' + date))
  useMutation for logging minutes, invalidate ['today'] on success

EndDayModal component:
  Shows summary table before confirming
  On confirm: POST /api/logs/end-day
  On success: invalidate all queries, show toast "Day ended — backlog updated"

Use TanStack Query for all data fetching.
```

---

### Step 2.4 — Quick Log Floating Button

**Skills to activate:** `react-expert`

**Codex Prompt:**
```
Using skills: react-expert, frontend-design

Build the global Quick Log floating action button.

File: client/src/components/QuickLogButton.jsx

Behavior:
- Fixed position bottom-right on ALL pages
- Tap/click → bottom sheet slides up (Framer Motion animation)
- Sheet shows: grid of subject icons (color coded), pick one
- Then show: [+15] [+30] [+45] [+60] + custom number input
- Tap "Log" → POST /api/logs with today's date + selected subject + minutes
- On success: close sheet + toast: "30 min logged to GRE Quant"
- On error: show error in sheet

Framer Motion:
  Sheet animates: y: "100%" → y: 0 on open
  Backdrop: opacity 0 → 0.5 on open

Add this component to App.jsx so it renders on all protected routes.
```

---

### Step 2.5 — Remaining Pages

**Skills to activate:** `react-expert`

**Codex Prompt:**
```
Using skills: react-expert, tailwind-patterns

Build the remaining 5 pages for the study tracker. Each fetches its own data with TanStack Query.

1. client/src/pages/Weekly.jsx
   - 7-day grid: Mon through today
   - Each day cell shows 4 colored segments (one per subject)
   - Green = >=100% completion, Yellow = 50-99%, Red = <50%, Grey = no data
   - Below grid: streak count, weekly hours bar chart (use recharts BarChart)
   - Data: GET /api/progress/weekly

2. client/src/pages/Backlog.jsx
   - Header: total backlog in hours
   - Per-subject backlog cards
   - Color coding: green=0, yellow<2hrs, orange 2-5hrs, red 5hrs+
   - "Clear" button per subject (with confirmation) → DELETE /api/backlog/:id
   - Data: GET /api/backlog

3. client/src/pages/Courses.jsx
   - Two sections: "Meta Android Developer" | "Unity Game Design"
   - Each section has: overall % bar + "On Track / Behind" badge
   - List of courses in order with hours done / total + progress bar
   - Previous course must be complete to unlock next (show lock icon)
   - "Mark Complete" button
   - Data: GET /api/courses

4. client/src/pages/GRE.jsx
   - Two cards: GRE Quant | GRE Verbal
   - Each: hours this week, days to Sept 30, daily avg needed
   - Weekly bar chart per subject (recharts)
   - Data: GET /api/progress/gre

5. client/src/pages/Settings.jsx
   - Edit daily targets (weekday + weekend) per subject
   - Toggle subject active/inactive
   - Change deadline dates
   - Save button per section → PATCH /api/subjects/:id
   - Change password section
   - Data: GET /api/subjects

Add a bottom nav bar (mobile) or sidebar (desktop) with icons for all 5 pages + Today.
Use react-router-dom NavLink for active state styling.
```

---

## PHASE 3 — Integration & Polish

### Step 3.1 — Connect Everything

**Skills to activate:** `debugging-wizard`

**Codex Prompt:**
```
Using skills: debugging-wizard, fullstack-guardian

Do a full integration audit of the study tracker app.

Check:
1. Every frontend API call matches an existing backend endpoint (method + path)
2. Auth token is sent on every protected request
3. Error states are handled in the UI (not just console.log)
4. TanStack Query cache is invalidated after every mutation
5. The End Day flow actually updates tomorrow's planned_minutes
6. Backlog badge on SubjectCard reflects real data
7. Course progress "on track" logic uses actual subject daily targets

Fix any gaps found. List every issue fixed.
```

---

### Step 3.2 — Mobile Responsiveness

**Skills to activate:** `react-expert`, `frontend-design`

**Codex Prompt:**
```
Using skills: react-expert, tailwind-patterns

Make the study tracker fully mobile-responsive.

Requirements:
- Today page: cards stack full width on mobile, side by side on tablet+
- Quick log buttons [+15][+30][+45][+60] are large enough to tap (min 44px height)
- End Day button: fixed bottom center on mobile, normal position on desktop
- Bottom nav bar visible on mobile (hidden on desktop, show sidebar instead)
- Weekly grid: scroll horizontally on mobile if needed
- Course list: readable on 375px width
- All modals/sheets: full width on mobile
- Font sizes: minimum 14px body, 16px inputs (prevents iOS zoom)

Test breakpoints: 375px (iPhone SE), 768px (iPad), 1024px (laptop)
```

---

### Step 3.3 — Seed Data for Testing

**Manual step — run this once to test the full flow:**

```bash
# Register a test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Maanav","email":"maanavshah09@gmail.com","password":"test1234"}'

# This should auto-create 4 subjects and 17 courses
# Copy the accessToken from response
```

---

## PHASE 4 — Deployment

### Step 4.1 — Environment Files

**Manual step:**

```bash
# server/.env
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/study_tracker
JWT_SECRET=your-secret-here-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://your-vercel-app.vercel.app
NODE_ENV=production

# client/.env
VITE_API_URL=https://your-render-backend.onrender.com/api
```

---

### Step 4.2 — Deploy Backend to Render

**Skills to activate:** `devops-engineer`

**Codex Prompt:**
```
Using skills: devops-engineer

Prepare the Node.js backend for Render deployment.

1. Add a render.yaml to server/ directory:
   - service type: web
   - build command: npm install
   - start command: node index.js
   - env vars: list all from .env (values as placeholders)

2. Create server/Dockerfile (optional but more reliable on Render):
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 5000
   CMD ["node", "index.js"]

3. Add a GET /health endpoint to app.js that returns { status: "ok", timestamp }

4. Ensure pg connection uses SSL in production:
   new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
```

**Manual Render steps:**
1. Push server/ to GitHub
2. New Web Service → connect repo
3. Set all env vars in Render dashboard
4. Add PostgreSQL database in Render → copy DATABASE_URL
5. Run schema.sql in Render PostgreSQL console

---

### Step 4.3 — Deploy Frontend to Vercel

**Manual steps:**
```bash
cd client
# Add to client/vercel.json:
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
# Push to GitHub → connect to Vercel
# Set VITE_API_URL env var to Render backend URL
```

---

## PHASE 5 — Verification Checklist

Run these manually after deployment:

```
AUTH
[ ] Register creates user + 4 subjects + 17 courses
[ ] Login returns tokens
[ ] Protected routes redirect to /login when no token
[ ] Token refresh works when accessToken expires

TODAY PAGE
[ ] All 4 subjects appear with correct targets
[ ] +30 button adds 30 min to today's log
[ ] Progress bar updates immediately
[ ] Backlog badge shows correctly

END DAY FLOW
[ ] End Day modal shows correct summary
[ ] After confirming: backlog updates
[ ] Next day shows higher planned if backlog exists
[ ] Second End Day click is no-op

COURSES
[ ] All 12 Android + 5 Unity courses listed
[ ] Mark Complete updates progress
[ ] On Track status correct

MOBILE
[ ] Works on iPhone SE (375px)
[ ] Quick Log button accessible
[ ] Bottom nav works
```

---

## Appendix — Seed Data Reference

**Default subjects (auto-created on register):**

```javascript
const DEFAULT_SUBJECTS = [
  { name: 'GRE Quant',        color: '#6366f1', priority: 1, weekday: 45, weekend: 90,  deadline: '2026-09-30' },
  { name: 'GRE Verbal',       color: '#8b5cf6', priority: 1, weekday: 45, weekend: 90,  deadline: '2026-09-30' },
  { name: 'Meta Android',     color: '#f59e0b', priority: 2, weekday: 60, weekend: 120, deadline: '2026-09-14' },
  { name: 'Unity Game Design',color: '#10b981', priority: 3, weekday: 30, weekend: 60,  deadline: '2026-09-14' },
];
```

**Default courses (auto-created on register):**

```javascript
const META_ANDROID_COURSES = [
  { name: 'Introduction to Android Mobile Application Development', hours: 12,  order: 1 },
  { name: 'Version Control',                                        hours: 15,  order: 2 },
  { name: 'Programming Fundamentals in Kotlin',                     hours: 25,  order: 3 },
  { name: 'Principles of UX/UI Design',                            hours: 23,  order: 4 },
  { name: 'Create the User Interface in Android Studio',            hours: 36,  order: 5 },
  { name: 'Advanced Programming in Kotlin',                         hours: 20,  order: 6 },
  { name: 'Working with Data in Android',                           hours: 27,  order: 7 },
  { name: 'Mobile Development and JavaScript',                      hours: 45,  order: 8 },
  { name: 'React Basics',                                           hours: 30,  order: 9 },
  { name: 'React Native',                                           hours: 38,  order: 10 },
  { name: 'Android App Capstone',                                   hours: 15,  order: 11 },
  { name: 'Coding Interview Preparation',                           hours: 11,  order: 12 },
];

const UNITY_COURSES = [
  { name: 'Game Design and Development 1: 2D Shooter',    hours: 16, order: 1 },
  { name: 'Game Design and Development 2: 2D Platformer', hours: 14, order: 2 },
  { name: 'Game Design and Development 3: 3D Shooter',    hours: 14, order: 3 },
  { name: 'Game Design and Development 4: 3D Platformer', hours: 17, order: 4 },
  { name: 'Game Design and Development 5: Capstone',      hours: 17, order: 5 },
];
```

---

## Build Order Summary

| Phase | What | Skills |
|---|---|---|
| 1.1 | DB Schema + Connection | postgres-pro, secure-code-guardian |
| 1.2 | Auth (register/login/JWT) | secure-code-guardian, nodejs-backend-patterns |
| 1.3 | Subjects CRUD | api-designer, nodejs-backend-patterns |
| 1.4 | Backlog Service (core logic) | nodejs-backend-patterns, postgres-pro |
| 1.5 | Logs + Backlog API | api-designer, nodejs-backend-patterns |
| 1.6 | Progress + Courses API | api-designer, postgres-pro |
| 1.7 | App wiring + cron | nodejs-backend-patterns |
| 2.1 | Vite + Tailwind setup | react-expert, tailwind-patterns |
| 2.2 | API layer + Auth store | react-expert |
| 2.3 | Today page (core) | react-expert, frontend-design |
| 2.4 | Quick Log button | react-expert, frontend-design |
| 2.5 | All other pages | react-expert |
| 3.1 | Integration audit | debugging-wizard, fullstack-guardian |
| 3.2 | Mobile pass | react-expert, tailwind-patterns |
| 4.x | Deploy | devops-engineer |

**Do not skip 1.4.** The backlog service is the entire value of the app. Everything else is just UI on top of it.
