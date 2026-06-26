import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { lastNDays, formatMinutes } from '../utils/dateHelpers';
import { completionColor } from '../utils/backlogCalc';

const SUBJECT_COLORS = {
  'GRE Quant':        'var(--primary)',
  'GRE Verbal':       'var(--secondary)',
  'Meta Android':     'var(--tertiary)',
  'Unity Game Design':'var(--success)',
};
const SUBJECT_HEX = {
  'GRE Quant':        '#4cd7f6',
  'GRE Verbal':       '#d0bcff',
  'Meta Android':     '#ffb95f',
  'Unity Game Design':'#10b981',
};

function DayCell({ dayStr, dayLogs }) {
  const dayName = new Date(dayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const hasData = dayLogs.length > 0;
  const totalPlanned   = dayLogs.reduce((s, l) => s + l.planned, 0);
  const totalCompleted = dayLogs.reduce((s, l) => s + l.completed, 0);
  const pct = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
  const cellColor = completionColor(pct, hasData);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
        color: 'var(--on-surface-variant)',
      }}>{dayName}</span>
      <div className="scale-in" style={{
        width: 52, height: 52,
        borderRadius: 10,
        background: hasData ? `${cellColor}22` : 'var(--surface-container)',
        border: `1px solid ${hasData ? `${cellColor}55` : 'var(--border-muted)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontWeight: 700,
        color: hasData ? cellColor : 'rgba(188,201,205,0.3)',
        transition: 'all 0.3s',
      }}>
        {hasData ? `${pct}%` : '—'}
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

  const byDate = {};
  for (const row of weeklyData) {
    const d = row.log_date?.split('T')[0] || row.log_date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(row);
  }

  const chartData = days.map(day => {
    const dayLogs = byDate[day] || [];
    const entry = {
      day: new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    };
    for (const log of dayLogs) {
      entry[log.subject_name] = Math.round(log.completed / 60 * 10) / 10;
    }
    return entry;
  });

  const subjectNames = [...new Set(weeklyData.map(r => r.subject_name))];

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 4, color: 'var(--on-surface)' }}>
          Weekly Overview
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)', letterSpacing: '0.04em' }}>
          Performance analysis — last 7 days
        </p>
      </div>

      {/* Streak cards */}
      {streakData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div className="luminous-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -8, top: -8, opacity: 0.05 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--tertiary)' }}>local_fire_department</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', letterSpacing: '0.06em', marginBottom: 8 }}>
              CURRENT STREAK
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--tertiary)' }}>
              🔥 {streakData.current_streak}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(188,201,205,0.5)', marginTop: 4 }}>DAYS</div>
          </div>
          <div className="luminous-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -8, top: -8, opacity: 0.05 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--primary)' }}>stars</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', letterSpacing: '0.06em', marginBottom: 8 }}>
              BEST STREAK
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
              ⭐ {streakData.best_streak}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(188,201,205,0.5)', marginTop: 4 }}>DAYS</div>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ color: 'var(--on-surface-variant)', textAlign: 'center', padding: '60px 20px',
          fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em' }}>
          LOADING DATA…
        </div>
      )}

      {!isLoading && weeklyData.length === 0 ? (
        <div className="luminous-card" style={{ padding: 40, textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 12 }}>bar_chart</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--on-surface)', marginBottom: 6 }}>No data yet</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)' }}>Start tracking today to see your weekly performance</div>
        </div>
      ) : (
        <>
          {/* 7-Day Completion Grid */}
          <div className="luminous-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', letterSpacing: '0.08em' }}>ACTIVITY CALENDAR</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary)', background: 'rgba(76,215,246,0.1)', padding: '2px 8px', borderRadius: 4 }}>Target: 80%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              {days.map(day => (
                <DayCell key={day} dayStr={day} dayLogs={byDate[day] || []} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
              {[
                { color: '#10B981', label: '≥100%' },
                { color: 'var(--tertiary)', label: '50–99%' },
                { color: 'var(--error)', label: '<50%' },
              ].map(item => (
                <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--on-surface-variant)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="luminous-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 4 }}>Hours Studied Per Day</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)' }}>Subject-wise distribution</div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              {subjectNames.map(name => (
                <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: SUBJECT_HEX[name] || '#4cd7f6', display: 'inline-block' }} />
                  {name}
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barGap={2} barCategoryGap="30%">
                <XAxis dataKey="day" tick={{ fill: '#bcc9cd', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#bcc9cd', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} unit="h" width={28} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-container)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)' }}
                  labelStyle={{ color: 'var(--on-surface)', fontWeight: 700 }}
                  cursor={{ fill: 'rgba(76,215,246,0.05)' }}
                />
                {subjectNames.map(name => (
                  <Bar key={name} dataKey={name} fill={SUBJECT_HEX[name] || '#4cd7f6'} radius={[4, 4, 0, 0]} maxBarSize={18} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Summary Table */}
          <div className="luminous-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', letterSpacing: '0.08em', marginBottom: 16 }}>
              THIS WEEK'S SUMMARY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {overview.map(s => {
                const pct = s.completion_pct;
                const pctColor = pct >= 100 ? '#10B981' : pct >= 50 ? 'var(--tertiary)' : 'var(--error)';
                return (
                  <div key={s.subject_id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.subject_color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>{s.subject_name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)' }}>
                        {formatMinutes(parseInt(s.total_completed_this_week))} / {formatMinutes(parseInt(s.total_planned_this_week))}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: pctColor, minWidth: 38, textAlign: 'right' }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: s.subject_color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
