/**
 * Returns today's date as YYYY-MM-DD string.
 */
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns true if the given date string (YYYY-MM-DD) is Saturday or Sunday.
 */
export function isWeekend(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Returns 'Weekday' or 'Weekend' for a given date string.
 */
export function dayType(dateStr) {
  return isWeekend(dateStr) ? 'Weekend' : 'Weekday';
}

/**
 * Formats a date string as "Saturday, June 21"
 */
export function formatDateLong(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats minutes as "1h 30m" or "45m"
 */
export function formatMinutes(minutes) {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Returns last N days as YYYY-MM-DD strings, oldest first.
 */
export function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}
