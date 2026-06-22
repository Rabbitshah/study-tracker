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

  function getEdit(subjectId, field, fallback) {
    return edits[subjectId]?.[field] ?? fallback;
  }

  function setEdit(subjectId, field, value) {
    setEdits(prev => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], [field]: value },
    }));
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
                  onChange={e => setEdit(s.id, 'active', e.target.checked)}
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
                  onChange={e => setEdit(s.id, 'weekday_target_minutes', parseInt(e.target.value))}
                  style={{ padding: '8px 10px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>
                  Weekend target (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={getEdit(s.id, 'weekend_target_minutes', s.weekend_target_minutes)}
                  onChange={e => setEdit(s.id, 'weekend_target_minutes', parseInt(e.target.value))}
                  style={{ padding: '8px 10px' }}
                />
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
                onChange={e => setEdit(s.id, 'deadline', e.target.value)}
                style={{ padding: '8px 10px' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                id={`save-subject-${s.id}`}
                className="btn btn-primary"
                onClick={() => saveSubject(s)}
                disabled={!edits[s.id] || updateMutation.isPending}
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
