import { NavLink } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import api from '../services/api';

const NAV_ITEMS = [
  { to: '/',         icon: '🏠', label: 'Today' },
  { to: '/weekly',   icon: '📅', label: 'Weekly' },
  { to: '/backlog',  icon: '📋', label: 'Backlog' },
  { to: '/courses',  icon: '📚', label: 'Courses' },
  { to: '/gre',      icon: '🎯', label: 'GRE' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function NavBar() {
  const { logout } = useAppStore();

  function handleLogout() {
    api.post('/auth/logout').catch(() => {});
    logout();
  }

  const activeStyle = {
    color: '#a5b4fc',
    background: 'rgba(99,102,241,0.12)',
    borderRadius: 10,
  };

  return (
    <>
      {/* ─── Mobile Bottom Nav ─────────────────────────────────────── */}
      <nav style={{
        display: 'flex',
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        zIndex: 40,
        padding: '6px 0 10px',
      }} className="mobile-nav">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            id={`nav-${item.label.toLowerCase()}`}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 4px',
              textDecoration: 'none',
              color: isActive ? '#a5b4fc' : 'var(--color-muted)',
              fontSize: 10,
              fontWeight: 600,
              transition: 'color 0.15s',
            })}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ─── Desktop Sidebar ───────────────────────────────────────── */}
      <aside style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: 240,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 12px',
        zIndex: 40,
      }} className="desktop-sidebar">
        {/* Logo */}
        <div style={{ padding: '0 12px 24px', borderBottom: '1px solid var(--color-border)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 10,
              background: 'var(--gradient-gre)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>📚</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Study Tracker</div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>GRE + Courses</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              id={`sidebar-${item.label.toLowerCase()}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? '#a5b4fc' : 'var(--color-text-2)',
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 18, width: 22, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          id="sidebar-logout"
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '10px 12px',
            color: 'var(--color-muted)',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          <span>🚪</span> Sign out
        </button>
      </aside>

      {/* Responsive: hide/show based on screen size */}
      <style>{`
        .mobile-nav { display: flex; }
        .desktop-sidebar { display: none; }
        @media (min-width: 768px) {
          .mobile-nav { display: none; }
          .desktop-sidebar { display: flex; }
        }
      `}</style>
    </>
  );
}
