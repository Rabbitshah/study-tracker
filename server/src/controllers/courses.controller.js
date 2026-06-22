const pool = require('../config/db');

// ─── GET /api/courses ─────────────────────────────────────────────────────────

async function getCourses(req, res, next) {
  try {
    const { rows: courses } = await pool.query(
      `SELECT * FROM course_progress WHERE user_id = $1 ORDER BY parent_cert, order_index ASC`,
      [req.user.id]
    );

    // Get subject daily targets for on-track calculation
    const { rows: subjects } = await pool.query(
      `SELECT name, weekday_target_minutes FROM subjects WHERE user_id = $1 AND active = true`,
      [req.user.id]
    );

    const androidSubject = subjects.find(s => s.name === 'Meta Android');
    const unitySubject   = subjects.find(s => s.name === 'Unity Game Design');

    const androidTargetHrs = (androidSubject?.weekday_target_minutes ?? 60) / 60;
    const unityTargetHrs   = (unitySubject?.weekday_target_minutes ?? 30) / 60;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Using year, monthIndex(0-11), day to force local timezone midnight
    const DEADLINES = {
      'Meta Android': new Date(2026, 8, 14),
      'Unity':        new Date(2026, 8, 14),
    };

    function buildCertBlock(certCourses, certKey, dailyTargetHrs) {
      const deadline     = DEADLINES[certKey];
      const daysRemaining = Math.max(0, Math.round((deadline - today) / (1000 * 60 * 60 * 24)));
      const totalHours    = certCourses.reduce((s, c) => s + parseFloat(c.total_hours), 0);
      const completedHours = certCourses.reduce((s, c) => s + parseFloat(c.completed_hours), 0);
      const completionPct  = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
      const hoursRemaining = totalHours - completedHours;
      const hoursPerDayNeeded = daysRemaining > 0 ? hoursRemaining / daysRemaining : hoursRemaining;

      let status;
      if (hoursPerDayNeeded <= dailyTargetHrs)        status = 'On Track';
      else if (hoursPerDayNeeded <= dailyTargetHrs * 1.5) status = 'Slightly Behind';
      else                                             status = 'Behind';

      return {
        total_hours: parseFloat(totalHours.toFixed(2)),
        completed_hours: parseFloat(completedHours.toFixed(2)),
        completion_pct: completionPct,
        deadline: deadline.toISOString().split('T')[0],
        days_remaining: daysRemaining,
        hours_per_day_needed: parseFloat(hoursPerDayNeeded.toFixed(2)),
        status,
        courses: certCourses.map(c => ({
          id: c.id,
          order_index: c.order_index,
          course_name: c.course_name,
          total_hours: parseFloat(c.total_hours),
          completed_hours: parseFloat(c.completed_hours),
          completion_pct: c.total_hours > 0
            ? Math.round((c.completed_hours / c.total_hours) * 100)
            : 0,
          completed: c.completed,
        })),
      };
    }

    const androidCourses = courses.filter(c => c.parent_cert === 'Meta Android');
    const unityCourses   = courses.filter(c => c.parent_cert === 'Unity');

    return res.status(200).json({
      meta_android: buildCertBlock(androidCourses, 'Meta Android', androidTargetHrs),
      unity:        buildCertBlock(unityCourses,   'Unity',        unityTargetHrs),
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/courses/:id ───────────────────────────────────────────────────

async function updateCourse(req, res, next) {
  const { id } = req.params;
  const { completed_hours } = req.body;

  if (completed_hours == null || isNaN(completed_hours) || completed_hours < 0) {
    return res.status(400).json({ error: 'completed_hours must be a non-negative number', status: 400 });
  }

  try {
    // Verify ownership and get total_hours
    const { rows } = await pool.query(
      'SELECT id, total_hours FROM course_progress WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Course not found or access denied', status: 403 });
    }

    if (completed_hours > parseFloat(rows[0].total_hours)) {
      return res.status(400).json({ error: 'completed_hours cannot exceed total_hours', status: 400 });
    }

    const { rows: updated } = await pool.query(
      `UPDATE course_progress
       SET completed_hours = $1,
           completed = CASE WHEN $1 >= total_hours THEN true ELSE false END
       WHERE id = $2
       RETURNING *`,
      [completed_hours, id]
    );

    return res.status(200).json(updated[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/courses/:id/complete ──────────────────────────────────────────

async function completeCourse(req, res, next) {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `UPDATE course_progress
       SET completed = true, completed_hours = total_hours
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Course not found or access denied', status: 403 });
    }

    return res.status(200).json({ message: 'Course marked complete', course: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCourses, updateCourse, completeCourse };
