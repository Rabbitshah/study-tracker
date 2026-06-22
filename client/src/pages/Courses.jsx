import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { statusColor } from '../utils/backlogCalc';

function CourseRow({ course, isLocked, onComplete }) {
  const pct = course.total_hours > 0
    ? Math.round((course.completed_hours / course.total_hours) * 100)
    : 0;

  return (
    <div className="card-2" style={{ opacity: isLocked ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted)', flexShrink: 0 }}>
              {isLocked ? '🔒' : course.completed ? '✅' : `${course.order_index}.`}
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {course.course_name}
            </span>
          </div>

          {/* Progress bar */}
          <div className="progress-track" style={{ height: 6, marginBottom: 6 }}>
            <div
              className="progress-fill"
              style={{
                width: `${pct}%`,
                background: course.completed ? '#22c55e' : '#6366f1',
              }}
            />
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
            {parseFloat(course.completed_hours).toFixed(1)}h / {parseFloat(course.total_hours).toFixed(0)}h
          </div>
        </div>

        {!isLocked && !course.completed && (
          <button
            id={`complete-course-${course.id}`}
            className="btn btn-ghost"
            onClick={() => onComplete(course.id)}
            style={{ fontSize: 12, padding: '6px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Mark Done
          </button>
        )}
      </div>
    </div>
  );
}

function CertSection({ title, cert, color }) {
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: (id) => api.post(`/courses/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  if (!cert) return null;

  const statusClr = statusColor(cert.status);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ fontWeight: 700, fontSize: 17 }}>{title}</h2>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: statusClr,
            background: statusClr + '22',
            padding: '3px 10px',
            borderRadius: 20,
            border: `1px solid ${statusClr}44`,
          }}>
            {cert.status}
          </span>
        </div>

        {/* Overall progress */}
        <div className="progress-track" style={{ height: 10, marginBottom: 8 }}>
          <div
            className="progress-fill"
            style={{ width: `${cert.completion_pct}%`, background: color }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-muted)' }}>
          <span>{cert.completed_hours.toFixed(1)}h / {cert.total_hours}h done · {cert.completion_pct}%</span>
          <span>{cert.days_remaining}d left · need {cert.hours_per_day_needed.toFixed(1)}h/day</span>
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

export default function Courses() {
  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/courses').then(r => r.data),
  });

  return (
    <div className="page fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Course Tracker</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 24 }}>
        Sept 14 deadline · Complete in sequence
      </p>

      {isLoading && (
        <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: 40 }}>Loading...</div>
      )}

      {data && (
        <>
          <CertSection title="Meta Android Developer" cert={data.meta_android} color="#f59e0b" />
          <CertSection title="Unity Game Design" cert={data.unity} color="#10b981" />
        </>
      )}
    </div>
  );
}
