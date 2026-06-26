import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { formatMinutes } from '../utils/dateHelpers';

// ─── ProgressBar ──────────────────────────────────────────────────────────────
function ProgressBar({ completed, planned, color }) {
  const pct = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;
  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ─── SubjectCard ──────────────────────────────────────────────────────────────
export default function SubjectCard({ log, onLog, date }) {
  const [customMinutes, setCustomMinutes] = useState('');
  const [logging, setLogging] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ subjectId, minutes }) =>
      api.post('/logs', {
        subject_id: subjectId,
        log_date: date,
        completed_minutes: minutes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['backlog'] });
      setCustomMinutes('');
      setLogging(false);
    },
    onError: (err) => {
      console.error('Log failed:', err.response?.data?.error);
      setLogging(false);
    },
  });

  function handleLog(minutes) {
    if (!minutes || minutes <= 0) return;
    setLogging(true);
    mutation.mutate({ subjectId: log.subject_id, minutes: parseInt(minutes) });
  }

  const completed = log.completed_minutes;
  const planned = log.planned_minutes;
  const pct = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;
  const color = log.subject_color;

  const pctColor = pct >= 100 ? 'var(--success)' : pct >= 50 ? 'var(--tertiary)' : 'var(--on-surface-variant)';

  return (
    <div
      className="luminous-card"
      style={{
        borderLeft: `3px solid ${color}`,
        padding: '20px 20px 20px 18px',
        opacity: log.day_ended ? 0.45 : 1,
        pointerEvents: log.day_ended ? 'none' : 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle color tint */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: '60%',
        background: `linear-gradient(to left, ${color}06, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 10px ${color}99`,
            flexShrink: 0,
          }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--on-surface)' }}>
            {log.subject_name}
          </span>
        </div>

        {/* Backlog badge */}
        {log.accumulated_backlog > 0 && (
          <span className="badge badge-backlog">
            +{formatMinutes(log.accumulated_backlog)} backlog
          </span>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <ProgressBar completed={completed} planned={planned} color={color} />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8, fontSize: 12, fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ color: 'var(--on-surface-variant)' }}>{formatMinutes(completed)} done</span>
          <span style={{ fontWeight: 700, color: pctColor }}>
            {pct}%
            {log.backlog_carry > 0 && (
              <span style={{ color: 'var(--error)', fontWeight: 500, marginLeft: 4 }}>
                (+{formatMinutes(log.backlog_carry)} carry)
              </span>
            )}
          </span>
          <span style={{ color: 'var(--on-surface-variant)' }}>{formatMinutes(planned)} target</span>
        </div>
      </div>

      {/* Quick log buttons */}
      {!log.day_ended && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
          {[15, 30, 45, 60].map(min => (
            <button
              key={min}
              id={`log-${log.subject_id}-${min}`}
              className="btn btn-ghost"
              onClick={() => handleLog(min)}
              disabled={logging || mutation.isPending}
              style={{ minWidth: 50, fontSize: 12, padding: '7px 12px' }}
            >
              +{min}m
            </button>
          ))}

          <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 110 }}>
            <input
              type="number"
              placeholder="min"
              min="1"
              value={customMinutes}
              onChange={e => setCustomMinutes(e.target.value)}
              style={{ flex: 1, minWidth: 60, padding: '8px 10px', fontSize: 13 }}
              onKeyDown={e => e.key === 'Enter' && handleLog(customMinutes)}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleLog(customMinutes)}
              disabled={!customMinutes || logging || mutation.isPending}
              style={{ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
            >
              Log
            </button>
          </div>
        </div>
      )}

      {log.day_ended && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--success)',
          fontFamily: 'var(--font-mono)', marginTop: 4,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
          Day ended
        </div>
      )}
    </div>
  );
}
