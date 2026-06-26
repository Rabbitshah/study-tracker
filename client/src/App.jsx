import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import toast, { Toaster } from 'react-hot-toast';

import Login from './screens/Login';
import Register from './screens/Register';
import Today from './pages/Today';
import Weekly from './pages/Weekly';
import Backlog from './pages/Backlog';
import Courses from './pages/Courses';
import GRE from './pages/GRE';
import WordList from './pages/WordList';
import Settings from './pages/Settings';
import NavBar from './components/NavBar';
import QuickLogButton from './components/QuickLogButton';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to load';
      toast.error(msg);
    }
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Request failed';
      toast.error(msg);
    }
  }),
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

// ─── Protected Layout ─────────────────────────────────────────────────────────
function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        background: 'var(--bg)',
      }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 40, animation: 'pulse 1.5s infinite' }}>school</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <NavBar />
      <QuickLogButton />
      <Outlet />
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-container)',
            color: 'var(--on-surface)',
            border: '1px solid var(--border)',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: 'var(--primary)', secondary: 'var(--on-primary)' } },
          error: { iconTheme: { primary: 'var(--error)', secondary: '#1a0000' } },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route element={<ProtectedLayout />}>
            <Route path="/"         element={<Today />} />
            <Route path="/weekly"   element={<Weekly />} />
            <Route path="/backlog"  element={<Backlog />} />
            <Route path="/courses"  element={<Courses />} />
            <Route path="/gre"      element={<GRE />} />
            <Route path="/vocab"     element={<WordList />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
