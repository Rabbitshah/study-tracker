const pool = require('./db');

// ─────────────────────────────────────────
// Default subjects seeded on register
// ─────────────────────────────────────────
const DEFAULT_SUBJECTS = [
  {
    name: 'GRE Quant',
    color: '#6366f1',
    priority: 1,
    weekday_target_minutes: 45,
    weekend_target_minutes: 90,
    deadline: '2026-09-30',
  },
  {
    name: 'GRE Verbal',
    color: '#8b5cf6',
    priority: 1,
    weekday_target_minutes: 45,
    weekend_target_minutes: 90,
    deadline: '2026-09-30',
  },
  {
    name: 'Meta Android',
    color: '#f59e0b',
    priority: 2,
    weekday_target_minutes: 60,
    weekend_target_minutes: 120,
    deadline: '2026-09-14',
  },
  {
    name: 'Unity Game Design',
    color: '#10b981',
    priority: 3,
    weekday_target_minutes: 30,
    weekend_target_minutes: 60,
    deadline: '2026-09-14',
  },
];

// ─────────────────────────────────────────
// Meta Android Developer courses — 297 hrs
// ─────────────────────────────────────────
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
  { order_index: 12, course_name: 'Coding Interview Preparation',                           total_hours: 11 },
];

// ─────────────────────────────────────────
// Unity Game Design courses — 78 hrs
// ─────────────────────────────────────────
const UNITY_COURSES = [
  { order_index: 1, course_name: 'Game Design and Development 1: 2D Shooter',    total_hours: 16 },
  { order_index: 2, course_name: 'Game Design and Development 2: 2D Platformer', total_hours: 14 },
  { order_index: 3, course_name: 'Game Design and Development 3: 3D Shooter',    total_hours: 14 },
  { order_index: 4, course_name: 'Game Design and Development 4: 3D Platformer', total_hours: 17 },
  { order_index: 5, course_name: 'Game Design and Development 5: Capstone',      total_hours: 17 },
];

/**
 * Seed default subjects, courses, and initial backlog rows for a new user.
 * Called inside auth.controller register — wrapped in the same transaction.
 */
async function seedNewUser(userId, client) {
  const subjectIds = [];

  // Insert default subjects
  for (const s of DEFAULT_SUBJECTS) {
    const { rows } = await client.query(
      `INSERT INTO subjects
         (user_id, name, color, weekday_target_minutes, weekend_target_minutes, priority, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, s.name, s.color, s.weekday_target_minutes, s.weekend_target_minutes, s.priority, s.deadline]
    );
    subjectIds.push(rows[0].id);
  }

  // Initialize backlog rows (all 0)
  for (const subjectId of subjectIds) {
    await client.query(
      `INSERT INTO backlog (user_id, subject_id, accumulated_minutes)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id, subject_id) DO NOTHING`,
      [userId, subjectId]
    );
  }

  // Insert Meta Android courses
  for (const c of META_ANDROID_COURSES) {
    await client.query(
      `INSERT INTO course_progress
         (user_id, course_name, parent_cert, total_hours, deadline, order_index)
       VALUES ($1, $2, 'Meta Android', $3, '2026-09-14', $4)`,
      [userId, c.course_name, c.total_hours, c.order_index]
    );
  }

  // Insert Unity courses
  for (const c of UNITY_COURSES) {
    await client.query(
      `INSERT INTO course_progress
         (user_id, course_name, parent_cert, total_hours, deadline, order_index)
       VALUES ($1, $2, 'Unity', $3, '2026-09-14', $4)`,
      [userId, c.course_name, c.total_hours, c.order_index]
    );
  }
}

module.exports = { seedNewUser };
