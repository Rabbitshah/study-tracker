const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Backlog Service — Core Business Logic
// Read 04-BACKLOG-LOGIC.md before modifying.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the given date string (YYYY-MM-DD) falls on Saturday or Sunday.
 */
function isWeekendDate(dateStr) {
  // Append T00:00:00 to avoid timezone parse issues
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

/**
 * Run end-of-day backlog calculation for a user on a given date.
 * Wrapped in a DB transaction — all subjects succeed or all roll back.
 *
 * @param {string} userId
 * @param {string} date - YYYY-MM-DD
 * @returns {Array} summary - one entry per active subject processed
 */
async function calculateEndOfDay(userId, date) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get all active subjects for user
    const { rows: subjects } = await client.query(
      'SELECT * FROM subjects WHERE user_id = $1 AND active = true ORDER BY priority ASC',
      [userId]
    );

    const isWeekend = isWeekendDate(date);
    const summary = [];

    for (const subject of subjects) {
      const baseTarget = isWeekend
        ? subject.weekend_target_minutes
        : subject.weekday_target_minutes;

      // Skip: no target for this day type (rest day)
      if (baseTarget === 0) continue;

      // 2. Get the log for this subject+date (may not exist if user never logged)
      const { rows: logs } = await client.query(
        'SELECT * FROM daily_logs WHERE user_id = $1 AND subject_id = $2 AND log_date = $3',
        [userId, subject.id, date]
      );
      const log = logs[0] || null;

      // If day already ended for this subject, skip (idempotency)
      if (log && log.day_ended) continue;

      const completed = log ? log.completed_minutes : 0;
      const planned = log ? log.planned_minutes : baseTarget;
      const delta = planned - completed;

      // 3. Get current backlog
      const { rows: backlogs } = await client.query(
        'SELECT accumulated_minutes FROM backlog WHERE user_id = $1 AND subject_id = $2',
        [userId, subject.id]
      );
      let currentBacklog = backlogs[0]?.accumulated_minutes ?? 0;

      // 4. Apply delta
      if (delta > 0) {
        // Missed time → add to backlog
        currentBacklog += delta;
      } else {
        // Extra work done → reduce backlog, floor at 0
        currentBacklog = Math.max(0, currentBacklog - Math.abs(delta));
      }

      // 5. Upsert backlog table
      await client.query(
        `INSERT INTO backlog (user_id, subject_id, accumulated_minutes, last_updated)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, subject_id)
         DO UPDATE SET accumulated_minutes = $3, last_updated = NOW()`,
        [userId, subject.id, currentBacklog]
      );

      // 6. Mark log as ended (create a ghost log if never logged)
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
        subject_id: subject.id,
        subject_name: subject.name,
        planned,
        completed,
        delta,
        backlog_added: delta > 0 ? delta : 0,
        backlog_reduced: delta < 0 ? Math.abs(delta) : 0,
        new_backlog_total: currentBacklog,
        status: delta > 0 ? 'missed' : delta < 0 ? 'exceeded' : 'exact',
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
 * Calculate planned minutes for a subject on a given date,
 * factoring in current backlog with the 2× cap.
 *
 * @param {string} userId
 * @param {string} subjectId
 * @param {string} date - YYYY-MM-DD
 * @returns {{ planned, base, carry, skip }}
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

  if (baseTarget === 0) {
    return { planned: 0, base: 0, carry: 0, skip: true };
  }

  const { rows: backlogs } = await pool.query(
    'SELECT accumulated_minutes FROM backlog WHERE user_id = $1 AND subject_id = $2',
    [userId, subjectId]
  );
  const backlog = backlogs[0]?.accumulated_minutes ?? 0;

  // Cap carry at 2× base target — prevents impossible recovery days
  const effectiveCarry = Math.min(backlog, baseTarget * 2);

  return {
    planned: baseTarget + effectiveCarry,
    base: baseTarget,
    carry: effectiveCarry,
    skip: false,
  };
}

module.exports = { calculateEndOfDay, getNextDayPlanned, isWeekendDate };
