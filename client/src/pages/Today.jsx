import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import SubjectCard from '../components/SubjectCard';
import EndDayModal from '../components/EndDayModal';
import StreakBanner from '../components/StreakBanner';
import { todayStr, dayType, formatDateLong, formatMinutes } from '../utils/dateHelpers';

export default function Today() {
  const today = todayStr();
  const [showModal, setShowModal] = useState(false);

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['today', today],
    queryFn: () => api.get(`/logs?date=${today}`).then(r => r.data),
    refetchInterval: 60000, // refetch every minute
  });

  const { data: streakData } = useQuery({
    queryKey: ['streak'],
    queryFn: () => api.get('/progress/streak').then(r => r.data),
  });

  const totalPlanned = logs.reduce((s, l) => s + l.planned_minutes, 0);
  const totalCompleted = logs.reduce((s, l) => s + l.completed_minutes, 0);
  const overallPct = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
  const dayEnded = logs.length > 0 && logs.every(l => l.day_ended);

  const isWeekend = dayType(today) === 'Weekend';

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{formatDateLong(today)}</h1>
          <span className={`badge ${isWeekend ? 'badge-weekend' : 'badge-weekday'}`}>
            {isWeekend ? 'Weekend' : 'Weekday'}
          </span>
        </div>
        <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
          {dayEnded ? 'Day ended — see you tomorrow 👋' : 'Log your study sessions as you go'}
        </p>
      </div>

      <StreakBanner streak={streakData?.current_streak} />

      {/* Subject cards */}
      {isLoading && (
        <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: 40 }}>
          Loading today's plan...
        </div>
      )}

      {error && (
        <div style={{ color: '#fca5a5', textAlign: 'center', padding: 40 }}>
          Failed to load. Check your connection.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {!isLoading && logs.length === 0 ? (
          <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '40px 20px', fontSize: 14 }}>
            No active subjects. Go to Settings to enable some.
          </div>
        ) : (
          logs.map(log => (
            <SubjectCard key={log.subject_id} log={log} date={today} />
          ))
        )}
      </div>

      {/* Bottom summary bar */}
      {logs.length > 0 && (
        <div className="card-2" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 80,
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Today's total</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {formatMinutes(totalCompleted)} <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>of {formatMinutes(totalPlanned)}</span>
            </div>
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            color: overallPct >= 100 ? '#22c55e' : overallPct >= 50 ? '#f59e0b' : '#ef4444',
          }}>
            {overallPct}%
          </div>
        </div>
      )}

      {/* End Day button */}
      {!dayEnded && logs.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 74,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'linear-gradient(to top, var(--color-bg) 70%, transparent)',
          zIndex: 30,
        }}>
          <button
            id="end-day-btn"
            className="btn btn-danger"
            onClick={() => setShowModal(true)}
            style={{ width: '100%', maxWidth: 440, margin: '0 auto', display: 'block' }}
          >
            End Day
          </button>
        </div>
      )}

      {showModal && (
        <EndDayModal
          logs={logs}
          date={today}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
