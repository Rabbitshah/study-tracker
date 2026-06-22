import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { todayStr, formatMinutes } from '../utils/dateHelpers';

export default function QuickLogButton() {
  const [open, setOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [toast, setToast] = useState('');
  const queryClient = useQueryClient();

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: ({ subjectId, minutes }) =>
      api.post('/logs', {
        subject_id: subjectId,
        log_date: todayStr(),
        completed_minutes: minutes,
      }),
    onSuccess: (_, { minutes }) => {
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['backlog'] });
      const name = subjects.find(s => s.id === selectedSubject)?.name || '';
      setToast(`${formatMinutes(minutes)} logged to ${name}`);
      setTimeout(() => setToast(''), 3000);
      setOpen(false);
      setSelectedSubject(null);
      setCustomMinutes('');
    },
  });

  function handleLog(minutes) {
    if (!selectedSubject || !minutes || parseInt(minutes) <= 0) return;
    mutation.mutate({ subjectId: selectedSubject, minutes: parseInt(minutes) });
  }

  return (
    <>
      {/* FAB */}
      <motion.button
        id="quick-log-fab"
        className="fab-button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: 20,
          zIndex: 50,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--gradient-gre)',
          border: 'none',
          color: 'white',
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(99,102,241,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        +
      </motion.button>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 150,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 200,
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: '#86efac',
              whiteSpace: 'nowrap',
            }}
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setOpen(false); setSelectedSubject(null); setCustomMinutes(''); }}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 90,
              }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--color-surface)',
                borderRadius: '20px 20px 0 0',
                padding: '24px 20px 40px',
                border: '1px solid var(--color-border)',
                borderBottom: 'none',
              }}
            >
              <div style={{
                width: 36, height: 4,
                background: 'var(--color-border)',
                borderRadius: 2,
                margin: '0 auto 20px',
              }} />

              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                Quick Log — Today
              </h3>

              {/* Subject grid */}
              {!selectedSubject ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {subjects.map(s => (
                    <button
                      key={s.id}
                      id={`ql-subject-${s.id}`}
                      onClick={() => setSelectedSubject(s.id)}
                      style={{
                        background: 'var(--color-surface-2)',
                        border: `2px solid ${s.color}44`,
                        borderRadius: 12,
                        padding: '14px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', textAlign: 'left' }}>
                        {s.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                /* Amount picker */
                <div>
                  <button
                    onClick={() => setSelectedSubject(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}
                  >
                    ← {subjects.find(s => s.id === selectedSubject)?.name}
                  </button>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    {[15, 30, 45, 60].map(min => (
                      <button
                        key={min}
                        id={`ql-min-${min}`}
                        className="btn btn-ghost"
                        onClick={() => handleLog(min)}
                        disabled={mutation.isPending}
                        style={{ flex: 1, fontSize: 15 }}
                      >
                        +{min}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="number"
                      placeholder="Custom minutes"
                      min="1"
                      value={customMinutes}
                      onChange={e => setCustomMinutes(e.target.value)}
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => handleLog(customMinutes)}
                      disabled={!customMinutes || mutation.isPending}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {mutation.isPending ? 'Logging...' : 'Log'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
