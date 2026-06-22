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

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${color}`,
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}88`,
          }} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>{log.subject_name}</span>
        </div>

        {/* Backlog badge */}
        {log.accumulated_backlog > 0 && (
          <span className="badge badge-backlog">
            +{formatMinutes(log.accumulated_backlog)} backlog
          </span>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 10 }}>
        <ProgressBar completed={completed} planned={planned} color={color} />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 6, fontSize: 13, color: 'var(--color-text-2)'
        }}>
          <span>{formatMinutes(completed)} done</span>
          <span style={{ fontWeight: 600, color: pct >= 100 ? '#22c55e' : 'var(--color-text)' }}>
            {pct}% · {formatMinutes(planned)} target
            {log.backlog_carry > 0 && (
              <span style={{ color: '#fca5a5', fontSize: 11 }}>
                {' '}(+{formatMinutes(log.backlog_carry)} carry)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Quick log buttons */}
      {!log.day_ended && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[15, 30, 45, 60].map(min => (
            <button
              key={min}
              id={`log-${log.subject_id}-${min}`}
              className="btn btn-ghost"
              onClick={() => handleLog(min)}
              disabled={logging || mutation.isPending}
              style={{ minWidth: 54, fontSize: 13, padding: '8px 12px' }}
            >
              +{min}
            </button>
          ))}

          <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 120 }}>
            <input
              type="number"
              placeholder="custom"
              min="1"
              value={customMinutes}
              onChange={e => setCustomMinutes(e.target.value)}
              style={{ flex: 1, minWidth: 70, padding: '8px 10px', fontSize: 14 }}
              onKeyDown={e => e.key === 'Enter' && handleLog(customMinutes)}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleLog(customMinutes)}
              disabled={!customMinutes || logging || mutation.isPending}
              style={{ padding: '8px 14px', fontSize: 13, whiteSpace: 'nowrap' }}
            >
              Log
            </button>
          </div>
        </div>
      )}

      {log.day_ended && (
        <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
          Day ended ✓
        </div>
      )}
    </div>
  );
}
