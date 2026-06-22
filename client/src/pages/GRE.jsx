import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../services/api';
import { lastNDays } from '../utils/dateHelpers';

function GRECard({ title, data: cardData, color, weeklyRaw }) {
  if (!cardData) return null;

  const days = lastNDays(7);
  const subjectKey = title === 'GRE Quant' ? 'GRE Quant' : 'GRE Verbal';

  const chartData = days.map(day => {
    const dayName = new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    const row = weeklyRaw.find(r => {
      const d = r.log_date?.split?.('T')?.[0] || r.log_date;
      return d === day && r.subject_name === subjectKey;
    });
    return {
      day: dayName,
      minutes: row ? Math.round(row.completed / 60 * 10) / 10 : 0,
    };
  });

  const dailyTargetHrs = cardData.daily_avg_needed_minutes / 60;

  return (
    <div className="card" style={{ borderTop: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontWeight: 700, fontSize: 16 }}>{title}</h2>
        <div style={{
          fontSize: 12,
          color: '#fca5a5',
          background: 'rgba(239,68,68,0.1)',
          padding: '3px 10px',
          borderRadius: 20,
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          {cardData.days_to_deadline}d to Sept 30
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="card-2" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>
            {cardData.hours_this_week.toFixed(1)}h
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>This week</div>
        </div>
        <div className="card-2" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>
            {cardData.hours_total.toFixed(1)}h
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>Total logged</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 8 }}>Hours per day (this week)</div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} barSize={20}>
          <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" width={24} />
          <Tooltip
            contentStyle={{ background: '#1c1c28', border: '1px solid #2a2a3d', borderRadius: 8, fontSize: 11 }}
          />
          <ReferenceLine y={dailyTargetHrs} stroke={color} strokeDasharray="4 2" strokeOpacity={0.5} />
          <Bar dataKey="minutes" fill={color} radius={[4, 4, 0, 0]} name="Hours" />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8 }}>
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
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>GRE Dashboard</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 24 }}>
        Target: 320+ · Exam: September 30, 2026
      </p>

      {isLoading && (
        <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: 40 }}>Loading...</div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GRECard title="GRE Quant"  data={data.quant}  color="#6366f1" weeklyRaw={weeklyRaw} />
          <GRECard title="GRE Verbal" data={data.verbal} color="#8b5cf6" weeklyRaw={weeklyRaw} />
        </div>
      )}
    </div>
  );
}
