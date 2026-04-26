import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';
import { initialMockData } from './mockData';

// Default fetch mock used by tests that exercise the KanbanProvider but don't
// care about specific server behavior. Individual tests can override with
// `vi.stubGlobal('fetch', ...)`.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url === '/api/boards' && method === 'GET') {
      return new Response(JSON.stringify([initialMockData]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url === '/auth/users' && method === 'GET') {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url === '/auth/me/preferences') {
      return new Response(JSON.stringify({ theme: 'light', lang: 'en' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Optimistic writes/deletes succeed silently for the default mock.
    if (method === 'PUT' || method === 'POST' || method === 'DELETE') {
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify({ error: 'not_handled' }), { status: 404 });
  }));
});
