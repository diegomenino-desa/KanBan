import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type AuthMode = 'ldap' | 'oidc' | 'local';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: 'Admin' | 'Editor' | 'Viewer';
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  mode: AuthMode;
  error: string | null;
  loginPassword: (username: string, password: string) => Promise<void>;
  loginOidc: () => void;
  logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

const MODE: AuthMode = (import.meta.env.VITE_AUTH_MODE as AuthMode) ?? 'ldap';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/auth/me', { credentials: 'same-origin' });
      if (res.ok) {
        const u = (await res.json()) as AuthUser;
        setUser(u);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loginPassword = useCallback(async (username: string, password: string) => {
    setError(null);
    const res = await fetch('/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      if (res.status === 401) setError('Invalid username or password.');
      else if (res.status === 429) setError('Too many attempts. Please wait and try again.');
      else if (res.status === 503) setError(MODE === 'local' ? 'User store unavailable. Contact your administrator.' : 'Directory unavailable. Contact your administrator.');
      else setError('Sign-in failed.');
      throw new Error('login_failed');
    }
    const u = (await res.json()) as AuthUser;
    setUser(u);
  }, []);

  const loginOidc = useCallback(() => {
    window.location.href = '/auth/login';
  }, []);

  const logout = useCallback(async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    setUser(null);
  }, []);

  const value: AuthContextValue = { user, loading, mode: MODE, error, loginPassword, loginOidc, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
