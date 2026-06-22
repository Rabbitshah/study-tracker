-- ─────────────────────────────────────────
-- Study Tracker — PostgreSQL Schema
-- Run once: psql -d study_tracker -f schema.sql
-- ─────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  refresh_token TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- SUBJECTS
-- One row per study area per user
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES users(id) ON DELETE CASCADE,
  name                   VARCHAR(100) NOT NULL,
  color                  VARCHAR(7),                -- hex e.g. "#6366f1"
  weekday_target_minutes INT NOT NULL DEFAULT 0,
  weekend_target_minutes INT NOT NULL DEFAULT 0,
  priority               INT DEFAULT 1,             -- 1 = highest
  active                 BOOLEAN DEFAULT TRUE,
  deadline               DATE,
  created_at             TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- DAILY LOGS
-- One row per subject per day
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id        UUID REFERENCES subjects(id) ON DELETE CASCADE,
  log_date          DATE NOT NULL,
  planned_minutes   INT NOT NULL DEFAULT 0,   -- base target + backlog carry for that day
  completed_minutes INT NOT NULL DEFAULT 0,
  notes             TEXT,
  day_ended         BOOLEAN DEFAULT FALSE,     -- true once End Day is triggered
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject_id, log_date)
);

-- ─────────────────────────────────────────
-- BACKLOG
-- Running total of owed minutes per subject
-- Updated atomically when user ends the day
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backlog (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id          UUID REFERENCES subjects(id) ON DELETE CASCADE,
  accumulated_minutes INT DEFAULT 0,
  last_updated        TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject_id)
);

-- ─────────────────────────────────────────
-- COURSE PROGRESS
-- Individual Coursera courses
-- Lock sequence enforced in frontend only
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_progress (
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

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date  ON daily_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_backlog_user          ON backlog(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user  ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user         ON subjects(user_id);
