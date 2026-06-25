# Study Tracker — Project Guide & Documentation

This is the unified, comprehensive master guide for the Study Tracker application, bringing together all documentation, database layouts, backend architecture, API patterns, frontend layouts, and deployment instructions in one place.

---

## 1. Project Overview & Spec

The **Study Tracker** is a personal dashboard designed to track study progress across concurrent goals with hard deadlines:
*   **GRE 320+** by Sept 30
*   **Meta Android Developer cert** by Sept 14 (297 hours required)
*   **Unity Game Design specialization** by Sept 14 (78 hours required)

### The Problem It Solves
Standard trackers do not account for missed sessions. If you miss a session, the time is lost. In this application, any missed study time automatically accumulates in a **Backlog** and is added to your next day's target (within a reasonable carry-over cap), ensuring you stay on track to meet your deadlines.

### Default Study Targets
*   **GRE Quant:** Priority 1 | Weekday: 45 min | Weekend: 90 min | Deadline: Sept 30
*   **GRE Verbal:** Priority 1 | Weekday: 45 min | Weekend: 90 min | Deadline: Sept 30
*   **Meta Android:** Priority 2 | Weekday: 60 min | Weekend: 120 min | Deadline: Sept 14
*   **Unity Game Design:** Priority 3 | Weekday: 30 min | Weekend: 60 min | Deadline: Sept 14

*Weekday target total:* 3 hours. *Weekend target total:* 6 hours.

---

## 2. System Architecture & Decisions

```
Browser
  │
  ▼
Vercel (React Vite Frontend)
  │  REST + JSON
  ▼
Render (Express API Backend)
  │  pg Pool
  ▼
Render PostgreSQL (Neon DB)
  │
  ▼
node-cron (midnight job, same process)
```

### Key Architectural Decisions
1.  **Custom JWT Authentication:** Managed via `bcrypt` (12 rounds) and access/refresh token pairs stored in `localStorage`. This avoids vendor lock-in and handles token refreshes silently on the frontend via an Axios response interceptor.
2.  **PostgreSQL (Neon DB):** Relational storage is ideal for aggregating weekly totals, daily completion percentages, and subject priority relationships. Unique constraints prevent duplicate logs for a subject on the same day.
3.  **Persisted Backlog Table:** Instead of computing backlog from scratch by scanning all historical log entries, the backlog minutes are persisted in a `backlog` table. Writes occur during the transaction-wrapped **End Day** process.
4.  **End Day triggers (Double-Safety):** Users trigger End Day via the UI for instant feedback, while a background `node-cron` safety job runs at `00:01 UTC` daily to catch users who forgot to close their day.
5.  **Backlog Cap (2x Daily Target):** If you miss multiple days, adding the full backlog to a single day would result in impossible targets. Instead, the next-day planned addition is capped at $2\times$ the daily target. The remaining backlog stays in the queue and drains gradually.
6.  **TanStack Query + Zustand:** TanStack Query handles caching, background re-fetching, and query invalidation for all server state. Zustand is used solely for client-side authentication details.

---

## 3. Database Schema

