import React from 'react';
import { AuthContext, type AuthContextValue, type AuthMode, type AuthUser } from '../auth/AuthContext';
import { KanbanProvider } from '../KanbanContext';

const defaultStubUser: AuthUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test.user@example.com',
  initials: 'TU',
  role: 'Admin',
};

// eslint-disable-next-line react-refresh/only-export-components
export function buildAuthStub(user: AuthUser | null = defaultStubUser, mode: AuthMode = 'ldap'): AuthContextValue {
  return {
    user,
    loading: false,
    mode,
    error: null,
    loginPassword: async () => { /* noop */ },
    loginOidc: () => { /* noop */ },
    logout: async () => { /* noop */ },
  };
}

export const TestProviders: React.FC<{
  children: React.ReactNode;
  user?: AuthUser | null;
  mode?: AuthMode;
}> = ({ children, user, mode }) => {
  const value = buildAuthStub(user === undefined ? defaultStubUser : user, mode);
  return (
    <AuthContext.Provider value={value}>
      <KanbanProvider>{children}</KanbanProvider>
    </AuthContext.Provider>
  );
};
