import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { BoardData, KanbanCard, KanbanColumn, User } from './types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth/AuthContext';
import { boardsApi, selfApi, ApiError } from './api';

interface KanbanContextProps {
  boards: BoardData[];
  loading: boolean;
  loadError: string | null;
  activeBoardId: string;
  setActiveBoardId: (id: string) => void;
  addBoard: (name: string) => Promise<void>;
  setBoards: (boards: BoardData[]) => Promise<void>;
  removeBoard: (id: string) => Promise<void>;
  updateBoardName: (id: string, name: string) => void;
  board: BoardData | null;
  currentUser: User | null;
  canEdit: boolean;
  isAdmin: boolean;
  moveCard: (cardId: string, toColumnId: string) => void;
  reorderCard: (activeId: string, overId: string) => void;
  addCard: (card: Omit<KanbanCard, 'id' | 'createdAt' | 'enteredColumnAt' | 'comments'>) => void;
  updateColumn: (columnId: string, updates: Partial<KanbanColumn>) => void;
  addColumn: (title: string) => void;
  removeColumn: (columnId: string) => void;
  reorderColumn: (activeId: string, overId: string) => void;
  updateCard: (cardId: string, updates: Partial<KanbanCard>) => void;
  removeCard: (cardId: string) => void;
  assignUserToBoard: (boardId: string, user: { id: string; name: string; role: User['role'] }) => Promise<void>;
  removeUserFromBoard: (boardId: string, userId: string) => Promise<void>;
  reloadBoards: () => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  lang: 'en' | 'es';
  setLang: (lang: 'en' | 'es') => void;
}

const KanbanContext = createContext<KanbanContextProps | undefined>(undefined);

