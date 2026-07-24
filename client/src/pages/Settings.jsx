import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import useAppStore from '../store/useAppStore';

// ─── Toggle Component ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`toggle-track${checked ? ' on' : ''}`}
    >
      <div className="toggle-dot" />
    </button>
  );
}

export default function Settings() {
  const { logout } = useAppStore();
  const queryClient = useQueryClient();

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then(r => r.data),
  });

  // Local edits per subject
  const [edits, setEdits] = useState({});
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState({});
  const [confirmReset, setConfirmReset] = useState(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/subjects/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      setSaved(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000);
    },
  });

  const clearBacklogMutation = useMutation({
    mutationFn: (subjectId) => api.delete(`/backlog/${subjectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      setConfirmReset(null);
    },
  });

  function validate(subjectId, updatedField, updatedValue, subject) {
    const weekday = updatedField === 'weekday_target_minutes' ? updatedValue : (edits[subjectId]?.weekday_target_minutes ?? subject.weekday_target_minutes);
    const weekend = updatedField === 'weekend_target_minutes' ? updatedValue : (edits[subjectId]?.weekend_target_minutes ?? subject.weekend_target_minutes);
    const deadline = updatedField === 'deadline' ? updatedValue : (edits[subjectId]?.deadline ?? subject.deadline);

    const isPriority1 = subject.priority === 1;
    let subErrors = { ...errors[subjectId] };

    if (isPriority1) {
      if (weekday <= 0) {
        subErrors.weekday = 'Target must be > 0 for GRE';
      } else {
        delete subErrors.weekday;
      }
      if (weekend <= 0) {
        subErrors.weekend = 'Target must be > 0 for GRE';
      } else {
        delete subErrors.weekend;
      }
    } else {
      delete subErrors.weekday;
      delete subErrors.weekend;
    }

    if (deadline) {
      const todayStr = new Date().toISOString().split('T')[0];
      const deadlineClean = deadline.split('T')[0];
      if (deadlineClean < todayStr) {
        subErrors.deadline = 'Deadline cannot be in the past';
      } else {
        delete subErrors.deadline;
      }
    } else {
      delete subErrors.deadline;
    }

    setErrors(prev => ({
      ...prev,
      [subjectId]: subErrors
    }));
  }

  function getEdit(subjectId, field, fallback) {
    return edits[subjectId]?.[field] ?? fallback;
  }

  function setEdit(subjectId, field, value, subject) {
    setEdits(prev => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], [field]: value },
    }));
    validate(subjectId, field, value, subject);
  }

  function saveSubject(subject) {
    const changes = edits[subject.id] || {};
    updateMutation.mutate({ id: subject.id, data: changes });
  }

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)', letterSpacing: '0.04em' }}>
          Adjust targets, deadlines, and subject status
        </p>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {[1, 2].map(n => (
            <div key={n} className="skeleton" style={{ height: 260, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {/* Per-subject settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }} className="stagger">
        {subjects.map(s => (
          <div className="luminous-card" key={s.id} style={{ borderLeft: `3px solid ${s.color}`, padding: '22px 24px' }}>
            {/* Subject header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 10px ${s.color}60` }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--on-surface)' }}>
                  {s.name}
                </span>
              </div>
              
              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active
                </span>
                <Toggle
                  checked={getEdit(s.id, 'active', s.active)}
                  onChange={val => setEdit(s.id, 'active', val, s)}
                />
              </div>
            </div>

            {/* Targets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Weekday target (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={getEdit(s.id, 'weekday_target_minutes', s.weekday_target_minutes)}
                  onChange={e => setEdit(s.id, 'weekday_target_minutes', parseInt(e.target.value) || 0, s)}
                  style={{
                    borderColor: errors[s.id]?.weekday ? 'var(--error)' : 'var(--border-muted)',
                  }}
                />
                {errors[s.id]?.weekday && (
                  <span style={{ color: 'var(--error)', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'block', marginTop: 4 }}>
                    {errors[s.id].weekday}
                  </span>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Weekend target (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={getEdit(s.id, 'weekend_target_minutes', s.weekend_target_minutes)}
                  onChange={e => setEdit(s.id, 'weekend_target_minutes', parseInt(e.target.value) || 0, s)}
                  style={{
                    borderColor: errors[s.id]?.weekend ? 'var(--error)' : 'var(--border-muted)',
                  }}
                />
                {errors[s.id]?.weekend && (
                  <span style={{ color: 'var(--error)', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'block', marginTop: 4 }}>
                    {errors[s.id].weekend}
                  </span>
                )}
              </div>
            </div>

            {/* Deadline */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                Deadline
              </label>
              <input
                type="date"
                value={getEdit(s.id, 'deadline', s.deadline?.split('T')?.[0] || s.deadline || '')}
                onChange={e => setEdit(s.id, 'deadline', e.target.value, s)}
                style={{
                  borderColor: errors[s.id]?.deadline ? 'var(--error)' : 'var(--border-muted)',
                }}
              />
              {errors[s.id]?.deadline && (
                <span style={{ color: 'var(--error)', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'block', marginTop: 4 }}>
                  {errors[s.id].deadline}
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                id={`save-subject-${s.id}`}
                className="btn btn-primary"
                onClick={() => saveSubject(s)}
                disabled={!edits[s.id] || updateMutation.isPending || Object.values(errors[s.id] || {}).some(Boolean)}
                style={{ flex: 1 }}
              >
                {saved[s.id] ? '✓ Saved' : 'Save Changes'}
              </button>

              {confirmReset === s.id ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setConfirmReset(null)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => clearBacklogMutation.mutate(s.id)}
                    disabled={clearBacklogMutation.isPending}
                  >
                    Confirm Reset
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirmReset(s.id)}
                  style={{ color: 'var(--error)', borderColor: 'rgba(255, 180, 171, 0.2)' }}
                >
                  Reset Backlog
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Account section */}
      {/* Commented out Account Section / Sign Out Button
      <div className="luminous-card" style={{ padding: '24px', marginTop: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--on-surface)', marginBottom: 6 }}>
          Account
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 20 }}>
          Manage your session and access controls
        </p>
        <button
          id="settings-logout"
          className="btn btn-danger"
          onClick={() => {
            api.post('/auth/logout').catch(() => {});
            logout();
          }}
          style={{ width: '100%' }}
        >
          Sign Out
        </button>
      </div>
      */}
    </div>
  );
}
