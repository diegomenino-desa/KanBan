import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { KanbanProvider, useKanban } from '../KanbanContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <KanbanProvider>{children}</KanbanProvider>
);

describe('KanbanContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default data', () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    expect(result.current.boards).toHaveLength(1);
    expect(result.current.board).toBeDefined();
    expect(result.current.theme).toBe('dark');
  });

  it('should add a new board', () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    act(() => {
      result.current.addBoard('New Test Board');
    });
    expect(result.current.boards).toHaveLength(2);
    expect(result.current.boards[1].name).toBe('New Test Board');
    expect(result.current.activeBoardId).toBe(result.current.boards[1].id);
  });

  it('should remove a board', () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    act(() => {
      result.current.addBoard('To be removed');
    });
    const boardIdToRemove = result.current.activeBoardId;
    act(() => {
      result.current.removeBoard(boardIdToRemove);
    });
    expect(result.current.boards).toHaveLength(1);
    expect(result.current.activeBoardId).not.toBe(boardIdToRemove);
  });

  it('should add a card to the current board', () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    const initialCardCount = result.current.board.cards.length;

    act(() => {
      result.current.addCard({
        title: 'New Task',
        description: 'Test Description',
        columnId: result.current.board.columns[0].id,
        type: 'Feature',
        assignees: [],
      });
    });

    expect(result.current.board.cards).toHaveLength(initialCardCount + 1);
    expect(result.current.board.cards.some(c => c.title === 'New Task')).toBe(true);
  });

  it('should update WIP limit for a column', () => {
    const { result } = renderHook(() => useKanban(), { wrapper });
    const columnId = result.current.board.columns[0].id;

    act(() => {
      result.current.updateColumn(columnId, { wipLimit: 5 });
    });

    const updatedColumn = result.current.board.columns.find(c => c.id === columnId);
    expect(updatedColumn?.wipLimit).toBe(5);
  });

  it('should change theme', () => {
    const { result } = renderHook(() => useKanban(), { wrapper });

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('kanban-theme')).toBe('light');
  });
});
