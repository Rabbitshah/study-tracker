const pool = require('../config/db');

// ─── GET /api/subjects ────────────────────────────────────────────────────────

async function getSubjects(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, color, weekday_target_minutes, weekend_target_minutes,
              priority, active, deadline, created_at
       FROM subjects
       WHERE user_id = $1 AND active = true
       ORDER BY priority ASC, name ASC`,
      [req.user.id]
    );
    return res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/subjects ───────────────────────────────────────────────────────

async function createSubject(req, res, next) {
  const { name, color, weekday_target_minutes, weekend_target_minutes, priority, deadline } = req.body;

  if (!name || weekday_target_minutes == null || weekend_target_minutes == null) {
    return res.status(400).json({ error: 'name, weekday_target_minutes, and weekend_target_minutes are required', status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO subjects
         (user_id, name, color, weekday_target_minutes, weekend_target_minutes, priority, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        name,
        color || '#6366f1',
        weekday_target_minutes,
        weekend_target_minutes,
        priority || 1,
        deadline || null,
      ]
    );

    const subject = rows[0];

    // Initialize backlog row
    await client.query(
      `INSERT INTO backlog (user_id, subject_id, accumulated_minutes)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id, subject_id) DO NOTHING`,
      [req.user.id, subject.id]
    );

    await client.query('COMMIT');
    return res.status(201).json(subject);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// ─── PATCH /api/subjects/:id ──────────────────────────────────────────────────

async function updateSubject(req, res, next) {
  const { id } = req.params;
  const { name, color, weekday_target_minutes, weekend_target_minutes, priority, active, deadline } = req.body;

  try {
    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM subjects WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Subject not found or access denied', status: 403 });
    }

    // Build dynamic SET clause from provided fields only
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined)                      { fields.push(`name = $${idx++}`);                      values.push(name); }
    if (color !== undefined)                     { fields.push(`color = $${idx++}`);                     values.push(color); }
    if (weekday_target_minutes !== undefined)    { fields.push(`weekday_target_minutes = $${idx++}`);    values.push(weekday_target_minutes); }
    if (weekend_target_minutes !== undefined)    { fields.push(`weekend_target_minutes = $${idx++}`);    values.push(weekend_target_minutes); }
    if (priority !== undefined)                  { fields.push(`priority = $${idx++}`);                  values.push(priority); }
    if (active !== undefined)                    { fields.push(`active = $${idx++}`);                    values.push(active); }
    if (deadline !== undefined)                  { fields.push(`deadline = $${idx++}`);                  values.push(deadline); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update', status: 400 });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE subjects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    return res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/subjects/:id ─────────────────────────────────────────────────

async function deleteSubject(req, res, next) {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `UPDATE subjects SET active = false WHERE id = $1 AND user_id = $2 RETURNING name`,
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Subject not found or access denied', status: 403 });
    }

    return res.status(200).json({ message: `Subject "${rows[0].name}" deactivated` });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSubjects, createSubject, updateSubject, deleteSubject };
