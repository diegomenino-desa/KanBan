import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { Config } from '../config.js';
import {
  readBoardStore,
  writeBoardStore,
  type Board,
  type BoardStore,
} from '../providers/boards.js';
import { initialsFromName, type AppRole, type AuthUser } from '../types.js';

// ─── Schemas ───────────────────────────────────────────────

const RoleSchema = z.enum(['Admin', 'Editor', 'Viewer']);
const TypeSchema = z.enum(['Feature', 'Bug', 'Expedite', 'TechDebt', 'Spike']);

const BoardUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(128),
  initials: z.string().min(1).max(4),
  role: RoleSchema,
});

const BoardColumnSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(128),
  wipLimit: z.number().int().nonnegative(),
  dod: z.string().max(2048),
});

const BoardCommentSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  text: z.string().min(1).max(4096),
  createdAt: z.number().int(),
});

const BoardCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(512),
  type: TypeSchema,
  columnId: z.string().min(1),
  assignees: z.array(z.string().min(1)),
  createdAt: z.number().int(),
  enteredColumnAt: z.number().int(),
  description: z.string().max(8192).optional(),
  dueDate: z.string().max(64).optional(),
  comments: z.array(BoardCommentSchema),
});

const BoardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(128),
  columns: z.array(BoardColumnSchema),
  cards: z.array(BoardCardSchema),
  users: z.array(BoardUserSchema),
});

const CreateBoardBody = z.object({
  name: z.string().min(1).max(128),
});

const ReplaceAllBody = z.object({
  boards: z.array(BoardSchema),
});

const AssignUserBody = z.object({
  userId: z.string().min(1),
});

// ─── Authorization helpers ─────────────────────────────────

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) return res.status(401).json({ error: 'unauthenticated' });
  return next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const u = req.session.user;
  if (!u) return res.status(401).json({ error: 'unauthenticated' });
  if (u.role !== 'Admin') return res.status(403).json({ error: 'forbidden' });
  return next();
}

function isMember(board: Board, userId: string): boolean {
  return board.users.some((u) => u.id === userId);
}

function canRead(user: AuthUser, board: Board): boolean {
  return user.role === 'Admin' || isMember(board, user.id);
}

function canWrite(user: AuthUser, board: Board): boolean {
  if (user.role === 'Viewer') return false;
  return user.role === 'Admin' || isMember(board, user.id);
}

function visibleBoardsFor(user: AuthUser, store: BoardStore): Board[] {
  if (user.role === 'Admin') return store.boards;
  return store.boards.filter((b) => isMember(b, user.id));
}

// ─── Router ────────────────────────────────────────────────

