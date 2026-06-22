# API Reference

Base URL: `http://localhost:5000/api` (dev) | `https://your-app.onrender.com/api` (prod)

All protected routes require: `Authorization: Bearer <accessToken>`

All responses: `Content-Type: application/json`

Error shape: `{ "error": "message", "status": 400 }`

---

## Auth

### POST /auth/register

No auth required.

**Body:**
```json
{
  "name": "Maanav",
  "email": "maanavshah09@gmail.com",
  "password": "yourpassword"
}
```

**Response 201:**
```json
{
  "user": { "id": "uuid", "name": "Maanav", "email": "..." },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Side effects:** Creates 4 default subjects + 17 course_progress rows for this user.

**Errors:**
- 400 — missing fields
- 409 — email already registered

---

### POST /auth/login

**Body:**
```json
{
  "email": "maanavshah09@gmail.com",
  "password": "yourpassword"
}
```

**Response 200:**
```json
{
  "user": { "id": "uuid", "name": "Maanav", "email": "..." },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors:**
- 401 — invalid credentials

---

### POST /auth/refresh

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response 200:**
```json
{ "accessToken": "eyJ..." }
```

**Errors:**
- 401 — token invalid or expired

---

### POST /auth/logout

**Auth required.**

Invalidates refresh token server-side.

**Response 200:**
```json
{ "message": "Logged out" }
```

---

## Subjects

### GET /subjects

Returns all active subjects for current user, sorted by priority.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "GRE Quant",
    "color": "#6366f1",
    "weekday_target_minutes": 45,
    "weekend_target_minutes": 90,
    "priority": 1,
    "active": true,
    "deadline": "2026-09-30"
  }
]
```

---

### POST /subjects

**Body:**
```json
{
  "name": "New Subject",
  "color": "#ff0000",
  "weekday_target_minutes": 30,
  "weekend_target_minutes": 60,
  "priority": 2,
  "deadline": "2026-09-30"
}
```

**Response 201:** Created subject object.

---

### PATCH /subjects/:id

Any subset of editable fields. Verifies ownership.

**Body (any combination):**
```json
{
  "weekday_target_minutes": 60,
  "weekend_target_minutes": 120,
  "active": false,
  "deadline": "2026-09-14"
}
```

**Response 200:** Updated subject object.

**Errors:**
- 403 — subject belongs to different user
- 404 — subject not found

---

### DELETE /subjects/:id

Soft delete — sets `active = false`. Does not delete data.

**Response 200:**
```json
{ "message": "Subject deactivated" }
```

---

## Daily Logs

### GET /logs?date=YYYY-MM-DD

Returns log state for every active subject on that date.

For subjects with no log yet that day, calculates planned_minutes using backlog carry.

**Response 200:**
```json
[
  {
    "subject_id": "uuid",
    "subject_name": "GRE Quant",
    "subject_color": "#6366f1",
    "log_id": "uuid or null",
    "log_date": "2026-06-20",
    "planned_minutes": 90,
    "completed_minutes": 45,
    "backlog_carry": 45,
    "base_target": 45,
    "day_ended": false,
    "notes": null
  }
]
```

---

### POST /logs

Log completed minutes for a subject on a date.

**Behavior:** If a log already exists for that subject+date, ADD completed_minutes to existing value. Do not replace.

**Body:**
```json
{
  "subject_id": "uuid",
  "log_date": "2026-06-20",
  "completed_minutes": 30,
  "notes": "Covered Quant chapter 4"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "subject_id": "uuid",
  "log_date": "2026-06-20",
  "planned_minutes": 90,
  "completed_minutes": 75,
  "day_ended": false
}
```

**Errors:**
- 400 — completed_minutes not a positive integer
- 403 — subject not owned by user

---

### PATCH /logs/:id

Replace notes or override completed_minutes directly (for corrections).

**Body:**
```json
{
  "completed_minutes": 60,
  "notes": "Updated"
}
```

**Response 200:** Updated log object.

---

### POST /logs/end-day

Triggers backlog calculation for a specific date.

**Body:**
```json
{ "date": "2026-06-20" }
```

**Behavior:**
- Runs backlog delta calculation for all active subjects
- Sets `day_ended = true` on all logs for that date
- If called again for same date: returns cached summary, no-op

**Response 200:**
```json
{
  "date": "2026-06-20",
  "already_ended": false,
  "summary": [
    {
      "subject_name": "GRE Quant",
      "planned": 90,
      "completed": 45,
      "delta": 45,
      "backlog_added": 45,
      "status": "missed"
    },
    {
      "subject_name": "GRE Verbal",
      "planned": 45,
      "completed": 60,
      "delta": -15,
      "backlog_reduced": 15,
      "status": "exceeded"
    }
  ]
}
```

---

## Backlog

### GET /backlog

Current accumulated backlog per subject.

**Response 200:**
```json
[
  {
    "subject_id": "uuid",
    "subject_name": "GRE Quant",
    "subject_color": "#6366f1",
    "accumulated_minutes": 135,
    "accumulated_hours": 2.25,
    "last_updated": "2026-06-20T00:01:00Z"
  }
]
```

---

### DELETE /backlog/:subject_id

Manual reset — sets accumulated_minutes to 0. Use only in emergencies.

**Response 200:**
```json
{ "message": "Backlog cleared for GRE Quant" }
```

---

## Progress

### GET /progress/overview

Completion summary per subject for current week (Mon–today).

**Response 200:**
```json
[
  {
    "subject_name": "GRE Quant",
    "subject_color": "#6366f1",
    "total_planned_this_week": 315,
    "total_completed_this_week": 180,
    "completion_pct": 57,
    "hours_completed": 3.0
  }
]
```

---

### GET /progress/streak

**Response 200:**
```json
{
  "current_streak": 5,
  "best_streak": 12
}
```

Streak definition: consecutive days where `sum(completed) >= 50% of sum(planned)` across all subjects.

---

### GET /progress/weekly

Last 7 days, per subject per day. Used for charts.

**Response 200:**
```json
[
  {
    "date": "2026-06-14",
    "subject_id": "uuid",
    "subject_name": "GRE Quant",
    "planned": 45,
    "completed": 45
  }
]
```

---

### GET /progress/gre

GRE-specific stats only.

**Response 200:**
```json
{
  "quant": {
    "hours_this_week": 2.5,
    "hours_total": 18.0,
    "days_to_deadline": 102,
    "daily_avg_needed_minutes": 0
  },
  "verbal": {
    "hours_this_week": 1.75,
    "hours_total": 14.0,
    "days_to_deadline": 102,
    "daily_avg_needed_minutes": 0
  }
}
```

Note: `daily_avg_needed_minutes` is calculated as: `(target_total_hours * 60 - minutes_logged_so_far) / days_remaining`. Target total is not stored — use a reasonable constant or make it configurable.

---

## Courses

### GET /courses

All courses grouped by cert.

**Response 200:**
```json
{
  "meta_android": {
    "total_hours": 297,
    "completed_hours": 27.0,
    "completion_pct": 9,
    "deadline": "2026-09-14",
    "days_remaining": 86,
    "hours_per_day_needed": 3.14,
    "status": "Behind",
    "courses": [
      {
        "id": "uuid",
        "order_index": 1,
        "course_name": "Introduction to Android Mobile Application Development",
        "total_hours": 12,
        "completed_hours": 12,
        "completion_pct": 100,
        "completed": true
      }
    ]
  },
  "unity": {
    "total_hours": 78,
    "completed_hours": 0,
    "completion_pct": 0,
    "deadline": "2026-09-14",
    "days_remaining": 86,
    "hours_per_day_needed": 0.91,
    "status": "On Track",
    "courses": [...]
  }
}
```

**Status logic:**
- `hours_per_day_needed <= subject_daily_target_hrs` → "On Track"
- `<= subject_daily_target_hrs * 1.5` → "Slightly Behind"
- else → "Behind"

---

### PATCH /courses/:id

Update hours completed on a course.

**Body:**
```json
{ "completed_hours": 6.5 }
```

**Validation:** `completed_hours` must be between 0 and `total_hours`.

**Response 200:** Updated course object.

---

### POST /courses/:id/complete

Marks course as complete. Sets `completed = true`, `completed_hours = total_hours`.

**Response 200:**
```json
{ "message": "Course marked complete", "course": { ... } }
```

---

## Health Check

### GET /health

No auth required. Used by Render for uptime monitoring.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-06-20T10:00:00Z" }
```

---

## Rate Limits

- Auth routes (`/auth/*`): 100 requests per 15 minutes per IP
- All other routes: no hard limit (add if needed)

---

## Error Codes Reference

| Status | Meaning |
|---|---|
| 400 | Bad request — missing or invalid body fields |
| 401 | Not authenticated — missing or invalid token |
| 403 | Forbidden — resource belongs to different user |
| 404 | Resource not found |
| 409 | Conflict — e.g. email already exists |
| 500 | Server error — check server logs |
