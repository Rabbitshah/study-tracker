import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import useAppStore from '../store/useAppStore';

const s = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'var(--bg)',
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'fixed', top: '-10%', right: '-5%',
    width: 400, height: 400, borderRadius: '50%',
    background: 'var(--primary)', filter: 'blur(120px)',
    opacity: 0.1, pointerEvents: 'none',
  },
  blob2: {
    position: 'fixed', bottom: '-10%', left: '-5%',
    width: 450, height: 450, borderRadius: '50%',
    background: 'var(--secondary)', filter: 'blur(120px)',
    opacity: 0.08, pointerEvents: 'none',
  },
  radial: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(circle at center, rgba(76,215,246,0.12) 0%, rgba(208,188,255,0.04) 50%, transparent 70%)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: 'rgba(15,15,26,0.85)',
    border: '1px solid rgba(30,30,53,0.9)',
    borderRadius: 20,
    padding: '40px 36px',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 20px 60px -15px rgba(6,182,212,0.15)',
    position: 'relative',
    zIndex: 10,
  },
  logoBox: {
    width: 60, height: 60,
    background: 'linear-gradient(135deg, rgba(76,215,246,0.2), rgba(208,188,255,0.2))',
    border: '1px solid rgba(76,215,246,0.3)',
    borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: '0 10px 40px -10px rgba(6,182,212,0.2)',
  },
  heading: {
    fontFamily: 'var(--font-display)',
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--on-surface)',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 14,
    color: 'var(--on-surface-variant)',
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--on-surface-variant)',
    marginBottom: 8,
  },
  inputWrap: { marginBottom: 18 },
  errorBox: {
    background: 'rgba(255,180,171,0.1)',
    border: '1px solid rgba(255,180,171,0.25)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--error)',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  submitBtn: {
    width: '100%',
    padding: '13px 20px',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
    border: 'none',
    borderRadius: 10,
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 0 20px rgba(76,215,246,0.3)',
    marginTop: 6,
  },
  linkText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: 'var(--on-surface-variant)',
  },
  link: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: 600,
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '24px 0',
    color: 'var(--on-surface-variant)',
    fontSize: 12,
  },
  dividerLine: { flex: 1, height: 1, background: 'var(--border-muted)', opacity: 0.5 },
};

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }   = useAppStore();
  const navigate    = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data.user, data.accessToken, data.refreshToken);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.wrapper}>
      {/* Ambient */}
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.radial} />

      <div className="fade-in" style={s.card}>
        {/* Logo */}
        <div style={s.logoBox}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 28 }}>school</span>
        </div>

        <h1 style={s.heading}>Study Tracker</h1>
        <p style={s.subtext}>Track your GRE and courses in one place</p>

        <form onSubmit={handleSubmit}>
          <div style={s.inputWrap}>
            <label htmlFor="login-email" style={s.label}>Email</label>
            <input
              type="email"
              id="login-email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <div style={s.inputWrap}>
            <label htmlFor="login-password" style={s.label}>Password</label>
            <input
              type="password"
              id="login-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={s.errorBox}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error_outline</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            id="login-submit"
            style={s.submitBtn}
            disabled={loading}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.boxShadow = '0 0 30px rgba(76,215,246,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.boxShadow = '0 0 20px rgba(76,215,246,0.3)'; }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={s.linkText}>
          No account?{' '}
          <Link to="/register" style={s.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
