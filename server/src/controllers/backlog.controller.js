const pool = require('../config/db');

// ─── GET /api/backlog ─────────────────────────────────────────────────────────

async function getBacklog(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.subject_id, s.name AS subject_name, s.color AS subject_color,
              b.accumulated_minutes,
              ROUND(b.accumulated_minutes::numeric / 60, 2) AS accumulated_hours,
              b.last_updated
       FROM backlog b
       JOIN subjects s ON s.id = b.subject_id
       WHERE b.user_id = $1 AND s.active = true
       ORDER BY s.priority ASC`,
      [req.user.id]
    );
    return res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/backlog/:subject_id ─────────────────────────────────────────
// Emergency reset — sets accumulated_minutes to 0

async function clearBacklog(req, res, next) {
  const { subject_id } = req.params;

  try {
    // Verify subject ownership
    const check = await pool.query(
      'SELECT s.name FROM subjects s WHERE s.id = $1 AND s.user_id = $2',
      [subject_id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Subject not found or access denied', status: 403 });
    }

    await pool.query(
      `UPDATE backlog SET accumulated_minutes = 0, last_updated = NOW()
       WHERE user_id = $1 AND subject_id = $2`,
      [req.user.id, subject_id]
    );

    return res.status(200).json({ message: `Backlog cleared for ${check.rows[0].name}` });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBacklog, clearBacklog };
