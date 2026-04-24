export type AppRole = 'Admin' | 'Editor' | 'Viewer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: AppRole;
}

declare module 'express-session' {
  interface SessionData {
    user?: AuthUser;
    oidcState?: string;
    oidcNonce?: string;
    oidcCodeVerifier?: string;
  }
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
