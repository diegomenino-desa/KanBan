import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useKanban } from '../KanbanContext';
import { TestProviders } from '../testUtils/TestProviders';
import type { BoardData } from '../types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
);

const seedBoard: BoardData = {
  id: 'board-test',
  name: 'Test Board',
  users: [
    { id: 'test-user-id', name: 'Test User', initials: 'TU', role: 'Admin' },
  ],
  columns: [
    { id: 'col-1', title: 'To Do', wipLimit: 0, dod: '' },
    { id: 'col-2', title: 'Doing', wipLimit: 0, dod: '' },
  ],
  cards: [],
};

// Build a simple in-memory mock for the boards API. Each test starts with a
// single seeded board so existing assertions about "one board" still hold.
function buildFetchMock() {
  let store: BoardData[] = [structuredClone(seedBoard)];
  return {
    fetch: vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url === '/api/boards' && method === 'GET') {
        return new Response(JSON.stringify(store), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === '/auth/me/preferences') {
        return new Response(JSON.stringify({ theme: 'light', lang: 'en' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === '/api/boards' && method === 'POST') {
        const body = JSON.parse(init!.body as string) as { name: string };
        const created: BoardData = {
          id: `board-${store.length + 1}`,
          name: body.name,
          columns: [],
          cards: [],
          users: [],
        };
        store.push(created);
        return new Response(JSON.stringify(created), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === '/api/boards' && method === 'PUT') {
        const body = JSON.parse(init!.body as string) as { boards: BoardData[] };
        store = body.boards;
        return new Response(null, { status: 204 });
      }
      const idMatch = url.match(/^\/api\/boards\/([^/]+)$/);
      if (idMatch && method === 'PUT') {
        const updated = JSON.parse(init!.body as string) as BoardData;
        store = store.map(b => b.id === idMatch[1] ? updated : b);
        return new Response(JSON.stringify(updated), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (idMatch && method === 'DELETE') {
        store = store.filter(b => b.id !== idMatch[1]);
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify({ error: 'not_handled' }), { status: 404 });
    }),
    snapshot: () => store,
  };
}

describe('KanbanContext', () => {
  let mock: ReturnType<typeof buildFetchMock>;

  beforeEach(() => {
    localStorage.clear();
    mock = buildFetchMock();
    vi.stubGlobal('fetch', mock.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads boards from the server on mount', async () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.boards).toHaveLength(1);
    expect(result.current.board?.id).toBe('board-test');
    expect(result.current.theme).toBe('light');
  });

  it('grants canEdit to an Admin', async () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  it('adds a new board via the API', async () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.addBoard('New Test Board'); });
    expect(result.current.boards).toHaveLength(2);
    expect(result.current.boards[1].name).toBe('New Test Board');
    expect(result.current.activeBoardId).toBe(result.current.boards[1].id);
  });

  it('removes a board via the API', async () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.addBoard('To be removed'); });
    const boardIdToRemove = result.current.activeBoardId;
    await act(async () => { await result.current.removeBoard(boardIdToRemove); });
    expect(result.current.boards).toHaveLength(1);
    expect(result.current.activeBoardId).not.toBe(boardIdToRemove);
  });

  it('adds a card to the current board (optimistic)', async () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCardCount = result.current.board?.cards.length ?? -1;

    act(() => {
      result.current.addCard({
        title: 'New Task',
        description: 'Test Description',
        columnId: result.current.board!.columns[0].id,
        type: 'Feature',
        assignees: [],
      });
    });

    expect(result.current.board?.cards).toHaveLength(initialCardCount + 1);
    expect(result.current.board?.cards.some(c => c.title === 'New Task')).toBe(true);
  });

  it('updates WIP limit for a column (optimistic)', async () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const columnId = result.current.board!.columns[0].id;

    act(() => {
      result.current.updateColumn(columnId, { wipLimit: 5 });
    });

    const updatedColumn = result.current.board?.columns.find(c => c.id === columnId);
    expect(updatedColumn?.wipLimit).toBe(5);
  });

  it('updates theme state when setTheme is called', async () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });
});
