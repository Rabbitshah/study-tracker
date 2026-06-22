# Study Tracker App — Complete Specification

> **Owner:** Maanav Shah
> **Purpose:** Track daily GRE revision + Coursera course progress with automatic backlog carryover
> **Deadline:** GRE — Sept 30 | Courses — Sept 14
> **Stack:** React Vite + Tailwind + Node/Express + PostgreSQL + JWT

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Backlog Logic](#4-backlog-logic)
5. [API Endpoints](#5-api-endpoints)
6. [Frontend Pages & Components](#6-frontend-pages--components)
7. [Course Data Reference](#7-course-data-reference)
8. [Daily Target Defaults](#8-daily-target-defaults)
9. [Edge Cases](#9-edge-cases)
10. [Build Order](#10-build-order)
11. [Folder Structure](#11-folder-structure)
12. [Environment Variables](#12-environment-variables)
13. [Deployment](#13-deployment)

---

## 1. Project Overview

Every day has a **planned study load** per subject. If you complete less than planned, the delta carries forward as **backlog**. Backlog stacks until cleared by completing extra work on future days.

**Three goals this tracker serves:**

- Keep GRE revision on track for a 320+ score by Sept 30
- Complete Meta Android Developer cert by Sept 14 (297 hrs total)
- Complete Unity Game Design specialization by Sept 14 (78 hrs total)

**Key behavioral rules:**

- GRE always has highest priority — never gets deprioritized in the UI
- Weekday targets and weekend targets are different (you work Mon–Fri)
- Backlog is capped at 2x daily target per subject per day to keep it actionable
- A floating Quick Log button lets you log study bursts from the internship without navigating

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Vite + Tailwind CSS + Framer Motion + MUI |
| State Management | Zustand |
| Data Fetching | TanStack Query |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | Custom JWT (access + refresh tokens) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## 3. Database Schema

```sql
-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(100),
  email            VARCHAR(255) UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- SUBJECTS
-- Represents each study area the user tracks
-- ─────────────────────────────────────────
CREATE TABLE subjects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  name                    VARCHAR(100) NOT NULL,
  color                   VARCHAR(7),              -- hex e.g. "#6366f1"
  weekday_target_minutes  INT NOT NULL,
  weekend_target_minutes  INT NOT NULL,
  priority                INT DEFAULT 1,           -- 1 = highest, 3 = lowest
  active                  BOOLEAN DEFAULT TRUE,
  deadline                DATE,
  created_at              TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- DAILY LOGS
-- One row per subject per day
-- ─────────────────────────────────────────
CREATE TABLE daily_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id         UUID REFERENCES subjects(id) ON DELETE CASCADE,
  log_date           DATE NOT NULL,
  planned_minutes    INT NOT NULL,          -- base target + backlog carry for that day
  completed_minutes  INT NOT NULL DEFAULT 0,
  notes              TEXT,
  day_ended          BOOLEAN DEFAULT FALSE, -- true once "End Day" is triggered
  created_at         TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject_id, log_date)
);

-- ─────────────────────────────────────────
-- BACKLOG
-- Accumulated owed minutes per subject
-- Auto-updated when user ends the day
-- ─────────────────────────────────────────
CREATE TABLE backlog (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id          UUID REFERENCES subjects(id) ON DELETE CASCADE,
  accumulated_minutes INT DEFAULT 0,
  last_updated        TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject_id)
);

-- ─────────────────────────────────────────
-- COURSE PROGRESS
-- Tracks individual Coursera courses
-- ─────────────────────────────────────────
CREATE TABLE course_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  course_name      VARCHAR(200) NOT NULL,
  parent_cert      VARCHAR(100) NOT NULL,   -- "Meta Android" or "Unity"
  total_hours      DECIMAL(5,2) NOT NULL,
  completed_hours  DECIMAL(5,2) DEFAULT 0,
  deadline         DATE,
  order_index      INT NOT NULL,            -- enforces course sequence
  completed        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date);
CREATE INDEX idx_backlog_user ON backlog(user_id);
CREATE INDEX idx_course_progress_user ON course_progress(user_id);
```

---

## 4. Backlog Logic

This is the core of the app. Every calculation flows from this.

### End-of-Day Calculation

```
delta = planned_minutes - completed_minutes

IF delta > 0:
    -- missed time: add to backlog
    backlog[subject] += delta

IF delta <= 0:
    -- extra work done: reduce backlog
    backlog[subject] -= abs(delta)
    backlog[subject] = MAX(0, backlog[subject])   -- never go negative
```

### Next Day Planned Minutes

```
base_target = subject.weekday_target OR subject.weekend_target (based on day)

-- Cap carry to prevent impossible days
effective_carry = MIN(backlog[subject], base_target * 2)

today_planned = base_target + effective_carry
```

**Why cap at 2x:** Uncapped backlog creates impossible single-day loads that kill motivation. If you miss 3 days, you can't realistically do 4x in one go. Cap keeps it visible but actionable.

### When to Trigger

- Automatically at midnight (cron job on backend)
- Manually via "End Day" button in the UI

### Backlog Cap Warning

If total backlog across all subjects exceeds 2 weeks of planned work, show a warning banner:

> "Your backlog is large. Consider adjusting your daily targets or deadlines."

---

## 5. API Endpoints

### Auth

```
POST   /api/auth/register
       Body: { name, email, password }
       Returns: { user, accessToken, refreshToken }

POST   /api/auth/login
       Body: { email, password }
       Returns: { user, accessToken, refreshToken }

POST   /api/auth/refresh
       Body: { refreshToken }
       Returns: { accessToken }

POST   /api/auth/logout
       Clears refresh token
```

### Subjects

```
GET    /api/subjects
       Returns: all active subjects for user

POST   /api/subjects
       Body: { name, color, weekday_target_minutes, weekend_target_minutes, priority, deadline }
       Returns: created subject

PATCH  /api/subjects/:id
       Body: any editable fields
       Returns: updated subject

DELETE /api/subjects/:id
       Soft delete — sets active = false
```

### Daily Logs

```
GET    /api/logs?date=YYYY-MM-DD
       Returns: all subject logs for that date including planned + completed + backlog carry

POST   /api/logs
       Body: { subject_id, log_date, completed_minutes, notes }
       Creates or updates log for that subject+date

PATCH  /api/logs/:id
       Body: { completed_minutes, notes }
       Update a specific log entry

POST   /api/logs/end-day
       Body: { date: YYYY-MM-DD }
       Triggers backlog calculation for all subjects on that date
       Returns: summary of delta per subject
```

### Backlog

```
GET    /api/backlog
       Returns: current backlog minutes per subject

DELETE /api/backlog/:subject_id
       Manually clear backlog for a subject (emergency reset)
```

### Progress

```
GET    /api/progress/overview
       Returns: completion % per subject, hours done vs planned

GET    /api/progress/streak
       Returns: current daily streak (days with >= 50% completion)

GET    /api/progress/weekly
       Returns: last 7 days data per subject for chart
       Shape: { date, subject_id, planned, completed }[]

GET    /api/progress/gre
       Returns: GRE-specific stats — hours this week, hours to target, days to deadline
```

### Course Progress

```
GET    /api/courses
       Returns: all courses grouped by parent cert with % complete

PATCH  /api/courses/:id
       Body: { completed_hours }
       Update hours done on a specific course

POST   /api/courses/:id/complete
       Marks a course as fully complete
```

---

## 6. Frontend Pages & Components

### Page: Today (Home / Default Route `/`)

**What it shows:**
- Date header + day type badge (Weekday / Weekend)
- One card per subject showing:
  - Subject name + color dot
  - Target today = base target + backlog carry
  - Progress bar (completed / target)
  - Red backlog badge showing owed minutes if backlog > 0
  - Quick `+15` `+30` `+45` `+60` buttons + custom input
- Total hours planned vs done for the day (bottom summary bar)
- "End Day" button — triggers backlog calc, shows confirmation modal first

**End Day Modal:**

```
"Day Summary — June 20"

GRE Quant:     45 / 45 min  ✅
GRE Verbal:    30 / 45 min  ⚠️  +15 min added to backlog
Meta Android:  60 / 60 min  ✅
Unity:          0 / 30 min  ❌  +30 min added to backlog

[Cancel]   [Confirm End Day]
```

---

### Page: Backlog (`/backlog`)

**What it shows:**
- Per-subject backlog in both minutes and hours
- Colour coding: green (0), yellow (< 2hrs), orange (2–5hrs), red (5hrs+)
- Progress note: "Extra time logged today reduces this automatically"
- Total debt across all subjects
- History of how backlog built up (last 7 days delta per subject)

---

### Page: Courses (`/courses`)

**Two sections: Meta Android | Unity Game Design**

Each course shown as a row:
- Course order number + name
- Hours done / total hours
- Progress bar
- "Mark Complete" button
- Lock icon if previous course not complete (enforces sequence)

Overall cert % complete at top of each section.

**"On Track" status logic:**

```
hours_remaining = total_hours - completed_hours
days_remaining = deadline - today
hours_per_day_needed = hours_remaining / days_remaining

IF hours_per_day_needed <= user's daily target for that subject:
    status = "On Track" (green)
ELSE IF hours_per_day_needed <= daily_target * 1.5:
    status = "Slightly Behind" (yellow)
ELSE:
    status = "Behind — adjust targets" (red)
```

---

### Page: GRE Dashboard (`/gre`)

**Two cards: Verbal | Quant**

Each card shows:
- Hours logged this week
- Hours logged total
- Streak for this subject specifically
- Days remaining to Sept 30
- Weekly bar chart (Mon–Sun)
- Notes field (what topics covered today)

---

### Page: Weekly Overview (`/weekly`)

**7-day grid:**

Each day is a cell showing per-subject completion as a coloured segment:
- Green = ≥ 100% of target
- Yellow = 50–99%
- Red = < 50%
- Grey = skipped / subject inactive that day

**Below the grid:**
- Current streak counter
- Best streak
- Weekly completion % per subject
- Total hours studied this week vs planned

---

### Page: Settings (`/settings`)

- Edit daily targets per subject (weekday + weekend separately)
- Toggle subjects active/inactive
- Change deadline dates
- Reset backlog for a subject (with confirmation)
- Change password
- Delete account

---

### Component: Quick Log Button (Global)

Floating action button visible on all pages (bottom-right corner).

Tap flow:
1. Sheet slides up
2. Pick subject (icon grid)
3. Tap `+15` `+30` `+45` `+60` or type custom
4. Tap "Log" → closes
5. Toast: "30 min logged to GRE Quant"

This is critical for logging study bursts during the internship without full navigation.

---

### Component: Streak Banner

Shown at top of Today page if streak ≥ 3 days.

```
🔥 5 day streak — keep it going
```

Disappears if previous day had < 50% completion.

---

## 7. Course Data Reference

Pre-load this into `course_progress` table on user signup.

### Meta Android Developer — 297 hrs total

| Order | Course Name | Hours |
|---|---|---|
| 1 | Introduction to Android Mobile Application Development | 12 |
| 2 | Version Control | 15 |
| 3 | Programming Fundamentals in Kotlin | 25 |
| 4 | Principles of UX/UI Design | 23 |
| 5 | Create the User Interface in Android Studio | 36 |
| 6 | Advanced Programming in Kotlin | 20 |
| 7 | Working with Data in Android | 27 |
| 8 | Mobile Development and JavaScript | 45 |
| 9 | React Basics | 30 |
| 10 | React Native | 38 |
| 11 | Android App Capstone | 15 |
| 12 | Coding Interview Preparation | 11 |
| | **Total** | **297** |

### Unity Game Design — 78 hrs total

| Order | Course Name | Hours |
|---|---|---|
| 1 | Game Design and Development 1: 2D Shooter | 16 |
| 2 | Game Design and Development 2: 2D Platformer | 14 |
| 3 | Game Design and Development 3: 3D Shooter | 14 |
| 4 | Game Design and Development 4: 3D Platformer | 17 |
| 5 | Game Design and Development 5: Capstone Project | 17 |
| | **Total** | **78** |

---

## 8. Daily Target Defaults

Pre-populate these when a new user registers. User can edit in settings.

| Subject | Color | Priority | Weekday Target | Weekend Target | Deadline |
|---|---|---|---|---|---|
| GRE Quant | #6366f1 | 1 | 45 min | 90 min | 2026-09-30 |
| GRE Verbal | #8b5cf6 | 1 | 45 min | 90 min | 2026-09-30 |
| Meta Android | #f59e0b | 2 | 60 min | 120 min | 2026-09-14 |
| Unity Game Design | #10b981 | 3 | 30 min | 60 min | 2026-09-14 |

**Weekday total:** 3 hrs | **Weekend total:** 6 hrs

---

## 9. Edge Cases

| Scenario | Behavior |
|---|---|
| Weekend — subject has no weekend target (set to 0) | Skip backlog calc for that day, show as "Rest Day" |
| Subject disabled for a day via settings | No backlog added, excluded from day summary |
| Completed more than planned | Reduces existing backlog, never goes negative |
| Missed 5+ days — backlog is huge | Cap display, show warning banner, suggest target adjustment |
| Changed daily target mid-week | Use new target from change date forward, don't recalculate past days |
| "End Day" triggered twice for same date | Second trigger is a no-op, return cached summary |
| App opened past midnight without ending day | Auto-trigger end-day for previous date via cron, show banner "Yesterday's log was auto-closed" |
| No internet on mobile | Show cached today data from TanStack Query, disable log submit with "Offline — will sync when connected" toast |

---

## 10. Build Order

Build in this exact order. Don't skip ahead.

**Phase 1 — Core Loop (build this first, nothing else)**
1. Auth — register, login, JWT middleware
2. Subject setup with defaults pre-loaded on register
3. Today View — show subjects, log minutes via quick buttons
4. End Day — backlog calculation, summary modal
5. Tomorrow's planned minutes reflect backlog

**Phase 2 — Visibility**
6. Weekly overview page
7. Backlog page
8. Streak counter

**Phase 3 — Course Tracking**
9. Course progress page (Meta Android + Unity)
10. On-track status logic

**Phase 4 — GRE Focus**
11. GRE dashboard with weekly chart

**Phase 5 — Polish**
12. Quick Log floating button (global)
13. Settings page
14. Mobile responsiveness pass
15. Cron job for midnight auto end-day

> Do not build Phase 5 until Phase 1 is fully working. The core loop is the entire value of the app.

---

## 11. Folder Structure

```
root/
├── client/                          # React Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # reusable: Button, Badge, Card, ProgressBar
│   │   │   ├── SubjectCard.jsx
│   │   │   ├── QuickLogButton.jsx   # floating global button
│   │   │   ├── EndDayModal.jsx
│   │   │   ├── StreakBanner.jsx
│   │   │   └── BacklogBadge.jsx
│   │   ├── pages/
│   │   │   ├── Today.jsx
│   │   │   ├── Weekly.jsx
│   │   │   ├── Backlog.jsx
│   │   │   ├── Courses.jsx
│   │   │   ├── GRE.jsx
│   │   │   └── Settings.jsx
│   │   ├── screens/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── store/
│   │   │   └── useAppStore.js       # Zustand store
│   │   ├── services/
│   │   │   └── api.js               # axios instance + all API calls
│   │   ├── hooks/
│   │   │   ├── useToday.js
│   │   │   ├── useBacklog.js
│   │   │   └── useAuth.js
│   │   ├── utils/
│   │   │   ├── dateHelpers.js       # isWeekend(), formatDate(), etc.
│   │   │   └── backlogCalc.js       # client-side backlog preview logic
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   └── vite.config.js
│
├── server/                          # Node/Express backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                # PostgreSQL connection pool
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── subjects.controller.js
│   │   │   ├── logs.controller.js
│   │   │   ├── backlog.controller.js
│   │   │   ├── progress.controller.js
│   │   │   └── courses.controller.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── subjects.routes.js
│   │   │   ├── logs.routes.js
│   │   │   ├── backlog.routes.js
│   │   │   ├── progress.routes.js
│   │   │   └── courses.routes.js
│   │   ├── models/
│   │   │   ├── user.model.js
│   │   │   ├── subject.model.js
│   │   │   ├── log.model.js
│   │   │   ├── backlog.model.js
│   │   │   └── course.model.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js    # JWT verify
│   │   │   └── errorHandler.js
│   │   ├── services/
│   │   │   └── backlogService.js    # core backlog calculation logic
│   │   ├── jobs/
│   │   │   └── midnightEndDay.js    # cron job
│   │   └── app.js
│   ├── .env
│   ├── package.json
│   └── index.js                     # entry point
│
└── README.md
```

---

## 12. Environment Variables

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

### Server (`server/.env`)

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/study_tracker
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## 13. Deployment

### Frontend — Vercel

```bash
cd client
npm run build
# Push to GitHub → connect repo to Vercel
# Set env: VITE_API_URL=https://your-backend.onrender.com/api
```

### Backend — Render

```bash
# Connect GitHub repo to Render
# Set build command: cd server && npm install
# Set start command: node index.js
# Add all env variables from server/.env in Render dashboard
# Add a PostgreSQL database via Render (free tier available)
```

### Database Migration

Run schema SQL manually via Render's PostgreSQL console or use a migration tool like `node-pg-migrate`.

---

## Important Warnings

- **320+ GRE in 14 weeks while doing 375 hrs of Coursera is borderline impossible.** The tracker helps — but only if you actually log every day. An empty tracker is worse than no tracker because it creates a false sense of system.
- **GRE is priority 1.** If time runs short on a weekday, skip Unity before you skip GRE.
- **Meta Android at 297 hours by Sept 14 needs ~25 hrs/week.** Your total available time is ~30 hrs/week maximum. That leaves almost nothing for GRE and Unity. The tracker will make this visible fast.
- **Use the backlog as a signal, not a guilt trip.** If backlog is consistently growing every day, your targets are wrong — adjust them in settings rather than abandoning the tracker.
