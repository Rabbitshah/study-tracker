import { create } from 'zustand';

const useAppStore = create((set) => ({
  // Initialize with hardcoded Maanav user
  user: { id: 'd89fc05c-07f3-4058-a299-9074917379c8', name: 'Maanav', email: 'maanavshah09@gmail.com' },
  accessToken: 'mock_access_token',
  isAuthenticated: true,

  login: (user, accessToken, refreshToken) => {
    // Commented out login functionality
    /*
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, isAuthenticated: true });
    */
  },

  logout: () => {
    // Commented out logout functionality
    /*
    localStorage.clear();
    set({ user: null, accessToken: null, isAuthenticated: false });
    */
  },

  setUser: (user) => set({ user }),
}));

export default useAppStore;
