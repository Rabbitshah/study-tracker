# Study Tracker v2 — Comprehensive Expansion Plan

> **Goal:** Evolve the app from a basic time tracker into a smart, analytics-driven study companion for GRE and certifications.

---

## User Review Required

> [!IMPORTANT]
> This is a massive expansion. We will need to update the database schema. Since you just started, the easiest way to apply database changes is to **drop the existing tables and re-run an updated `schema.sql`** (which will wipe the test user). If you want to keep the existing user data, let me know and I will write `ALTER TABLE` migration scripts instead.

> [!WARNING]
> Implementing *everything* will take several iterations. I have organized this into logical phases. Review the phases and let me know if you want to skip or prioritize any specific features.

---

## Phase 1: Critical Fixes & UI Polish (Low Effort, High Impact)

**Goal:** Make the current app rock-solid before adding new features.

1. **Timezone Fix:** Use date-only string comparisons in `courses.controller.js` to fix the "Sept 29 vs Sept 30" deadline shift.
2. **`.gitignore`:** Add standard Node/Vite ignores to protect `.env` files.
3. **Empty States:** Add friendly messages/illustrations for Today, Weekly, Backlog, and Courses when there is no data.
4. **Day Ended State:** When `day_ended` is true, visually disable the SubjectCard inputs on the Today page.
5. **Error Toasts:** Add a global toast notification for API errors (e.g., "Failed to log time").
6. **Token Expiry Check:** Update `useAuth.js` to seamlessly refresh expired tokens on initial load without redirecting to login.

---

## Phase 2: Database Schema Expansion

**Goal:** Add the underlying tables and columns needed for advanced tracking.

### Proposed Schema Changes

1. **`session_logs` (New Table)**
   - Replaces the simple UPSERT in `daily_logs` for tracking *individual* study bursts.
   - Columns: `id`, `user_id`, `subject_id`, `log_date`, `minutes`, `difficulty_rating` (1-5), `energy_level` (1-5), `notes`, `created_at` (timestamp).
   - `daily_logs` becomes a rollup table that caches the daily totals.

2. **`mock_tests` (New Table)**
   - For tracking GRE practice scores.
   - Columns: `id`, `user_id`, `test_date`, `test_name`, `quant_score`, `verbal_score`, `total_score`, `notes`.

3. **`topics` (New Table)**
   - For the GRE topic mastery map.
   - Columns: `id`, `user_id`, `subject_id`, `name` (e.g., "Geometry"), `status` (Not Started, In Progress, Mastered).

4. **Table Modifications**
   - `daily_logs`: Add `is_rest_day` (BOOLEAN DEFAULT FALSE).
   - `course_progress`: Add `notes` (TEXT).

---

## Phase 3: Core Workflow Enhancements

**Goal:** Improve the daily usage experience.

1. **Deadline Countdown:** Add a prominent "X days until GRE" / "Y days until Meta Android" banner to the Today page header.
2. **Partial Course Progress UI:** Add an input field on the Courses page to log partial hours (e.g., "6h done" out of 15h) instead of just a "Mark Done" button.
3. **Rest Day Button:** Add a "Take a Rest Day" button to the Today page. Clicking this sets `is_rest_day = true` for the date, preventing backlog accumulation for that day.
4. **Session Notes UI:** Update the Quick Log FAB and SubjectCard to allow adding a difficulty rating (1-5 stars) and a quick text note when logging minutes.
5. **Manual Log Override:** Add a UI to edit past logs (correcting mistakes).

---

## Phase 4: GRE-Specific Dashboards

**Goal:** Make the GRE page a true command center for test prep.

1. **Mock Test Tracker:** UI to input practice test scores, with a line chart showing progress towards the 320 target.
2. **Topic Mastery Map:** UI to add GRE topics (Algebra, Reading Comp, etc.) and drag them between "Not Started", "In Progress", and "Mastered" columns.
3. **Study Plan Generator:** A widget that calculates: "You have 73 days left. To hit your target, you need to average 75 min/day instead of your current 45 min/day."

---

## Phase 5: Analytics & History

**Goal:** Visualize study habits and consistency.

1. **Calendar View:** A full month calendar component where each day is color-coded by completion percentage. Clicking a day reveals the detailed `session_logs` and notes for that day.
2. **Predicted Completion Date (Courses):** Calculate and display the projected finish date for certificates based on the user's trailing 7-day velocity.
3. **Consistency Score:** A percentage metric (e.g., "Consistent 18 out of last 30 days") displayed alongside streaks to provide a more forgiving long-term metric.

---

## Verification Plan

1. **Local Dev:** I will execute Phase 1 and verify fixes using local `npm run dev`.
2. **DB Migration:** I will apply Phase 2 schema changes (dropping/recreating tables if you approve, or writing migrations).
3. **Iterative Build:** I will build Phases 3, 4, and 5 sequentially, updating the `task.md` and confirming with you via screenshots/walkthroughs as major visual components (Calendar, Mock Tests) are completed.

### Open Questions for You:
1. **Database:** Can I drop the existing tables and re-run the schema (wiping your test user), or do you want me to preserve the data?
2. **Scope:** Does this cover everything you want? Should we start with Phase 1 and 2 right now?
