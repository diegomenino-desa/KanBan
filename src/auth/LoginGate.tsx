import React from 'react';
import { useAuth } from './AuthContext';
import { LoginView } from './LoginView';

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--soft-cloud)',
        color: 'var(--ash)',
        fontWeight: 500,
        fontSize: '0.9rem',
      }}>
        Loading…
      </div>
    );
  }

  if (!user) return <LoginView />;
  return <>{children}</>;
};