The database consists of 5 core tables. You can run the schema from [schema.sql](file:///d:/Projects/Tracker/server/src/config/schema.sql) in the Neon SQL Editor.

```sql
-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subjects Table
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    priority INT DEFAULT 1,
    weekday_target_minutes INT NOT NULL,
    weekend_target_minutes INT NOT NULL,
    deadline DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Daily Logs Table
CREATE TABLE daily_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    planned_minutes INT NOT NULL,
    completed_minutes INT DEFAULT 0,
    day_ended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, subject_id, log_date)
);

-- 4. Backlog Table
CREATE TABLE backlog (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
    accumulated_minutes INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, subject_id)
);

-- 5. Course Progress Table
CREATE TABLE course_progress (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    course_key VARCHAR(100) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    certification VARCHAR(100) NOT NULL,
    sequence_order INT NOT NULL,
    total_hours INT NOT NULL,
    completed_hours INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    UNIQUE (user_id, course_key)
);
```

---

## 4. Backlog Logic & Formulas

The core logic handles the delta between your planned study minutes and completed minutes when a day is closed.

### 1. Delta Calculation (End of Day)
$$\text{delta} = \text{planned\_minutes} - \text{completed\_minutes}$$

*   **Under-studied ($\text{delta} > 0$):** Add to backlog.
    $$\text{backlog} = \text{backlog} + \text{delta}$$
*   **Over-studied ($\text{delta} < 0$):** Reduce backlog (down to a minimum of 0).
    $$\text{backlog} = \max(0, \text{backlog} - |\text{delta}|)$$
*   **Target Met ($\text{delta} = 0$):** No change to the backlog.

### 2. Carry-Over Cap (Start of Day)
When planning the next day's minutes, the added time from backlog is capped to prevent target inflation:
$$\text{effective\_carry} = \min(\text{backlog}, \text{base\_target} \times 2)$$
$$\text{tomorrow's\_planned} = \text{base\_target} + \text{effective\_carry}$$

---

## 5. API Endpoints Reference

All endpoints expect and return JSON. Authenticated routes require an `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
*   `POST /register` — Register a new account and automatically seed courses/subjects.
*   `POST /login` — Log in and retrieve an access/refresh token pair.
*   `POST /refresh` — Get a new access token using a refresh token.
*   `POST /logout` — Log out and clear refresh tokens.

### Subjects (`/api/subjects`)
*   `GET /` — Get active subjects sorted by priority.
*   `POST /` — Create a new subject and initialize its backlog database row.
*   `PATCH /:id` — Update target values or status details.
*   `DELETE /:id` — Soft-delete a subject (`active = false`).

### Study Logs (`/api/logs`)
*   `GET /?date=YYYY-MM-DD` — Retrieve logging progress for a specific day.
*   `POST /` — **Upsert-Add**: Accumulate completed minutes to today's log.
*   `PATCH /:id` — Direct override to edit and correct historical logged minutes.
*   `POST /end-day` — End the day for logs, calculate backlog, and lock logs.

### Backlog & Progress (`/api/backlog` & `/api/progress`)
*   `GET /backlog` — Get all current backlogged minutes.
*   `DELETE /backlog/:subject_id` — Emergency reset backlog to 0.
*   `GET /progress/overview` — Get this week's plan vs. complete rates.
*   `GET /progress/streak` — Current and best study streaks.
*   `GET /progress/weekly` — Last 7 days chart datasets.
*   `GET /progress/gre` — Dedicated GRE exam progress chart and countdown metrics.

### Course Progress (`/api/courses`)
*   `GET /` — Get sequence-locked course trees grouped by certification.
*   `PATCH /:id` — Update course completion hours.
*   `POST /:id/complete` — Instantly mark a course as 100% completed.

---

## 6. Local Setup & Verification

Follow this order to get the tracker up and running locally:

### 1. Configure Server Environments
Create a [server/.env](file:///d:/Projects/Tracker/server/.env) file:
```env
DATABASE_URL=postgresql://<your-neon-connection-string>
JWT_SECRET=<random-32-byte-hex-key>
JWT_REFRESH_SECRET=<another-random-32-byte-hex-key>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
PORT=5000
```
*(Generate secrets by running `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` in your terminal).*

### 2. Configure Client Environments
Create a [client/.env](file:///d:/Projects/Tracker/client/.env) file:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Initialize Database Schema
Copy and execute the queries in [schema.sql](file:///d:/Projects/Tracker/server/src/config/schema.sql) in the Neon SQL Console to prepare the schema tables.

### 4. Start Development Servers
```bash
# Start Express Server (port 5000)
cd server
npm run dev

# Start Vite React App (port 5173)
cd client
npm run dev
```

---

## 7. Deployment Instructions

### Backend (Render)
1.  Connect your GitHub repository to [Render.com](https://render.com).
2.  Create a new **Web Service**. Set **Root Directory** to `server`.
3.  Set **Build Command** to `npm install` and **Start Command** to `node index.js`.
4.  Add your production environment variables (database credentials, JWT keys, and set `CLIENT_URL` to your production Vercel frontend link).

### Frontend (Vercel)
1.  Connect your repository to [Vercel.com](https://vercel.com).
2.  Set **Root Directory** to `client` and choose **Vite** as the framework template.
3.  Add `VITE_API_URL` pointing to your Render production URL (ending in `/api`).
4.  Deploy. (Vercel redirects are controlled by `client/vercel.json` for React routing fallback).

---

## 8. Current Status & Checklist

### What is Completed ✅
- **All code files** are written for both client and server directories.
- **Backlog algorithm transactions** are completed, safe from race conditions, and guarded against double-execution.
- **Silent refresh tokens** are wired into the Axios client requests.
- **GRE Vocab Tool:** Fully customized standalone utility ([gre_vocab_960.html](file:///d:/Projects/Tracker/gre_vocab_960.html)) complete with custom dark styling, smooth-scrolling sidebar link navigations, scroll-spy link updates, and comprehensive keyboard shortcut configurations.

### What is Left (Pending Roadmap) ❌
1.  **DB Configuration:** Paste your Neon connection string into `server/.env`.
2.  **Schema Execution:** Run [schema.sql](file:///d:/Projects/Tracker/server/src/config/schema.sql) queries on Neon.
3.  **Core Loop Verification:** Create an account, record study sessions, end the day, and confirm carry-over backlog calculations work in the UI.
4.  **Deadline Timezone Shift:** Fix course deadlines displaying a day early due to UTC timezone offsets on date conversions.
5.  **Touch Target Audit:** Refine button heights to be at least `44px` on mobile displays.
6.  **Production Deployment:** Go live on Vercel and Render.
