/**
 * Returns a color string for a backlog severity level.
 */
export function backlogColor(minutes) {
  if (minutes === 0) return '#22c55e';       // green
  if (minutes < 120) return '#f59e0b';       // yellow — < 2hrs
  if (minutes < 300) return '#f97316';       // orange — 2-5hrs
  return '#ef4444';                          // red — 5hrs+
}

/**
 * Returns a completion status color for a day's cell in the weekly grid.
 * pct = completed / planned * 100
 */
export function completionColor(pct, hasData) {
  if (!hasData) return '#2a2a3d';            // grey — no data
  if (pct >= 100) return '#22c55e';          // green
  if (pct >= 50)  return '#f59e0b';          // yellow
  return '#ef4444';                          // red
}

/**
 * Returns a label for course on-track status.
 */
export function statusColor(status) {
  if (status === 'On Track')       return '#22c55e';
  if (status === 'Slightly Behind') return '#f59e0b';
  return '#ef4444';
}