export const KanbanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();

  const [boards, setBoardsState] = useState<BoardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeBoardId, setActiveBoardId] = useState<string>(() =>
    localStorage.getItem('kanban-active-board-id') ?? ''
  );

  // Theme + lang are persisted server-side per user (via /auth/me/preferences)
  // so they follow the user across browsers. Default while loading; the effect
  // below replaces these with the user's stored prefs once auth resolves.
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [lang, setLangState] = useState<'en' | 'es'>('en');
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    if (activeBoardId) localStorage.setItem('kanban-active-board-id', activeBoardId);
  }, [activeBoardId]);

  // Load preferences when auth user becomes available; reset on sign-out.
  useEffect(() => {
    if (!authUser) {
      setThemeState('light');
      setLangState('en');
      setPrefsLoaded(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const prefs = await selfApi.getPreferences();
        if (cancelled) return;
        setThemeState(prefs.theme);
        setLangState(prefs.lang);
      } catch (err) {
        console.error('[prefs] load failed:', err);
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser]);

  // Debounced PUT to avoid spamming on rapid toggles. Only fires after the
  // initial load to avoid clobbering server values with the default state.
  const prefsSaveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!authUser || !prefsLoaded) return;
    if (prefsSaveTimer.current) window.clearTimeout(prefsSaveTimer.current);
    prefsSaveTimer.current = window.setTimeout(() => {
      void selfApi.setPreferences({ theme, lang }).catch(err => {
        console.error('[prefs] save failed:', err);
      });
    }, 250);
    return () => {
      if (prefsSaveTimer.current) window.clearTimeout(prefsSaveTimer.current);
    };
  }, [theme, lang, authUser, prefsLoaded]);

  const setTheme = useCallback((t: 'light' | 'dark') => setThemeState(t), []);
  const setLang = useCallback((l: 'en' | 'es') => setLangState(l), []);

  const reloadBoards = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await boardsApi.list();
      setBoardsState(list);
      setActiveBoardId(prev => {
        if (prev && list.some(b => b.id === prev)) return prev;
        return list[0]?.id ?? '';
      });
    } catch (err) {
      const msg = err instanceof ApiError ? `Failed to load boards (${err.status})` : 'Failed to load boards';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — only after auth is settled.
  useEffect(() => {
    if (!authUser) {
      setBoardsState([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void reloadBoards();
  }, [authUser, reloadBoards]);

  const board = boards.find(b => b.id === activeBoardId) ?? null;

  const currentUser: User | null = authUser
    ? { id: authUser.id, name: authUser.name, initials: authUser.initials, role: authUser.role }
    : null;

  const isAdmin = authUser?.role === 'Admin';
  const isViewer = authUser?.role === 'Viewer';
  const isMember = !!(board && authUser && board.users.some(u => u.id === authUser.id));
  const canEdit = !!authUser && !isViewer && (isAdmin || isMember);

  // ─── Persistence: debounced PUT of the active board ──────
  // We coalesce rapid edits (drag/reorder/inline edits) into one network call.
  const saveTimers = useRef<Map<string, number>>(new Map());

  const scheduleBoardSave = useCallback((boardId: string) => {
    const timers = saveTimers.current;
    const existing = timers.get(boardId);
    if (existing) window.clearTimeout(existing);
    const id = window.setTimeout(() => {
      timers.delete(boardId);
      const target = boards.find(b => b.id === boardId);
      if (!target) return;
      void boardsApi.update(boardId, target).catch(err => {
        console.error('[boards] save failed:', err);
      });
    }, 400);
    timers.set(boardId, id);
  }, [boards]);

  // ─── Local mutation helpers (optimistic, then synced) ────
  const updateActiveBoard = (updater: (prevBoard: BoardData) => BoardData) => {
    if (!activeBoardId) return;
    setBoardsState(prev => prev.map(b => b.id === activeBoardId ? updater(b) : b));
    scheduleBoardSave(activeBoardId);
  };

  // ─── Boards CRUD (server-backed) ────────────────────────
  const addBoard = async (name: string) => {
    const created = await boardsApi.create(name);
    setBoardsState(prev => [...prev, created]);
    setActiveBoardId(created.id);
  };

  const removeBoard = async (id: string) => {
    if (boards.length <= 1) return;
    await boardsApi.remove(id);
    setBoardsState(prev => prev.filter(b => b.id !== id));
    if (activeBoardId === id) {
      const remaining = boards.filter(b => b.id !== id);
      if (remaining[0]) setActiveBoardId(remaining[0].id);
    }
  };

  const setBoards = async (next: BoardData[]) => {
    await boardsApi.replaceAll(next);
    setBoardsState(next);
    if (!next.some(b => b.id === activeBoardId) && next[0]) setActiveBoardId(next[0].id);
  };

  const updateBoardName = (id: string, name: string) => {
    setBoardsState(prev => prev.map(b => b.id === id ? { ...b, name } : b));
    scheduleBoardSave(id);
  };

  const moveCard = (cardId: string, toColumnId: string) => {
    updateActiveBoard((prev) => {
      const cardIndex = prev.cards.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return prev;
      const updatedCards = [...prev.cards];
      const currCard = updatedCards[cardIndex];
      if (currCard.columnId !== toColumnId) {
        updatedCards[cardIndex] = { ...currCard, columnId: toColumnId, enteredColumnAt: Date.now() };
      }
      return { ...prev, cards: updatedCards };
    });
  };

  const reorderCard = (activeId: string, overId: string) => {
    updateActiveBoard((prev) => {
      const activeCard = prev.cards.find(c => c.id === activeId);
      const overCard = prev.cards.find(c => c.id === overId);
      if (!activeCard || !overCard) return prev;

      const columnCards = prev.cards.filter(c => c.columnId === activeCard.columnId);
      const otherCards = prev.cards.filter(c => c.columnId !== activeCard.columnId);

      const oldIndex = columnCards.findIndex(c => c.id === activeId);
      const newIndex = columnCards.findIndex(c => c.id === overId);

      const [removed] = columnCards.splice(oldIndex, 1);
      columnCards.splice(newIndex, 0, removed);

      return { ...prev, cards: [...otherCards, ...columnCards] };
    });
  };

  const addCard = (card: Omit<KanbanCard, 'id' | 'createdAt' | 'enteredColumnAt' | 'comments'>) => {
    const newCard: KanbanCard = {
      ...card,
      id: uuidv4(),
      createdAt: Date.now(),
      enteredColumnAt: Date.now(),
      comments: []
    };
    updateActiveBoard(prev => ({ ...prev, cards: [...prev.cards, newCard] }));
  };

  const updateColumn = (columnId: string, updates: Partial<KanbanColumn>) => {
    updateActiveBoard(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.id === columnId ? { ...c, ...updates } : c)
    }));
  };

  const addColumn = (title: string) => {
    const newCol: KanbanColumn = { id: uuidv4(), title, wipLimit: 0, dod: '' };
    updateActiveBoard(prev => ({ ...prev, columns: [...prev.columns, newCol] }));
  };

  const removeColumn = (columnId: string) => {
    updateActiveBoard(prev => ({
      ...prev,
      columns: prev.columns.filter(c => c.id !== columnId),
      cards: prev.cards.filter(c => c.columnId !== columnId)
    }));
  };

  const reorderColumn = (activeId: string, overId: string) => {
    updateActiveBoard(prev => {
      const oldIndex = prev.columns.findIndex(c => c.id === activeId);
      const newIndex = prev.columns.findIndex(c => c.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newColumns = [...prev.columns];
      const [removed] = newColumns.splice(oldIndex, 1);
      newColumns.splice(newIndex, 0, removed);
      return { ...prev, columns: newColumns };
    });
  };

  const updateCard = (cardId: string, updates: Partial<KanbanCard>) => {
    updateActiveBoard(prev => ({
      ...prev,
      cards: prev.cards.map(c => c.id === cardId ? { ...c, ...updates } : c)
    }));
  };

  const removeCard = (cardId: string) => {
    updateActiveBoard(prev => ({
      ...prev,
      cards: prev.cards.filter(c => c.id !== cardId)
    }));
  };

  const assignUserToBoard = async (boardId: string, user: { id: string; name: string; role: User['role'] }) => {
    const updated = await boardsApi.assignUser(boardId, user);
    setBoardsState(prev => prev.map(b => b.id === boardId ? updated : b));
  };

  const removeUserFromBoard = async (boardId: string, userId: string) => {
    await boardsApi.removeUser(boardId, userId);
    await reloadBoards();
  };

  return (
    <KanbanContext.Provider value={{
      boards, loading, loadError, activeBoardId, setActiveBoardId, addBoard, setBoards, removeBoard, updateBoardName,
      board, currentUser, canEdit, isAdmin: !!isAdmin,
      moveCard, reorderCard, addCard, updateColumn,
      addColumn, removeColumn, reorderColumn, updateCard, removeCard,
      assignUserToBoard, removeUserFromBoard, reloadBoards,
      theme, setTheme, lang, setLang
    }}>
      {children}
    </KanbanContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useKanban = () => {
  const context = useContext(KanbanContext);
  if (!context) throw new Error('useKanban must be used within a KanbanProvider');
  return context;
};
