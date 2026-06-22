const cron = require('node-cron');
const pool = require('../config/db');
const { calculateEndOfDay } = require('../services/backlogService');

/**
 * Midnight cron job — runs at 00:01 every day.
 * Triggers end-of-day backlog calculation for all users who have logs
 * from yesterday but haven't manually clicked End Day.
 */
function startMidnightCron() {
  // Run at 00:01 daily UTC
  cron.schedule('1 0 * * *', async () => {
    console.log('[Cron] Midnight end-day job running...');

    try {
      // Yesterday's date string
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      // All users
      const { rows: users } = await pool.query('SELECT id FROM users');
      console.log(`[Cron] Processing ${users.length} users for date ${dateStr}`);

      for (const user of users) {
        try {
          // Only process if: user has logs for yesterday AND at least one is not ended
          const { rows: logs } = await pool.query(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN day_ended = true THEN 1 ELSE 0 END) AS ended
             FROM daily_logs
             WHERE user_id = $1 AND log_date = $2`,
            [user.id, dateStr]
          );

          const total = parseInt(logs[0].total);
          const ended = parseInt(logs[0].ended);

          if (total > 0 && ended < total) {
            await calculateEndOfDay(user.id, dateStr);
            console.log(`[Cron] End-day processed for user ${user.id}`);
          }
        } catch (err) {
          // Don't let one user's failure block others
          console.error(`[Cron] Failed for user ${user.id}:`, err.message);
        }
      }

      console.log('[Cron] Midnight job complete');
    } catch (err) {
      console.error('[Cron] Midnight job fatal error:', err.message);
    }
  });

  console.log('[Cron] Midnight end-day job registered (00:01 UTC daily)');
}

module.exports = { startMidnightCron };
