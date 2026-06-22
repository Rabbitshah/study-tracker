# Backlog Logic

This is the core of the app. Read this before touching `backlogService.js`.

---

## Concept

Every subject has a daily target. At end of day, compare what was planned vs what was done. The difference becomes backlog. Backlog adds to tomorrow's target. Extra work reduces existing backlog.

The goal: no missed time disappears. It always comes back. User must consciously clear it.

---

## End-of-Day Calculation

Run once per subject per day. Triggered by:
- User clicking "End Day" button
- Cron job at 00:01 daily (catches users who forget)

```
delta = planned_minutes - completed_minutes

if delta > 0:
    # missed time → add to backlog
    backlog[subject_id] += delta

if delta <= 0:
    # did extra work → reduce backlog
    backlog[subject_id] = MAX(0, backlog[subject_id] - abs(delta))
    # floor at 0: backlog never goes negative
```

---

## Next Day Planned Minutes

Run when building the GET /logs response for a future or current date.

```
is_weekend = day_of_week in [Saturday, Sunday]

base_target = subject.weekend_target_minutes if is_weekend
              else subject.weekday_target_minutes

if base_target == 0:
    # subject has no target this day type → skip entirely
    skip this subject for today

effective_carry = MIN(backlog[subject_id], base_target * 2)
# cap at 2x daily target — prevents impossible recovery days

planned_minutes = base_target + effective_carry
```

**Why 2x cap:** If you miss 4 days of GRE (4 × 45 = 180 min backlog), without a cap day 5 shows 225 min planned. That's unrealistic and demoralizing. Cap means max you carry per day is 90 min extra. You see the total backlog separately and deal with it over time.

---

## Backlog Accumulation Over Time

Backlog is cumulative. It doesn't reset daily.

Example:
```
Day 1: planned 45, done 20 → backlog += 25 → backlog = 25
Day 2: planned 45+25=70, done 70 → backlog unchanged → backlog = 25
        (only base target carries; extra done doesn't reduce unless completed > planned)
Day 2 alt: planned 70, done 90 → backlog -= 20 → backlog = 5
Day 3: planned 45+5=50, done 0 → backlog += 50 → backlog = 55
```

---

## Skip Conditions

Skip backlog calculation for a subject on a given day if any of:

| Condition | Action |
|---|---|
| `subject.active = false` | Skip entirely |
| `weekend_target = 0` and it's a weekend | Skip, show as "Rest Day" |
| `day_ended = true` already | No-op, return cached result |

---

## Large Backlog Warning

If `total_accumulated_minutes across all subjects > 2 weeks of planned work`:
- Show warning banner in UI
- Message: "Backlog is large. Consider adjusting daily targets in Settings."
- Don't block anything. Just surface it.

2 weeks of planned work = `sum of (weekday_target * 10 + weekend_target * 4)` across subjects. Use this as the threshold.

---

## Implementation: backlogService.js

