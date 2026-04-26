import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { BoardData, KanbanCard, KanbanColumn, User } from './types';
import { initialMockData } from './mockData';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth/AuthContext';

interface KanbanContextProps {
  boards: BoardData[];
  activeBoardId: string;
  setActiveBoardId: (id: string) => void;
  addBoard: (name: string) => void;
  setBoards: (boards: BoardData[]) => void;
  removeBoard: (id: string) => void;
  updateBoardName: (id: string, name: string) => void;
  board: BoardData;
  currentUser: User;
  moveCard: (cardId: string, toColumnId: string) => void;
  reorderCard: (activeId: string, overId: string) => void;
  addCard: (card: Omit<KanbanCard, 'id' | 'createdAt' | 'enteredColumnAt' | 'comments'>) => void;
  updateColumn: (columnId: string, updates: Partial<KanbanColumn>) => void;
  addColumn: (title: string) => void;
  removeColumn: (columnId: string) => void;
  reorderColumn: (activeId: string, overId: string) => void;
  updateCard: (cardId: string, updates: Partial<KanbanCard>) => void;
  removeCard: (cardId: string) => void;
  addUser: (input: { id?: string; name: string; role?: User['role'] }) => void;
  removeUser: (id: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  lang: 'en' | 'es';
  setLang: (lang: 'en' | 'es') => void;
}

const KanbanContext = createContext<KanbanContextProps | undefined>(undefined);

export const KanbanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();

  const [boards, setBoards] = useState<BoardData[]>(() => {
    const saved = localStorage.getItem('kanban-boards-collection');
    if (saved) {
      const parsed = JSON.parse(saved);
      return (parsed as BoardData[]).map(b => ({
        ...b,
        cards: b.cards.map(c => ({ ...c, comments: c.comments || [] }))
      }));
    }
    return [initialMockData];
  });

  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    const savedId = localStorage.getItem('kanban-active-board-id');
    return savedId || boards[0]?.id || initialMockData.id;
  });

  const board = boards.find(b => b.id === activeBoardId) || boards[0];

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('kanban-theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const [lang, setLang] = useState<'en' | 'es'>(() => {
    const saved = localStorage.getItem('kanban-lang');
    return (saved as 'en' | 'es') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('kanban-boards-collection', JSON.stringify(boards));
    localStorage.setItem('kanban-active-board-id', activeBoardId);
    localStorage.setItem('kanban-theme', theme);
    localStorage.setItem('kanban-lang', lang);
  }, [boards, activeBoardId, theme, lang]);

  // Sync the authenticated identity into the active board's user roster
  // so the auth user is available as an assignee. The guard above ensures
  // we only write when the roster actually needs updating.
  useEffect(() => {
    if (!authUser) return;
    const existing = board.users.find(u => u.id === authUser.id);
    if (existing && existing.name === authUser.name && existing.role === authUser.role) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoards(prev => prev.map(b => {
      if (b.id !== board.id) return b;
      const others = b.users.filter(u => u.id !== authUser.id);
      const merged: User = {
        id: authUser.id,
        name: authUser.name,
        initials: authUser.initials,
        role: authUser.role,
      };
      return { ...b, users: [merged, ...others] };
    }));
  }, [authUser, board.id, board.users]);

  const currentUser: User = authUser
    ? { id: authUser.id, name: authUser.name, initials: authUser.initials, role: authUser.role }
    : board.users[0];

  const updateActiveBoard = (updater: (prevBoard: BoardData) => BoardData) => {
    setBoards(prevBoards => prevBoards.map(b => b.id === activeBoardId ? updater(b) : b));
  };

  const addBoard = (name: string) => {
    const newBoard: BoardData = {
      ...initialMockData,
      id: uuidv4(),
      name,
      columns: [...initialMockData.columns],
      cards: [],
    };
    setBoards([...boards, newBoard]);
    setActiveBoardId(newBoard.id);
  };

  const removeBoard = (id: string) => {
    if (boards.length <= 1) return;
    const newBoards = boards.filter(b => b.id !== id);
    setBoards(newBoards);
    if (activeBoardId === id) setActiveBoardId(newBoards[0].id);
  };

  const updateBoardName = (id: string, name: string) => {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, name } : b));
  };

  const moveCard = (cardId: string, toColumnId: string) => {
    updateActiveBoard((prev) => {
      const cardIndex = prev.cards.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return prev;

      const updatedCards = [...prev.cards];
      const currCard = updatedCards[cardIndex];

      if (currCard.columnId !== toColumnId) {
        updatedCards[cardIndex] = {
          ...currCard,
          columnId: toColumnId,
          enteredColumnAt: Date.now()
        };
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
    const newCol: KanbanColumn = {
      id: uuidv4(),
      title,
      wipLimit: 0,
      dod: ''
    };
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

  const addUser = (input: { id?: string; name: string; role?: User['role'] }) => {
    const id = input.id ?? uuidv4();
    const initials = input.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    const newUser: User = {
      id,
      name: input.name,
      initials,
      role: input.role ?? 'Viewer'
    };
    updateActiveBoard(prev => prev.users.some(u => u.id === id)
      ? prev
      : { ...prev, users: [...prev.users, newUser] }
    );
  };

  const removeUser = (userId: string) => {
    updateActiveBoard(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId),
      cards: prev.cards.map(c => ({
        ...c,
        assignees: c.assignees.filter(id => id !== userId)
      }))
    }));
  };

  return (
    <KanbanContext.Provider value={{
      boards, setBoards, activeBoardId, setActiveBoardId, addBoard, removeBoard, updateBoardName,
      board, currentUser, moveCard, reorderCard, addCard, updateColumn,
      addColumn, removeColumn, reorderColumn, updateCard, removeCard,
      addUser, removeUser, theme, setTheme, lang, setLang
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
