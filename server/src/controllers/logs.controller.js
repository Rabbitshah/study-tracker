const pool = require('../config/db');
const { calculateEndOfDay, getNextDayPlanned } = require('../services/backlogService');

// ─── GET /api/logs?date=YYYY-MM-DD ────────────────────────────────────────────

async function getLogs(req, res, next) {
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)', status: 400 });
  }

  try {
    // Get all active subjects
    const { rows: subjects } = await pool.query(
      `SELECT id, name, color, weekday_target_minutes, weekend_target_minutes, priority
       FROM subjects WHERE user_id = $1 AND active = true ORDER BY priority ASC`,
      [req.user.id]
    );

    // Get existing logs for this date
    const { rows: logs } = await pool.query(
      `SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = $2`,
      [req.user.id, date]
    );
    const logMap = Object.fromEntries(logs.map(l => [l.subject_id, l]));

    // Get backlog for all subjects
    const { rows: backlogs } = await pool.query(
      `SELECT subject_id, accumulated_minutes FROM backlog WHERE user_id = $1`,
      [req.user.id]
    );
    const backlogMap = Object.fromEntries(backlogs.map(b => [b.subject_id, b.accumulated_minutes]));

    const result = [];

    for (const subject of subjects) {
      const planned = await getNextDayPlanned(req.user.id, subject.id, date);
      if (planned?.skip) continue; // Rest day — skip

      const log = logMap[subject.id] || null;
      const accumulatedBacklog = backlogMap[subject.id] ?? 0;

      result.push({
        subject_id: subject.id,
        subject_name: subject.name,
        subject_color: subject.color,
        priority: subject.priority,
        log_id: log?.id || null,
        log_date: date,
        planned_minutes: log ? log.planned_minutes : planned.planned,
        completed_minutes: log ? log.completed_minutes : 0,
        backlog_carry: planned.carry,
        base_target: planned.base,
        day_ended: log?.day_ended || false,
        notes: log?.notes || null,
        accumulated_backlog: accumulatedBacklog,
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/logs ───────────────────────────────────────────────────────────
// Upsert — ADDS completed_minutes (not replaces)

async function createLog(req, res, next) {
  const { subject_id, log_date, completed_minutes, notes } = req.body;

  if (!subject_id || !log_date || completed_minutes == null) {
    return res.status(400).json({ error: 'subject_id, log_date, completed_minutes required', status: 400 });
  }
  if (!Number.isInteger(completed_minutes) || completed_minutes < 0) {
    return res.status(400).json({ error: 'completed_minutes must be a non-negative integer', status: 400 });
  }

  try {
    // Verify subject ownership
    const subjectCheck = await pool.query(
      'SELECT id FROM subjects WHERE id = $1 AND user_id = $2 AND active = true',
      [subject_id, req.user.id]
    );
    if (subjectCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Subject not found or access denied', status: 403 });
    }

    // Get planned for this date (for new log creation)
    const planned = await getNextDayPlanned(req.user.id, subject_id, log_date);
    const plannedMinutes = planned?.planned ?? 0;

    // Upsert: if log exists, ADD minutes; if not, create
    const { rows } = await pool.query(
      `INSERT INTO daily_logs (user_id, subject_id, log_date, planned_minutes, completed_minutes, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, subject_id, log_date)
       DO UPDATE SET
         completed_minutes = daily_logs.completed_minutes + $5,
         notes = COALESCE($6, daily_logs.notes)
       RETURNING *`,
      [req.user.id, subject_id, log_date, plannedMinutes, completed_minutes, notes || null]
    );

    return res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/logs/:id ──────────────────────────────────────────────────────
// Direct override (for corrections)

async function updateLog(req, res, next) {
  const { id } = req.params;
  const { completed_minutes, notes } = req.body;

  try {
    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM daily_logs WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Log not found or access denied', status: 403 });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (completed_minutes !== undefined) { fields.push(`completed_minutes = $${idx++}`); values.push(completed_minutes); }
    if (notes !== undefined)             { fields.push(`notes = $${idx++}`);             values.push(notes); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update', status: 400 });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE daily_logs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    return res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/logs/end-day ───────────────────────────────────────────────────

async function endDay(req, res, next) {
  const { date } = req.body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date required (YYYY-MM-DD)', status: 400 });
  }

  try {
    // Check if already ended (at least one log with day_ended = true)
    const { rows: existing } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM daily_logs
       WHERE user_id = $1 AND log_date = $2 AND day_ended = true`,
      [req.user.id, date]
    );

    if (parseInt(existing[0].cnt) > 0) {
      // Return cached summary without recalculating
      const { rows: summary } = await pool.query(
        `SELECT s.name AS subject_name, dl.planned_minutes, dl.completed_minutes,
                (dl.planned_minutes - dl.completed_minutes) AS delta,
                b.accumulated_minutes AS new_backlog_total
         FROM daily_logs dl
         JOIN subjects s ON s.id = dl.subject_id
         LEFT JOIN backlog b ON b.subject_id = dl.subject_id AND b.user_id = dl.user_id
         WHERE dl.user_id = $1 AND dl.log_date = $2 AND dl.day_ended = true`,
        [req.user.id, date]
      );
      return res.status(200).json({ date, already_ended: true, summary });
    }

    // Run backlog calculation
    const summary = await calculateEndOfDay(req.user.id, date);

    return res.status(200).json({ date, already_ended: false, summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLogs, createLog, updateLog, endDay };
