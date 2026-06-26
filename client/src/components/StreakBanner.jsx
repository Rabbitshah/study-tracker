export default function StreakBanner({ streak }) {
  if (!streak || streak < 2) return null;

  const isHot = streak >= 7;

  return (
    <div
      className="luminous-card slide-left"
      style={{
        background: isHot
          ? 'linear-gradient(135deg, rgba(255,185,95,0.12), rgba(255,100,50,0.06))'
          : 'linear-gradient(135deg, rgba(76,215,246,0.1), rgba(208,188,255,0.06))',
        borderLeft: `3px solid ${isHot ? 'var(--tertiary)' : 'var(--primary)'}`,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 18,
      }}
    >
      <span className="material-symbols-outlined" style={{
        color: isHot ? 'var(--tertiary)' : 'var(--primary)',
        fontSize: 22,
        fontVariationSettings: `'FILL' 1`,
      }}>
        local_fire_department
      </span>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 15,
          color: isHot ? 'var(--tertiary)' : 'var(--primary)',
        }}>
          🔥 {streak} Day Streak
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--on-surface-variant)',
          letterSpacing: '0.04em',
          marginTop: 2,
        }}>
          {isHot ? 'On fire — keep the momentum!' : 'Keep it going!'}
        </div>
      </div>
    </div>
  );
}
