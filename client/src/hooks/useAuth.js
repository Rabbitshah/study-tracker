import { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import api from '../services/api';

/**
 * Restores session from localStorage on app mount.
 * Returns { user, isAuthenticated, loading }
 */
export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken || !refreshToken) {
      setLoading(false);
      return;
    }

    // Use /auth/me to fetch user and validate token
    api.get('/auth/me')
      .then((res) => {
        // Token valid — restore user
        login(res.data.user, accessToken, refreshToken);
        setLoading(false);
      })
      .catch(() => {
        // Interceptor already attempted refresh; if still failing, clear
        logout();
        setLoading(false);
      });
  }, []);

  return { user, isAuthenticated, loading, login, logout };
}
