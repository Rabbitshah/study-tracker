# Study Tracker

Track daily GRE revision and Coursera course progress. Missed time carries forward as backlog automatically.

---

## The Problem It Solves

You have three concurrent goals with hard deadlines:
- GRE 320+ by Sept 30
- Meta Android Developer cert by Sept 14 (297 hrs)
- Unity Game Design specialization by Sept 14 (78 hrs)

Standard todo apps don't handle missed sessions. This one does — every missed minute stacks as backlog and adds to the next day's target automatically.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React Vite + Tailwind CSS + Framer Motion + MUI |
| State | Zustand |
| Data fetching | TanStack Query |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | Custom JWT (access + refresh tokens) |
| Frontend host | Vercel |
| Backend host | Render |

---

## Repo Structure

```
study-tracker/
├── client/                  # React Vite frontend
│   ├── src/
│   │   ├── components/      # SubjectCard, QuickLogButton, EndDayModal, etc.
│   │   ├── pages/           # Today, Weekly, Backlog, Courses, GRE, Settings
│   │   ├── screens/         # Login, Register
│   │   ├── store/           # Zustand store
│   │   ├── services/        # api.js (axios instance)
│   │   ├── hooks/           # useAuth, useToday, useBacklog
│   │   └── utils/           # dateHelpers, backlogCalc
│   ├── .env
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── config/          # db.js (pg Pool), schema.sql
│   │   ├── controllers/     # auth, subjects, logs, backlog, progress, courses
│   │   ├── routes/          # one file per controller
│   │   ├── models/          # SQL query functions
│   │   ├── middleware/      # auth.middleware.js, errorHandler.js
│   │   ├── services/        # backlogService.js (core logic)
│   │   ├── jobs/            # midnightEndDay.js (cron)
│   │   └── app.js
│   ├── index.js
│   └── .env
│
└── docs/                    # this folder
```

---

## Daily Targets (defaults)

| Subject | Priority | Weekday | Weekend | Deadline |
|---|---|---|---|---|
| GRE Quant | 1 | 45 min | 90 min | Sept 30 |
| GRE Verbal | 1 | 45 min | 90 min | Sept 30 |
| Meta Android | 2 | 60 min | 120 min | Sept 14 |
| Unity Game Design | 3 | 30 min | 60 min | Sept 14 |

Weekday total: 3 hrs. Weekend total: 6 hrs.

---

## Key Constraint

Meta Android at 297 hrs needs ~25 hrs/week across 12 weeks. Your available time is ~30 hrs/week maximum. That leaves almost nothing for GRE and Unity. The tracker will surface this reality fast. Use the backlog as a signal — if it grows daily, your targets are miscalibrated, not your discipline.

---

## Documents in This Folder

| File | What it covers |
|---|---|
| 01-README.md | This file |
| 02-DATABASE.md | Full schema, indexes, seed data |
| 03-API.md | All endpoints, request/response shapes |
| 04-BACKLOG-LOGIC.md | Core backlog calculation — read this carefully |
| 05-FRONTEND.md | All pages, components, data flow |
| 06-SETUP.md | Local dev setup step by step |
| 07-DEPLOYMENT.md | Vercel + Render deploy instructions |
| 08-ARCHITECTURE.md | System design decisions and reasoning |
