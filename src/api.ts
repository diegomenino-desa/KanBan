import type { BoardData } from './types';
import type { AuthUser } from './auth/AuthContext';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: string };
      code = body.error;
    } catch { /* ignore */ }
    throw new ApiError(`Request failed (${res.status})`, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Boards ──────────────────────────────────────────────

export const boardsApi = {
  list: () => request<BoardData[]>('/api/boards'),
  create: (name: string) =>
    request<BoardData>('/api/boards', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: string, board: BoardData) =>
    request<BoardData>(`/api/boards/${id}`, { method: 'PUT', body: JSON.stringify(board) }),
  remove: (id: string) =>
    request<void>(`/api/boards/${id}`, { method: 'DELETE' }),
  replaceAll: (boards: BoardData[]) =>
    request<void>('/api/boards', { method: 'PUT', body: JSON.stringify({ boards }) }),
  assignUser: (boardId: string, user: { id: string; name: string; role: 'Admin' | 'Editor' | 'Viewer' }) =>
    request<BoardData>(`/api/boards/${boardId}/users`, {
      method: 'POST',
      body: JSON.stringify({ userId: user.id, name: user.name, role: user.role }),
    }),
  removeUser: (boardId: string, userId: string) =>
    request<void>(`/api/boards/${boardId}/users/${userId}`, { method: 'DELETE' }),
};

// ─── Users (admin) ────────────────────────────────────────

export const usersApi = {
  list: () => request<AuthUser[]>('/auth/users'),
  create: (input: { username: string; name: string; email: string; role: 'Admin' | 'Editor' | 'Viewer'; password: string }) =>
    request<AuthUser>('/auth/users', { method: 'POST', body: JSON.stringify(input) }),
  remove: (id: string) =>
    request<void>(`/auth/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string, newPassword: string) =>
    request<void>(`/auth/users/${id}/password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
};

// ─── Self ────────────────────────────────────────────────

export interface UserPreferences {
  theme: 'light' | 'dark';
  lang: 'en' | 'es';
}

export const selfApi = {
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/auth/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  getPreferences: () =>
    request<UserPreferences>('/auth/me/preferences'),
  setPreferences: (prefs: Partial<UserPreferences>) =>
    request<UserPreferences>('/auth/me/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    }),
};
