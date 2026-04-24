import React from 'react';
import { AuthContext, type AuthContextValue, type AuthUser } from '../auth/AuthContext';
import { KanbanProvider } from '../KanbanContext';

const defaultStubUser: AuthUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test.user@example.com',
  initials: 'TU',
  role: 'Admin',
};

// eslint-disable-next-line react-refresh/only-export-components
export function buildAuthStub(user: AuthUser | null = defaultStubUser): AuthContextValue {
  return {
    user,
    loading: false,
    mode: 'ldap',
    error: null,
    loginPassword: async () => { /* noop */ },
    loginOidc: () => { /* noop */ },
    logout: async () => { /* noop */ },
  };
}

export const TestProviders: React.FC<{
  children: React.ReactNode;
  user?: AuthUser | null;
}> = ({ children, user }) => {
  const value = buildAuthStub(user === undefined ? defaultStubUser : user);
  return (
    <AuthContext.Provider value={value}>
      <KanbanProvider>{children}</KanbanProvider>
    </AuthContext.Provider>
  );
};
