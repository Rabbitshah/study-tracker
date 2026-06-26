import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../services/api';
import { lastNDays } from '../utils/dateHelpers';

function GRECard({ title, data: cardData, accentColor, weeklyRaw }) {
  if (!cardData) return null;

  const days = lastNDays(7);
  const subjectKey = title === 'GRE Quant' ? 'GRE Quant' : 'GRE Verbal';

  const chartData = days.map(day => {
    const dayName = new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    const row = weeklyRaw.find(r => {
      const d = r.log_date?.split?.('T')?.[0] || r.log_date;
      return d === day && r.subject_name === subjectKey;
    });
    return { day: dayName, hours: row ? Math.round(row.completed / 60 * 10) / 10 : 0 };
  });

  const dailyTargetHrs = cardData.daily_avg_needed_minutes / 60;
  const isQuant = title === 'GRE Quant';

  return (
    <div className="luminous-card slide-left" style={{
      padding: '22px 24px',
      borderLeft: `3px solid ${accentColor}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background tint */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%',
        background: `linear-gradient(to left, ${accentColor}08, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: accentColor, fontSize: 20 }}>
            {isQuant ? 'functions' : 'translate'}
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--on-surface)' }}>
            {title}
          </h2>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--error)',
          background: 'rgba(255,180,171,0.1)',
          padding: '3px 10px',
          borderRadius: 20,
          border: '1px solid rgba(255,180,171,0.2)',
          letterSpacing: '0.04em',
        }}>
          {cardData.days_to_deadline}d to Sept 30
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'THIS WEEK', value: `${cardData.hours_this_week.toFixed(1)}h` },
          { label: 'TOTAL LOGGED', value: `${cardData.hours_total.toFixed(1)}h` },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface-container)',
            border: '1px solid var(--border-muted)',
            borderRadius: 8,
            padding: '12px 16px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: accentColor }}>
              {stat.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--on-surface-variant)', letterSpacing: '0.06em', marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 8, letterSpacing: '0.06em' }}>
        HOURS / DAY
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={chartData} barSize={14}>
          <XAxis dataKey="day" tick={{ fill: '#bcc9cd', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#bcc9cd', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" width={22} />
          <Tooltip
            contentStyle={{ background: 'var(--surface-container)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            cursor={{ fill: `${accentColor}10` }}
          />
          <ReferenceLine y={dailyTargetHrs} stroke={accentColor} strokeDasharray="4 3" strokeOpacity={0.5} />
          <Bar dataKey="hours" fill={accentColor} radius={[3, 3, 0, 0]} name="Hours" />
        </BarChart>
      </ResponsiveContainer>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: accentColor }}>target</span>
        Daily target: {cardData.daily_avg_needed_minutes} min/day
      </div>
    </div>
  );
}

export default function GRE() {
  const { data, isLoading } = useQuery({
    queryKey: ['gre'],
    queryFn: () => api.get('/progress/gre').then(r => r.data),
  });

  const { data: weeklyRaw = [] } = useQuery({
    queryKey: ['weekly'],
    queryFn: () => api.get('/progress/weekly').then(r => r.data),
  });

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 4 }}>
          GRE Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 1, height: 14, background: 'var(--border-muted)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
            Target: 320+ · Exam: September 30, 2026
          </span>
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 60, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)', letterSpacing: '0.08em' }}>
          LOADING GRE DATA…
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GRECard title="GRE Quant"  data={data.quant}  accentColor="#4cd7f6" weeklyRaw={weeklyRaw} />
          <GRECard title="GRE Verbal" data={data.verbal} accentColor="#d0bcff" weeklyRaw={weeklyRaw} />
        </div>
      )}
    </div>
  );
}
