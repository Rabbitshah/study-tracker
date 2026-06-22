export default function StreakBanner({ streak }) {
  if (!streak || streak < 3) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(239,68,68,0.1))',
      border: '1px solid rgba(251,146,60,0.25)',
      borderRadius: 12,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      fontSize: 14,
      fontWeight: 600,
    }}>
      <span style={{ fontSize: 20 }}>🔥</span>
      <span>{streak} day streak — keep it going</span>
    </div>
  );
}
