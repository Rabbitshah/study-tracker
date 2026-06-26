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
    refetchInterval: 60000,
  });

  const { data: streakData } = useQuery({
    queryKey: ['streak'],
    queryFn: () => api.get('/progress/streak').then(r => r.data),
  });

  const totalPlanned   = logs.reduce((s, l) => s + l.planned_minutes, 0);
  const totalCompleted = logs.reduce((s, l) => s + l.completed_minutes, 0);
  const overallPct     = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
  const dayEnded       = logs.length > 0 && logs.every(l => l.day_ended);
  const isWeekend      = dayType(today) === 'Weekend';

  const pctColor = overallPct >= 100 ? '#10B981' : overallPct >= 50 ? 'var(--tertiary)' : 'var(--error)';

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--on-surface)' }}>
            {formatDateLong(today)}
          </h1>
          <span className={`badge ${isWeekend ? 'badge-weekend' : 'badge-weekday'}`}>
            {isWeekend ? 'Weekend' : 'Weekday'}
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)', letterSpacing: '0.04em' }}>
          {dayEnded ? '✓ Day ended — great work today!' : 'Log your study sessions as you go'}
        </p>
      </div>

      <StreakBanner streak={streakData?.current_streak} />

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--on-surface-variant)',
          fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em' }}>
          LOADING TODAY'S PLAN…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="luminous-card" style={{ padding: '16px 20px', borderLeft: '3px solid var(--error)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--error)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error_outline</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>Failed to load. Check your connection.</span>
          </div>
        </div>
      )}

      {/* Subject cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }} className="stagger">
        {!isLoading && logs.length === 0 ? (
          <div className="luminous-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 12 }}>school</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--on-surface)', marginBottom: 6 }}>No active subjects</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)' }}>Go to Settings to enable study modules</div>
          </div>
        ) : (
          logs.map(log => (
            <SubjectCard key={log.subject_id} log={log} date={today} />
          ))
        )}
      </div>

      {/* Bottom summary bar */}
      {logs.length > 0 && (
        <div className="luminous-card" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', marginBottom: 90,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', letterSpacing: '0.06em', marginBottom: 4 }}>
              TODAY'S TOTAL
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--on-surface)' }}>
              {formatMinutes(totalCompleted)}{' '}
              <span style={{ color: 'var(--on-surface-variant)', fontWeight: 400, fontSize: 14 }}>
                of {formatMinutes(totalPlanned)}
              </span>
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
            color: pctColor,
          }}>
            {overallPct}%
          </div>
        </div>
      )}

      {/* End Day button */}
      {!dayEnded && logs.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 74, left: 0, right: 0,
          padding: '12px 16px',
          background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
          zIndex: 30,
        }}>
          <button
            id="end-day-btn"
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              maxWidth: 440,
              margin: '0 auto',
              padding: '13px 20px',
              background: 'rgba(255,180,171,0.12)',
              border: '1px solid rgba(255,180,171,0.3)',
              borderRadius: 10,
              color: 'var(--error)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,180,171,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,180,171,0.12)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>flag</span>
            End Day
          </button>
        </div>
      )}

      {showModal && (
        <EndDayModal logs={logs} date={today} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
