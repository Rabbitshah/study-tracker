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
        color: 'var(--color-muted)',
        fontSize: 14,
      }}>
        Loading...
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
        position="top-center"
        toastOptions={{
          style: {
            background: '#1c1c28',
            color: '#f0f0f8',
            border: '1px solid #2a2a3d',
            fontSize: '14px',
          },
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
