export type CardType = 'Feature' | 'Bug' | 'Expedite' | 'TechDebt' | 'Spike';

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  role: 'Admin' | 'Editor' | 'Viewer';
}

export interface KanbanCard {
  id: string;
  title: string;
  type: CardType;
  columnId: string;
  assignees: string[]; // User IDs
  createdAt: number;   // Timestamp
  enteredColumnAt: number; // For aging calculation
  description?: string;
  dueDate?: string;
  comments: Comment[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  wipLimit: number;
  dod: string; // Definition of Done
}

export interface BoardData {
  id: string;
  name: string;
  columns: KanbanColumn[];
  cards: KanbanCard[];
  users: User[];
}
