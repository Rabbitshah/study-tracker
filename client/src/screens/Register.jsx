import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import useAppStore from '../store/useAppStore';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAppStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data.user, data.accessToken, data.refreshToken);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--color-bg)',
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 12,
            background: 'var(--gradient-gre)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            fontSize: 24,
          }}>📚</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Create Account</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
            Subjects & courses will be pre-loaded for you
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-2)', marginBottom: 6 }}>
              Name
            </label>
            <input
              type="text"
              id="register-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Maanav"
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-2)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              id="register-email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-2)', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              id="register-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="min 8 characters"
              required
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#fca5a5',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            id="register-submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--color-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
