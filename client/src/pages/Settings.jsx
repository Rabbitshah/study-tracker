import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import useAppStore from '../store/useAppStore';

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
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Settings</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 24 }}>
        Adjust targets, deadlines, and subject status
      </p>

      {isLoading && (
        <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: 40 }}>Loading...</div>
      )}

      {/* Per-subject settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {subjects.map(s => (
          <div className="card" key={s.id} style={{ borderLeft: `4px solid ${s.color}` }}>
            {/* Subject header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
              <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{s.name}</span>
              {/* Active toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--color-muted)' }}>
                <input
                  type="checkbox"
                  checked={getEdit(s.id, 'active', s.active)}
                  onChange={e => setEdit(s.id, 'active', e.target.checked, s)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                Active
              </label>
            </div>

            {/* Targets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>
                  Weekday target (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={getEdit(s.id, 'weekday_target_minutes', s.weekday_target_minutes)}
                  onChange={e => setEdit(s.id, 'weekday_target_minutes', parseInt(e.target.value) || 0, s)}
                  style={{ padding: '8px 10px', borderColor: errors[s.id]?.weekday ? 'var(--color-danger)' : 'var(--color-border)' }}
                />
                {errors[s.id]?.weekday && (
                  <span style={{ color: 'var(--color-danger)', fontSize: 11, display: 'block', marginTop: 4 }}>
                    {errors[s.id].weekday}
                  </span>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>
                  Weekend target (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={getEdit(s.id, 'weekend_target_minutes', s.weekend_target_minutes)}
                  onChange={e => setEdit(s.id, 'weekend_target_minutes', parseInt(e.target.value) || 0, s)}
                  style={{ padding: '8px 10px', borderColor: errors[s.id]?.weekend ? 'var(--color-danger)' : 'var(--color-border)' }}
                />
                {errors[s.id]?.weekend && (
                  <span style={{ color: 'var(--color-danger)', fontSize: 11, display: 'block', marginTop: 4 }}>
                    {errors[s.id].weekend}
                  </span>
                )}
              </div>
            </div>

            {/* Deadline */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>
                Deadline
              </label>
              <input
                type="date"
                value={getEdit(s.id, 'deadline', s.deadline?.split('T')?.[0] || s.deadline || '')}
                onChange={e => setEdit(s.id, 'deadline', e.target.value, s)}
                style={{ padding: '8px 10px', borderColor: errors[s.id]?.deadline ? 'var(--color-danger)' : 'var(--color-border)' }}
              />
              {errors[s.id]?.deadline && (
                <span style={{ color: 'var(--color-danger)', fontSize: 11, display: 'block', marginTop: 4 }}>
                  {errors[s.id].deadline}
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                id={`save-subject-${s.id}`}
                className="btn btn-primary"
                onClick={() => saveSubject(s)}
                disabled={!edits[s.id] || updateMutation.isPending || Object.values(errors[s.id] || {}).some(Boolean)}
                style={{ flex: 1, fontSize: 13 }}
              >
                {saved[s.id] ? '✓ Saved' : 'Save Changes'}
              </button>

              {confirmReset === s.id ? (
                <>
                  <button className="btn btn-ghost" onClick={() => setConfirmReset(null)} style={{ fontSize: 12 }}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => clearBacklogMutation.mutate(s.id)}
                    disabled={clearBacklogMutation.isPending}
                    style={{ fontSize: 12 }}
                  >
                    Confirm Reset
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirmReset(s.id)}
                  style={{ fontSize: 12, color: '#fca5a5' }}
                >
                  Reset Backlog
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Account section */}
      <div className="card">
        <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Account</h2>
        <button
          id="settings-logout"
          className="btn btn-ghost"
          onClick={() => {
            api.post('/auth/logout').catch(() => {});
            logout();
          }}
          style={{ width: '100%', color: '#fca5a5' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
