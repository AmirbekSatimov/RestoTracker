import { createContext, useContext, useMemo, useState } from 'react';

type User = {
  id: number;
  username: string;
};

type AuthResult = {
  ok: boolean;
  error?: string;
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  authStatus: 'idle' | 'loading' | 'error' | 'ok';
  authError: string;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, password: string) => Promise<AuthResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');
  const [authError, setAuthError] = useState('');
  const apiBase = useMemo(
    () => (process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '').replace(/\/$/, ''),
    []
  );

  const handleAuth = async (path: string, username: string, password: string) => {
    if (!apiBase) {
      return { ok: false, error: 'Missing EXPO_PUBLIC_API_BASE_URL.' };
    }
    setAuthStatus('loading');
    setAuthError('');
    try {
      const response = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data?.error || 'Authentication failed.';
        setAuthStatus('error');
        setAuthError(message);
        return { ok: false, error: message };
      }
      setToken(data.token);
      setUser(data.user);
      setAuthStatus('ok');
      return { ok: true };
    } catch (error) {
      setAuthStatus('error');
      setAuthError('Unable to reach the server.');
      return { ok: false, error: 'Unable to reach the server.' };
    }
  };

  const login = (username: string, password: string) => handleAuth('/auth/login', username, password);
  const register = (username: string, password: string) =>
    handleAuth('/auth/register', username, password);

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthStatus('idle');
    setAuthError('');
  };

  const value = useMemo(
    () => ({ token, user, authStatus, authError, login, register, logout }),
    [token, user, authStatus, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
