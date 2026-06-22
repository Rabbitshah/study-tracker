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
  const TWO_WEEKS = 14 * (45 + 45 + 60 + 30); // rough 2-week threshold

  return (
    <div className="page fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Backlog</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 16 }}>
        Missed time that carries into tomorrow's plan
      </p>

      {/* Large backlog warning */}
      {totalMinutes > TWO_WEEKS && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          fontSize: 13,
          color: '#fca5a5',
          marginBottom: 16,
        }}>
          ⚠️ Your backlog is large. Consider adjusting daily targets in Settings.
        </div>
      )}

      {/* Total */}
      <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: backlogColor(totalMinutes) }}>
          {formatMinutes(totalMinutes)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
          Total owed across all subjects
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 8 }}>
          Extra time logged today reduces this automatically
        </div>
      </div>

      {/* Per-subject cards */}
      {isLoading && (
        <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: 40 }}>Loading...</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {backlogItems.map(item => {
          const minutes = parseInt(item.accumulated_minutes);
          const color = backlogColor(minutes);
          const isConfirming = confirmClear === item.subject_id;

          let severity = 'No backlog';
          if (minutes > 0 && minutes < 120) severity = 'Minor (<2h)';
          else if (minutes >= 120 && minutes < 300) severity = 'Moderate (2–5h)';
          else if (minutes >= 300) severity = 'High (5h+)';

          return (
            <div
              key={item.subject_id}
              className="card"
              style={{ borderLeft: `4px solid ${item.subject_color}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.subject_color }} />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{item.subject_name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color }}>
                    {formatMinutes(minutes)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{severity}</div>
                </div>
              </div>

              {/* Progress bar showing backlog */}
              <div className="progress-track" style={{ marginBottom: 12 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, (minutes / 300) * 100)}%`,
                    background: color,
                  }}
                />
              </div>

              {/* Actions */}
              {minutes > 0 && (
                isConfirming ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setConfirmClear(null)}
                      style={{ flex: 1, fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button
                      id={`clear-backlog-${item.subject_id}`}
                      className="btn btn-danger"
                      onClick={() => clearMutation.mutate(item.subject_id)}
                      disabled={clearMutation.isPending}
                      style={{ flex: 1, fontSize: 13 }}
                    >
                      {clearMutation.isPending ? 'Clearing...' : 'Yes, Clear'}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-ghost"
                    onClick={() => setConfirmClear(item.subject_id)}
                    style={{ fontSize: 12, padding: '6px 12px', color: '#fca5a5' }}
                  >
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