export function buildBoardsRouter(config: Config): Router {
  const router = Router();
  const path = config.BOARDS_STORE_PATH;

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    try {
      const store = await readBoardStore(path);
      const visible = visibleBoardsFor(req.session.user!, store);
      return res.json(visible);
    } catch (err) {
      console.error('[boards] read failure:', (err as Error).message);
      return res.status(503).json({ error: 'store_unavailable' });
    }
  });

  router.post('/', requireAdmin, async (req: Request, res: Response) => {
    const parsed = CreateBoardBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    try {
      const store = await readBoardStore(path);
      const me = req.session.user!;
      const board: Board = {
        id: randomUUID(),
        name: parsed.data.name,
        columns: [
          { id: randomUUID(), title: 'To Do', wipLimit: 0, dod: '' },
          { id: randomUUID(), title: 'In Progress', wipLimit: 0, dod: '' },
          { id: randomUUID(), title: 'Done', wipLimit: 0, dod: '' },
        ],
        cards: [],
        users: [
          {
            id: me.id,
            name: me.name,
            initials: initialsFromName(me.name),
            role: me.role,
          },
        ],
      };
      store.boards.push(board);
      await writeBoardStore(path, store);
      return res.status(201).json(board);
    } catch (err) {
      console.error('[boards] create failure:', (err as Error).message);
      return res.status(503).json({ error: 'store_unavailable' });
    }
  });

  // Bulk replace — admin only (used by Settings → Import).
  router.put('/', requireAdmin, async (req: Request, res: Response) => {
    const parsed = ReplaceAllBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    try {
      const store: BoardStore = { version: 1, boards: parsed.data.boards };
      await writeBoardStore(path, store);
      return res.status(204).end();
    } catch (err) {
      console.error('[boards] replace-all failure:', (err as Error).message);
      return res.status(503).json({ error: 'store_unavailable' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const parsed = BoardSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    if (parsed.data.id !== req.params.id) return res.status(400).json({ error: 'id_mismatch' });
    try {
      const store = await readBoardStore(path);
      const idx = store.boards.findIndex((b) => b.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'not_found' });
      const existing = store.boards[idx]!;
      if (!canWrite(req.session.user!, existing)) {
        return res.status(403).json({ error: 'forbidden' });
      }
      // Members list is managed via the dedicated /users endpoints — preserve
      // server-of-record values rather than letting clients drift it.
      const next: Board = { ...parsed.data, users: existing.users };
      store.boards[idx] = next;
      await writeBoardStore(path, store);
      return res.json(next);
    } catch (err) {
      console.error('[boards] update failure:', (err as Error).message);
      return res.status(503).json({ error: 'store_unavailable' });
    }
  });

  router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const store = await readBoardStore(path);
      const idx = store.boards.findIndex((b) => b.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'not_found' });
      store.boards.splice(idx, 1);
      await writeBoardStore(path, store);
      return res.status(204).end();
    } catch (err) {
      console.error('[boards] delete failure:', (err as Error).message);
      return res.status(503).json({ error: 'store_unavailable' });
    }
  });

  router.post('/:id/users', requireAdmin, async (req: Request, res: Response) => {
    const parsed = AssignUserBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    try {
      const store = await readBoardStore(path);
      const board = store.boards.find((b) => b.id === req.params.id);
      if (!board) return res.status(404).json({ error: 'not_found' });
      if (board.users.some((u) => u.id === parsed.data.userId)) {
        return res.status(200).json(board); // idempotent
      }
      // Look up user metadata from the auth user store. We accept the userId
      // as the source of truth and require the caller to pass name/role via
      // the auth user list — for simplicity we pull from the boards store's
      // existing users list across all boards if present, otherwise we look
      // it up through the users endpoint. To avoid a cross-provider dep,
      // require the body to include a snapshot.
      const snapshot = req.body as { userId: string; name?: string; role?: AppRole };
      if (!snapshot.name || !snapshot.role) {
        return res.status(400).json({ error: 'missing_user_metadata' });
      }
      board.users.push({
        id: parsed.data.userId,
        name: snapshot.name,
        initials: initialsFromName(snapshot.name),
        role: snapshot.role,
      });
      await writeBoardStore(path, store);
      return res.status(201).json(board);
    } catch (err) {
      console.error('[boards] assign user failure:', (err as Error).message);
      return res.status(503).json({ error: 'store_unavailable' });
    }
  });

  router.delete('/:id/users/:userId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const store = await readBoardStore(path);
      const board = store.boards.find((b) => b.id === req.params.id);
      if (!board) return res.status(404).json({ error: 'not_found' });
      const before = board.users.length;
      board.users = board.users.filter((u) => u.id !== req.params.userId);
      if (board.users.length === before) return res.status(404).json({ error: 'user_not_on_board' });
      // Strip removed user from card assignee lists too — they no longer exist on this board.
      board.cards = board.cards.map((c) => ({
        ...c,
        assignees: c.assignees.filter((id) => id !== req.params.userId),
      }));
      await writeBoardStore(path, store);
      return res.status(204).end();
    } catch (err) {
      console.error('[boards] remove user failure:', (err as Error).message);
      return res.status(503).json({ error: 'store_unavailable' });
    }
  });

  return router;
}
