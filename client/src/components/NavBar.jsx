import { NavLink } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import api from '../services/api';

const NAV_ITEMS = [
  { to: '/',         icon: 'today',          label: 'Today' },
  { to: '/weekly',   icon: 'calendar_view_week', label: 'Weekly' },
  { to: '/backlog',  icon: 'inventory_2',    label: 'Backlog' },
  { to: '/courses',  icon: 'school',         label: 'Courses' },
  { to: '/gre',      icon: 'menu_book',      label: 'GRE' },
  { to: '/vocab',    icon: 'font_download',  label: 'Word List' },
  { to: '/settings', icon: 'settings',       label: 'Settings' },
];

export default function NavBar() {
  const { logout } = useAppStore();

  function handleLogout() {
    api.post('/auth/logout').catch(() => {});
    logout();
  }

  return (
    <>
      {/* ─── Ambient glow blobs ─────────────────────────────────── */}
      <div className="glow-blob glow-blob-cyan"  style={{ top: '-10%',  right: '-5%'  }} />
      <div className="glow-blob glow-blob-violet" style={{ bottom: '-5%', left:  '-5%'  }} />

      {/* ─── Desktop Sidebar ───────────────────────────────────── */}
      <aside className="glass-sidebar desktop-sidebar" style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: 240,
        borderRight: '1px solid rgba(76, 215, 246, 0.15)',
        boxShadow: '4px 0 24px rgba(76, 215, 246, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        zIndex: 50,
      }}>
        {/* ── Logo ──────────────────────────────────────────────── */}
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 8,
              background: 'rgba(76,215,246,0.15)',
              border: '1px solid rgba(76,215,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20 }}>school</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>
                Study Tracker
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'rgba(188,201,205,0.6)', textTransform: 'uppercase' }}>
                Premium GRE Prep
              </div>
            </div>
          </div>
        </div>

        {/* ── Nav Items ─────────────────────────────────────────── */}
        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              id={`sidebar-${item.label.toLowerCase().replace(' ', '-')}`}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20 }}
              >
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* ── Sign Out ──────────────────────────────────────────── */}
        <div style={{ padding: '16px 24px 0', borderTop: '1px solid rgba(61,73,76,0.3)' }}>
          <button
            onClick={handleLogout}
            id="sidebar-logout"
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              color: 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              letterSpacing: '0.04em',
              width: '100%',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-variant)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Mobile Bottom Nav ─────────────────────────────────── */}
      <nav className="mobile-nav" style={{
        display: 'flex',
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'rgba(31, 31, 39, 0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(76,215,246,0.12)',
        zIndex: 50,
        padding: '6px 0 10px',
      }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 4px',
              textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              transition: 'color 0.15s',
            })}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Responsive styles */}
      <style>{`
        .mobile-nav { display: flex; }
        .desktop-sidebar { display: none; }
        @media (min-width: 768px) {
          .mobile-nav { display: none !important; }
          .desktop-sidebar { display: flex !important; }
        }
      `}</style>
    </>
  );
}
