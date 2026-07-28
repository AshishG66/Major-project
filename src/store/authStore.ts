import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Read initial from localStorage
  const savedToken = localStorage.getItem('token');
  const savedRefreshToken = localStorage.getItem('refreshToken');
  const savedUser = localStorage.getItem('user');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken || null,
    refreshToken: savedRefreshToken || null,
    isAuthenticated: !!savedToken,
    
    setAuth: (user, accessToken, refreshToken) => {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      set({ user, token: accessToken, refreshToken: refreshToken ?? null, isAuthenticated: true });
    },
    
    clearAuth: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    },
    
    setUser: (user) => {
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    }
  };
});
