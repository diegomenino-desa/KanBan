import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';

export type CardType = 'Feature' | 'Bug' | 'Expedite' | 'TechDebt' | 'Spike';
export type BoardRole = 'Admin' | 'Editor' | 'Viewer';

export interface BoardComment {
  id: string;
  userId: string;
  text: string;
  createdAt: number;
}

export interface BoardUser {
  id: string;
  name: string;
  initials: string;
  role: BoardRole;
}

export interface BoardCard {
  id: string;
  title: string;
  type: CardType;
  columnId: string;
  assignees: string[];
  createdAt: number;
  enteredColumnAt: number;
  description?: string;
  dueDate?: string;
  comments: BoardComment[];
}

export interface BoardColumn {
  id: string;
  title: string;
  wipLimit: number;
  dod: string;
}

export interface Board {
  id: string;
  name: string;
  columns: BoardColumn[];
  cards: BoardCard[];
  users: BoardUser[];
}

export interface BoardStore {
  version: 1;
  boards: Board[];
}

export class BoardStoreError extends Error {
  constructor(message: string, public code: 'store_unavailable' | 'invalid_format') {
    super(message);
  }
}

function emptyStore(): BoardStore {
  return { version: 1, boards: [] };
}

export async function readBoardStore(path: string): Promise<BoardStore> {
  const abs = resolve(path);
  try {
    const raw = await fs.readFile(abs, 'utf8');
    const parsed = JSON.parse(raw) as BoardStore;
    if (parsed.version !== 1 || !Array.isArray(parsed.boards)) {
      throw new BoardStoreError(`Invalid board store at ${abs}`, 'invalid_format');
    }
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore();
    if (err instanceof BoardStoreError) throw err;
    throw new BoardStoreError(`Cannot read board store: ${(err as Error).message}`, 'store_unavailable');
  }
}

export async function writeBoardStore(path: string, store: BoardStore): Promise<void> {
  const abs = resolve(path);
  await fs.mkdir(dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tmp, abs);
}
