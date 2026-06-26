import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { statusColor } from '../utils/backlogCalc';

// ─── Toggle component ─────────────────────────────────────────────────────────
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

// ─── CourseRow ────────────────────────────────────────────────────────────────
function CourseRow({ course, isLocked, onComplete }) {
  const pct = course.total_hours > 0
    ? Math.round((course.completed_hours / course.total_hours) * 100)
    : 0;

  const queryClient = useQueryClient();
  const [val, setVal]   = useState(course.completed_hours);
  const [error, setError] = useState('');

  useEffect(() => {
    setVal(course.completed_hours);
    setError('');
  }, [course.completed_hours]);

  const updateMutation = useMutation({
    mutationFn: (hours) => api.patch(`/courses/${course.id}`, { completed_hours: hours }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['courses'] }); setError(''); },
  });

  function handleSave() {
    if (isLocked || course.completed) return;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0 || num > parseFloat(course.total_hours)) {
      setError(`Must be 0–${course.total_hours}`);
      return;
    }
    setError('');
    updateMutation.mutate(num);
  }

  const accentColor = course.completed ? '#10B981' : isLocked ? 'var(--on-surface-variant)' : 'var(--primary)';

  return (
    <div style={{
      background: 'var(--surface-container-low)',
      border: `1px solid ${isLocked ? 'var(--border)' : 'var(--border-muted)'}`,
      borderRadius: 8,
      padding: '12px 16px',
      opacity: isLocked ? 0.5 : 1,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: accentColor, flexShrink: 0 }}>
              {course.completed ? 'check_circle' : isLocked ? 'lock' : 'radio_button_unchecked'}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {course.order_index}. {course.course_name}
            </span>
          </div>

          <div className="progress-track" style={{ marginBottom: 6 }}>
            <div className="progress-fill" style={{ width: `${pct}%`, background: accentColor }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)' }}>
            {!isLocked && !course.completed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number" step="0.1" min="0" max={course.total_hours}
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    style={{ width: 68, height: 28, padding: '2px 8px', fontSize: 13 }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    h of {parseFloat(course.total_hours).toFixed(0)}h
                  </span>
                </div>
                {error && <span style={{ color: 'var(--error)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{error}</span>}
              </div>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {parseFloat(course.completed_hours).toFixed(1)}h / {parseFloat(course.total_hours).toFixed(0)}h
              </span>
            )}
          </div>
        </div>

        {!isLocked && !course.completed && (
          <button
            id={`complete-course-${course.id}`}
            className="btn btn-ghost"
            onClick={() => onComplete(course.id)}
            style={{ fontSize: 11, padding: '5px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Mark Done
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CertSection ──────────────────────────────────────────────────────────────
function CertSection({ title, cert, accentColor, icon }) {
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: (id) => api.post(`/courses/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  if (!cert) return null;

  const statusClr = statusColor(cert.status);

  return (
    <div className="luminous-card" style={{ padding: '22px 24px', marginBottom: 16, borderLeft: `3px solid ${accentColor}` }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: accentColor, fontSize: 20 }}>{icon}</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--on-surface)' }}>{title}</h2>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          color: statusClr, background: `${statusClr}20`,
          padding: '3px 10px', borderRadius: 20, border: `1px solid ${statusClr}40`,
          letterSpacing: '0.04em',
        }}>
          {cert.status}
        </span>
      </div>

      {/* Overall progress */}
      <div style={{ marginBottom: 16 }}>
        <div className="progress-track" style={{ height: 8, marginBottom: 8 }}>
          <div className="progress-fill" style={{ width: `${cert.completion_pct}%`, background: accentColor }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)' }}>
          <span>{cert.completed_hours.toFixed(1)}h / {cert.total_hours}h · {cert.completion_pct}%</span>
          <span>{cert.days_remaining}d left · {cert.hours_per_day_needed.toFixed(1)}h/day</span>
        </div>
      </div>

      {/* Course list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cert.courses.map((course, i) => {
          const prevCompleted = i === 0 || cert.courses[i - 1].completed;
          const isLocked = !prevCompleted && !course.completed;
          return (
            <CourseRow
              key={course.id}
              course={course}
              isLocked={isLocked}
              onComplete={(id) => completeMutation.mutate(id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Courses() {
  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/courses').then(r => r.data),
  });

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 4 }}>
          Course Progress
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)', letterSpacing: '0.04em' }}>
          Sept 14 deadline · Complete modules in sequence
        </p>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2].map(n => (
            <div key={n} className="skeleton" style={{ height: 220, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {data && (
        <>
          <CertSection title="Meta Android Developer" cert={data.meta_android} accentColor="var(--tertiary)" icon="android" />
          <CertSection title="Unity Game Design"       cert={data.unity}        accentColor="var(--success)"  icon="sports_esports" />
        </>
      )}
    </div>
  );
}
