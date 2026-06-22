import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import api from '../services/api';
import { lastNDays, formatMinutes } from '../utils/dateHelpers';
import { completionColor } from '../utils/backlogCalc';

const SUBJECT_COLORS = {
  'GRE Quant': '#6366f1',
  'GRE Verbal': '#8b5cf6',
  'Meta Android': '#f59e0b',
  'Unity Game Design': '#10b981',
};

function DayCell({ dayStr, dayLogs }) {
  const dayName = new Date(dayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  const dateNum = new Date(dayStr + 'T00:00:00').getDate();

  const hasData = dayLogs.length > 0;
  const totalPlanned = dayLogs.reduce((s, l) => s + l.planned, 0);
  const totalCompleted = dayLogs.reduce((s, l) => s + l.completed, 0);
  const pct = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
  const cellColor = completionColor(pct, hasData);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}>
      <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{dayName}</span>
      <div style={{
        width: 36, height: 36,
        borderRadius: 8,
        background: cellColor + '33',
        border: `2px solid ${cellColor}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: hasData ? cellColor : 'var(--color-muted)',
      }}>
        {hasData ? `${pct}%` : dateNum}
      </div>
    </div>
  );
}

export default function Weekly() {
  const { data: weeklyData = [], isLoading } = useQuery({
    queryKey: ['weekly'],
    queryFn: () => api.get('/progress/weekly').then(r => r.data),
  });

  const { data: streakData } = useQuery({
    queryKey: ['streak'],
    queryFn: () => api.get('/progress/streak').then(r => r.data),
  });

  const { data: overview = [] } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.get('/progress/overview').then(r => r.data),
  });

  const days = lastNDays(7);

  // Group weekly data by date
  const byDate = {};
  for (const row of weeklyData) {
    const d = row.log_date?.split('T')[0] || row.log_date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(row);
  }

  // Chart data
  const chartData = days.map(day => {
    const dayLogs = byDate[day] || [];
    const entry = {
      day: new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    };
    for (const log of dayLogs) {
      entry[log.subject_name] = Math.round(log.completed / 60 * 10) / 10; // hours
    }
    return entry;
  });

  const subjectNames = [...new Set(weeklyData.map(r => r.subject_name))];

  return (
    <div className="page fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Weekly Overview</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 24 }}>Last 7 days</p>

      {/* Streak */}
      {streakData && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div className="card-2" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316' }}>
              🔥 {streakData.current_streak}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>Current Streak</div>
          </div>
          <div className="card-2" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>
              ⭐ {streakData.best_streak}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>Best Streak</div>
          </div>
        </div>
      )}

      {/* 7-day grid */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--color-text-2)' }}>
          Completion Grid
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {days.map(day => (
            <DayCell key={day} dayStr={day} dayLogs={byDate[day] || []} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--color-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> 100%+
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> 50–99%
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> &lt;50%
          </span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--color-text-2)' }}>
          Hours Studied Per Day
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={2}>
            <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" width={28} />
            <Tooltip
              contentStyle={{ background: '#1c1c28', border: '1px solid #2a2a3d', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#f0f0f8' }}
            />
            {subjectNames.map(name => (
              <Bar key={name} dataKey={name} fill={SUBJECT_COLORS[name] || '#6366f1'} radius={[4, 4, 0, 0]} maxBarSize={20} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly totals table */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--color-text-2)' }}>
          This Week's Summary
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {overview.map(s => (
            <div key={s.subject_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.subject_color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{s.subject_name}</span>
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                {formatMinutes(parseInt(s.total_completed_this_week))} / {formatMinutes(parseInt(s.total_planned_this_week))}
              </span>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: s.completion_pct >= 100 ? '#22c55e' : s.completion_pct >= 50 ? '#f59e0b' : '#ef4444',
                minWidth: 36,
                textAlign: 'right',
              }}>
                {s.completion_pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
