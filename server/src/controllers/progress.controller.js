const pool = require('../config/db');

// ─── GET /api/progress/overview ───────────────────────────────────────────────
// Completion summary per subject for current week (Mon–today)

async function getOverview(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT
         s.id AS subject_id,
         s.name AS subject_name,
         s.color AS subject_color,
         COALESCE(SUM(dl.planned_minutes), 0)   AS total_planned_this_week,
         COALESCE(SUM(dl.completed_minutes), 0) AS total_completed_this_week,
         CASE
           WHEN COALESCE(SUM(dl.planned_minutes), 0) = 0 THEN 0
           ELSE ROUND(
             100.0 * COALESCE(SUM(dl.completed_minutes), 0)
             / COALESCE(SUM(dl.planned_minutes), 1)
           )
         END AS completion_pct,
         ROUND(COALESCE(SUM(dl.completed_minutes), 0)::numeric / 60, 2) AS hours_completed
       FROM subjects s
       LEFT JOIN daily_logs dl
         ON dl.subject_id = s.id
         AND dl.user_id = s.user_id
         AND dl.log_date >= date_trunc('week', CURRENT_DATE)
         AND dl.log_date <= CURRENT_DATE
       WHERE s.user_id = $1 AND s.active = true
       GROUP BY s.id, s.name, s.color
       ORDER BY s.priority ASC`,
      [req.user.id]
    );

    return res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/progress/streak ─────────────────────────────────────────────────
// Consecutive days with >= 50% total completion

async function getStreak(req, res, next) {
  try {
    // Get last 90 days of daily totals
    const { rows } = await pool.query(
      `SELECT
         dl.log_date,
         SUM(dl.planned_minutes)   AS total_planned,
         SUM(dl.completed_minutes) AS total_completed
       FROM daily_logs dl
       JOIN subjects s ON s.id = dl.subject_id
       WHERE dl.user_id = $1
         AND dl.log_date >= CURRENT_DATE - INTERVAL '90 days'
         AND s.active = true
       GROUP BY dl.log_date
       ORDER BY dl.log_date DESC`,
      [req.user.id]
    );

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Walk backwards from yesterday (today might not be ended)
    const today = new Date().toISOString().split('T')[0];
    const dailyRows = rows.filter(r => r.log_date.toISOString().split('T')[0] !== today);

    for (let i = 0; i < dailyRows.length; i++) {
      const row = dailyRows[i];
      const pct = row.total_planned > 0
        ? (row.total_completed / row.total_planned) * 100
        : 0;

      if (pct >= 50) {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak; // still building from most recent
      } else {
        if (i === 0) currentStreak = 0; // most recent day broke streak
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak, currentStreak);

    return res.status(200).json({ current_streak: currentStreak, best_streak: bestStreak });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/progress/weekly ─────────────────────────────────────────────────
// Last 7 days per subject

async function getWeekly(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT
         dl.log_date,
         s.id AS subject_id,
         s.name AS subject_name,
         s.color AS subject_color,
         dl.planned_minutes AS planned,
         dl.completed_minutes AS completed
       FROM daily_logs dl
       JOIN subjects s ON s.id = dl.subject_id
       WHERE dl.user_id = $1
         AND dl.log_date >= CURRENT_DATE - INTERVAL '6 days'
         AND s.active = true
       ORDER BY dl.log_date ASC, s.priority ASC`,
      [req.user.id]
    );

    return res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/progress/gre ────────────────────────────────────────────────────
// GRE-specific stats for Quant and Verbal

async function getGRE(req, res, next) {
  try {
    const GRE_DEADLINE = '2026-09-30';

    const { rows } = await pool.query(
      `SELECT
         s.name,
         s.weekday_target_minutes,
         COALESCE(SUM(CASE WHEN dl.log_date >= date_trunc('week', CURRENT_DATE) THEN dl.completed_minutes ELSE 0 END), 0) AS minutes_this_week,
         COALESCE(SUM(dl.completed_minutes), 0) AS minutes_total
       FROM subjects s
       LEFT JOIN daily_logs dl ON dl.subject_id = s.id AND dl.user_id = s.user_id
       WHERE s.user_id = $1
         AND s.active = true
         AND s.name IN ('GRE Quant', 'GRE Verbal')
       GROUP BY s.id, s.name, s.weekday_target_minutes`,
      [req.user.id]
    );

    const daysToDeadline = Math.ceil(
      (new Date(GRE_DEADLINE) - new Date()) / (1000 * 60 * 60 * 24)
    );

    const buildCard = (row) => ({
      hours_this_week: parseFloat((row.minutes_this_week / 60).toFixed(2)),
      hours_total: parseFloat((row.minutes_total / 60).toFixed(2)),
      days_to_deadline: daysToDeadline,
      daily_avg_needed_minutes: row.weekday_target_minutes,
    });

    const quantRow = rows.find(r => r.name === 'GRE Quant');
    const verbalRow = rows.find(r => r.name === 'GRE Verbal');

    return res.status(200).json({
      quant: quantRow ? buildCard(quantRow) : null,
      verbal: verbalRow ? buildCard(verbalRow) : null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview, getStreak, getWeekly, getGRE };
