# Database

PostgreSQL. All IDs are UUIDs. All timestamps UTC.

---

## Tables

### users

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### subjects

One row per study area per user. Targets stored in minutes.

```sql
CREATE TABLE subjects (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES users(id) ON DELETE CASCADE,
  name                   VARCHAR(100) NOT NULL,
  color                  VARCHAR(7),               -- hex e.g. "#6366f1"
  weekday_target_minutes INT NOT NULL,
  weekend_target_minutes INT NOT NULL,
  priority               INT DEFAULT 1,            -- 1 = highest
  active                 BOOLEAN DEFAULT TRUE,
  deadline               DATE,
  created_at             TIMESTAMP DEFAULT NOW()
);
```

### daily_logs

One row per subject per day. Created when user first logs time or when End Day triggers.

```sql
CREATE TABLE daily_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id        UUID REFERENCES subjects(id) ON DELETE CASCADE,
  log_date          DATE NOT NULL,
  planned_minutes   INT NOT NULL,       -- base target + backlog carry for that day
  completed_minutes INT NOT NULL DEFAULT 0,
  notes             TEXT,
  day_ended         BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject_id, log_date)
);
```

### backlog

Running total of owed minutes per subject. Updated on End Day.

```sql
CREATE TABLE backlog (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id          UUID REFERENCES subjects(id) ON DELETE CASCADE,
  accumulated_minutes INT DEFAULT 0,
  last_updated        TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject_id)
);
```

### course_progress

Individual Coursera courses. Locked sequence enforced in frontend only.

```sql
CREATE TABLE course_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  course_name     VARCHAR(200) NOT NULL,
  parent_cert     VARCHAR(100) NOT NULL,  -- "Meta Android" or "Unity"
  total_hours     DECIMAL(5,2) NOT NULL,
  completed_hours DECIMAL(5,2) DEFAULT 0,
  deadline        DATE,
  order_index     INT NOT NULL,
  completed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Indexes

```sql
CREATE INDEX idx_daily_logs_user_date  ON daily_logs(user_id, log_date);
CREATE INDEX idx_backlog_user          ON backlog(user_id);
CREATE INDEX idx_course_progress_user  ON course_progress(user_id);
```

---

## Seed Data

Run on new user registration. Insert into subjects and course_progress for that user_id.

### Default subjects

```javascript
const DEFAULT_SUBJECTS = [
  {
    name: 'GRE Quant',
    color: '#6366f1',
    priority: 1,
    weekday_target_minutes: 45,
    weekend_target_minutes: 90,
    deadline: '2026-09-30'
  },
  {
    name: 'GRE Verbal',
    color: '#8b5cf6',
    priority: 1,
    weekday_target_minutes: 45,
    weekend_target_minutes: 90,
    deadline: '2026-09-30'
  },
  {
    name: 'Meta Android',
    color: '#f59e0b',
    priority: 2,
    weekday_target_minutes: 60,
    weekend_target_minutes: 120,
    deadline: '2026-09-14'
  },
  {
    name: 'Unity Game Design',
    color: '#10b981',
    priority: 3,
    weekday_target_minutes: 30,
    weekend_target_minutes: 60,
    deadline: '2026-09-14'
  }
];
```

### Meta Android courses (parent_cert = "Meta Android")

```javascript
const META_ANDROID_COURSES = [
  { order_index: 1,  course_name: 'Introduction to Android Mobile Application Development', total_hours: 12 },
  { order_index: 2,  course_name: 'Version Control',                                        total_hours: 15 },
  { order_index: 3,  course_name: 'Programming Fundamentals in Kotlin',                     total_hours: 25 },
  { order_index: 4,  course_name: 'Principles of UX/UI Design',                            total_hours: 23 },
  { order_index: 5,  course_name: 'Create the User Interface in Android Studio',            total_hours: 36 },
  { order_index: 6,  course_name: 'Advanced Programming in Kotlin',                         total_hours: 20 },
  { order_index: 7,  course_name: 'Working with Data in Android',                           total_hours: 27 },
  { order_index: 8,  course_name: 'Mobile Development and JavaScript',                      total_hours: 45 },
  { order_index: 9,  course_name: 'React Basics',                                           total_hours: 30 },
  { order_index: 10, course_name: 'React Native',                                           total_hours: 38 },
  { order_index: 11, course_name: 'Android App Capstone',                                   total_hours: 15 },
  { order_index: 12, course_name: 'Coding Interview Preparation',                           total_hours: 11 }
];
// Total: 297 hrs | deadline: '2026-09-14'
```

### Unity courses (parent_cert = "Unity")

```javascript
const UNITY_COURSES = [
  { order_index: 1, course_name: 'Game Design and Development 1: 2D Shooter',    total_hours: 16 },
  { order_index: 2, course_name: 'Game Design and Development 2: 2D Platformer', total_hours: 14 },
  { order_index: 3, course_name: 'Game Design and Development 3: 3D Shooter',    total_hours: 14 },
  { order_index: 4, course_name: 'Game Design and Development 4: 3D Platformer', total_hours: 17 },
  { order_index: 5, course_name: 'Game Design and Development 5: Capstone',      total_hours: 17 }
];
// Total: 78 hrs | deadline: '2026-09-14'
```

---

## Connection Config

```javascript
// server/src/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

module.exports = pool;
```

---

## Notes

- Never store plaintext passwords. bcrypt only.
- `planned_minutes` in daily_logs = base target + backlog carry at time of day creation. Don't recalculate retroactively.
- `accumulated_minutes` in backlog is a running total, not per-day. It goes up on missed days, down when user does extra work.
- If a subject's `active = false`, exclude from backlog calculation entirely.
- If `weekend_target_minutes = 0` for a subject, skip backlog calc on weekends for that subject.
