import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { formatMinutes } from '../utils/dateHelpers';
import { backlogColor } from '../utils/backlogCalc';

export default function Backlog() {
  const [confirmClear, setConfirmClear] = useState(null);
  const queryClient = useQueryClient();

  const { data: backlogItems = [], isLoading } = useQuery({
    queryKey: ['backlog'],
    queryFn: () => api.get('/backlog').then(r => r.data),
  });

  const clearMutation = useMutation({
    mutationFn: (subjectId) => api.delete(`/backlog/${subjectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      setConfirmClear(null);
    },
  });

  const totalMinutes = backlogItems.reduce((s, b) => s + parseInt(b.accumulated_minutes), 0);
  const TWO_WEEKS   = 14 * (45 + 45 + 60 + 30);
  const isCritical  = totalMinutes > TWO_WEEKS;

  // Severity helpers
  function getSeverity(min) {
    if (min === 0)        return { label: 'No backlog',       color: 'var(--primary)' };
    if (min < 120)        return { label: 'MINOR',            color: 'var(--primary)' };
    if (min < 300)        return { label: 'MODERATE',         color: 'var(--tertiary)' };
    return                       { label: 'HIGH',             color: 'var(--error)' };
  }

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 4 }}>
          Study Debt
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)', letterSpacing: '0.04em' }}>
          Visualize and clear your outstanding learning hours
        </p>
      </div>

      {/* Critical warning banner */}
      {isCritical && (
        <div className="slide-left luminous-card" style={{
          background: 'rgba(255,180,171,0.08)',
          borderLeft: '3px solid var(--error)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          boxShadow: '0 0 20px rgba(255,180,171,0.06)',
        }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 22 }}>warning</span>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--error)', letterSpacing: '0.06em' }}>
              CRITICAL DEBT LEVEL
            </div>
            <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 2 }}>
              Your backlog is large and may affect retention. Consider adjusting daily targets in Settings.
            </div>
          </div>
        </div>
      )}

      {/* Total accumulated card */}
      <div className="luminous-card" style={{ padding: '28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, padding: 16, opacity: 0.06 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 100, color: 'var(--error)' }}>history</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Accumulated Debt
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: totalMinutes > 0 ? 52 : 36,
          fontWeight: 800,
          color: totalMinutes === 0 ? '#10B981' : backlogColor(totalMinutes),
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: 10,
        }}>
          {totalMinutes === 0 ? '0 min' : formatMinutes(totalMinutes)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
          {totalMinutes === 0
            ? '🎉 All caught up — great work!'
            : 'Total owed across all subjects in current sprint'}
        </div>
      </div>

      {/* Per-subject cards */}
      {isLoading && (
        <div style={{ color: 'var(--on-surface-variant)', textAlign: 'center', padding: 40,
          fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em' }}>
          LOADING…
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="stagger">
        {!isLoading && backlogItems.map((item, i) => {
          const minutes = parseInt(item.accumulated_minutes);
          const { label: sevLabel, color: sevColor } = getSeverity(minutes);
          const isConfirming = confirmClear === item.subject_id;
          const fillPct = Math.min(100, (minutes / 300) * 100);

          return (
            <div
              key={item.subject_id}
              className="luminous-card slide-left"
              style={{
                borderLeft: `3px solid ${item.subject_color}`,
                padding: '18px 20px',
                animationDelay: `${i * 0.07}s`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--on-surface)', marginBottom: 3 }}>
                    {item.subject_name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: sevColor, letterSpacing: '0.06em' }}>
                    {sevLabel} PRIORITY
                  </div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: sevColor,
                  background: `${sevColor}18`,
                  border: `1px solid ${sevColor}35`,
                  padding: '3px 10px',
                  borderRadius: 6,
                }}>
                  {minutes === 0 ? '✓ Clear' : formatMinutes(minutes)}
                </div>
              </div>

              {/* Fill bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--on-surface-variant)', letterSpacing: '0.06em' }}>FILL LEVEL</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--on-surface-variant)' }}>{Math.round(fillPct)}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${fillPct}%`, background: item.subject_color }} />
                </div>
              </div>

              {/* Actions */}
              {minutes > 0 && (
                isConfirming ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setConfirmClear(null)}
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      Cancel
                    </button>
                    <button
                      id={`clear-backlog-${item.subject_id}`}
                      className="btn btn-danger"
                      onClick={() => clearMutation.mutate(item.subject_id)}
                      disabled={clearMutation.isPending}
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done_all</span>
                      {clearMutation.isPending ? 'Clearing…' : 'Confirm Clear'}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-ghost"
                    onClick={() => setConfirmClear(item.subject_id)}
                    style={{ fontSize: 12, padding: '7px 16px', width: '100%',
                      borderColor: 'rgba(188,201,205,0.2)', color: 'var(--on-surface-variant)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_fix_high</span>
                    Clear backlog
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