```javascript
// server/src/services/backlogService.js

const pool = require('../config/db');

/**
 * Run end-of-day backlog calculation for a user on a given date.
 * Returns summary array, one entry per subject.
 */
async function calculateEndOfDay(userId, date) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get all active subjects for user
    const { rows: subjects } = await client.query(
      'SELECT * FROM subjects WHERE user_id = $1 AND active = true',
      [userId]
    );

    const summary = [];

    for (const subject of subjects) {
      const isWeekend = isWeekendDate(date);
      const baseTarget = isWeekend
        ? subject.weekend_target_minutes
        : subject.weekday_target_minutes;

      // Skip if no target for this day type
      if (baseTarget === 0) continue;

      // Get or create log for this subject+date
      const { rows: logs } = await client.query(
        'SELECT * FROM daily_logs WHERE user_id = $1 AND subject_id = $2 AND log_date = $3',
        [userId, subject.id, date]
      );

      const log = logs[0];
      const completed = log ? log.completed_minutes : 0;
      const planned = log ? log.planned_minutes : baseTarget;
      const delta = planned - completed;

      // Get current backlog
      const { rows: backlogs } = await client.query(
        'SELECT accumulated_minutes FROM backlog WHERE user_id = $1 AND subject_id = $2',
        [userId, subject.id]
      );
      let currentBacklog = backlogs[0]?.accumulated_minutes ?? 0;

      // Apply delta
      if (delta > 0) {
        currentBacklog += delta;
      } else {
        currentBacklog = Math.max(0, currentBacklog - Math.abs(delta));
      }

      // Upsert backlog
      await client.query(
        `INSERT INTO backlog (user_id, subject_id, accumulated_minutes, last_updated)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, subject_id)
         DO UPDATE SET accumulated_minutes = $3, last_updated = NOW()`,
        [userId, subject.id, currentBacklog]
      );

      // Mark log as ended (create if missing)
      if (log) {
        await client.query(
          'UPDATE daily_logs SET day_ended = true WHERE id = $1',
          [log.id]
        );
      } else {
        await client.query(
          `INSERT INTO daily_logs
           (user_id, subject_id, log_date, planned_minutes, completed_minutes, day_ended)
           VALUES ($1, $2, $3, $4, 0, true)`,
          [userId, subject.id, date, planned]
        );
      }

      summary.push({
        subject_name: subject.name,
        planned,
        completed,
        delta,
        backlog_added: delta > 0 ? delta : 0,
        backlog_reduced: delta < 0 ? Math.abs(delta) : 0,
        new_backlog_total: currentBacklog,
        status: delta > 0 ? 'missed' : delta < 0 ? 'exceeded' : 'exact'
      });
    }

    await client.query('COMMIT');
    return summary;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Calculate planned minutes for a subject on a given date.
 * Factors in current backlog carry with 2x cap.
 */
async function getNextDayPlanned(userId, subjectId, date) {
  const { rows: subjects } = await pool.query(
    'SELECT * FROM subjects WHERE id = $1 AND user_id = $2',
    [subjectId, userId]
  );
  if (!subjects[0]) return null;

  const subject = subjects[0];
  const isWeekend = isWeekendDate(date);
  const baseTarget = isWeekend
    ? subject.weekend_target_minutes
    : subject.weekday_target_minutes;

  if (baseTarget === 0) return { planned: 0, base: 0, carry: 0, skip: true };

  const { rows: backlogs } = await pool.query(
    'SELECT accumulated_minutes FROM backlog WHERE user_id = $1 AND subject_id = $2',
    [userId, subjectId]
  );
  const backlog = backlogs[0]?.accumulated_minutes ?? 0;
  const effectiveCarry = Math.min(backlog, baseTarget * 2);

  return {
    planned: baseTarget + effectiveCarry,
    base: baseTarget,
    carry: effectiveCarry,
    skip: false
  };
}

/**
 * Returns true if the given date string (YYYY-MM-DD) is Saturday or Sunday.
 */
function isWeekendDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

module.exports = { calculateEndOfDay, getNextDayPlanned };
```

---

## Cron Job: Midnight Auto End-Day

```javascript
// server/src/jobs/midnightEndDay.js
const cron = require('node-cron');
const pool = require('../config/db');
const { calculateEndOfDay } = require('../services/backlogService');

function startMidnightCron() {
  // Run at 00:01 every day
  cron.schedule('1 0 * * *', async () => {
    console.log('[Cron] Running midnight end-day for all users');

    try {
      // Yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      // Get all users
      const { rows: users } = await pool.query('SELECT id FROM users');

      for (const user of users) {
        try {
          // Check if already ended
          const { rows: ended } = await pool.query(
            `SELECT COUNT(*) as cnt FROM daily_logs
             WHERE user_id = $1 AND log_date = $2 AND day_ended = true`,
            [user.id, dateStr]
          );

          // Only run if at least one log exists but day not ended
          const { rows: logs } = await pool.query(
            'SELECT COUNT(*) as cnt FROM daily_logs WHERE user_id = $1 AND log_date = $2',
            [user.id, dateStr]
          );

          if (parseInt(logs[0].cnt) > 0 && parseInt(ended[0].cnt) === 0) {
            await calculateEndOfDay(user.id, dateStr);
          }
        } catch (err) {
          // Don't let one user's failure stop others
          console.error(`[Cron] Failed for user ${user.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Cron] Midnight job failed:', err.message);
    }
  });

  console.log('[Cron] Midnight end-day job registered');
}

module.exports = { startMidnightCron };
```

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| User logs 0 min all day, never clicks End Day | Cron runs at 00:01, catches it |
| User clicks End Day twice same day | Second call detects `day_ended = true`, returns cached summary |
| Subject deactivated mid-week | Excluded from all future backlog calcs. Existing backlog stays but irrelevant |
| Target changed in Settings | New target applies from next day. Past logs untouched |
| Large backlog (missed 2 weeks) | Carried amount still capped at 2x daily target per day. Drain it slowly |
| User does 3x target | Backlog reduced by extra amount. Never negative |
| Weekend, subject has 0 weekend target | Skip that subject for weekend backlog. Show "Rest Day" in UI |
