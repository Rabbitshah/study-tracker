import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../services/api';
import { formatMinutes } from '../utils/dateHelpers';
import { todayStr } from '../utils/dateHelpers';
import useAppStore from '../store/useAppStore';

export default function EndDayModal({ logs, date, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post('/logs/end-day', { date }),
    onSuccess: ({ data }) => {
      setSummary(data.summary);
      setDone(true);
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      console.error('End day failed:', err.response?.data?.error);
      setConfirming(false);
    },
  });

  const totalPlanned = logs.reduce((s, l) => s + l.planned_minutes, 0);
  const totalCompleted = logs.reduce((s, l) => s + l.completed_minutes, 0);

  function statusIcon(planned, completed) {
    if (completed >= planned) return '✅';
    if (completed >= planned * 0.5) return '⚠️';
    return '❌';
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!confirming ? onClose : undefined}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="card"
          style={{ width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}
        >
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
            {done ? '🎉 Day Ended' : `End Day — ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 20 }}>
            {done
              ? 'Backlog has been updated for tomorrow.'
              : `${formatMinutes(totalCompleted)} of ${formatMinutes(totalPlanned)} completed today`}
          </p>

          {/* Summary table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {(summary || logs).map((row) => {
              const planned = row.planned_minutes ?? row.planned;
              const completed = row.completed_minutes ?? row.completed;
              const name = row.subject_name;
              const delta = row.delta;

              return (
                <div
                  key={name}
                  className="card-2"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                      {formatMinutes(completed)} / {formatMinutes(planned)}
                      {done && delta > 0 && (
                        <span style={{ color: '#fca5a5' }}> · +{formatMinutes(delta)} to backlog</span>
                      )}
                      {done && delta < 0 && (
                        <span style={{ color: '#86efac' }}> · -{formatMinutes(Math.abs(delta))} from backlog</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 18 }}>{statusIcon(planned, completed)}</span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          {!done ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                id="confirm-end-day"
                className="btn btn-danger"
                onClick={() => { setConfirming(true); mutation.mutate(); }}
                disabled={confirming || mutation.isPending}
                style={{ flex: 1 }}
              >
                {confirming ? 'Ending...' : 'Confirm End Day'}
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
              Done
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
