import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import type { Config } from '../config.js';
import { type AppRole, type AuthUser, initialsFromName } from '../types.js';

type LocalConfig = Extract<Config, { mode: 'local' }>;

const BCRYPT_COST = 12;
// A cached hash used for constant-time behavior on unknown-user login attempts.
// Generated once at module load so the lookup-miss path has comparable timing
// to a real compare against a stored hash.
const DUMMY_HASH = bcrypt.hashSync('dummy-constant-time-password', BCRYPT_COST);

export interface LocalUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: AppRole;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalStore {
  version: 1;
  users: LocalUser[];
}

export class LocalAuthError extends Error {
  constructor(message: string, public code: 'invalid_credentials' | 'store_unavailable') {
    super(message);
  }
}

// ─── Hashing ───────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Store I/O ─────────────────────────────────────────────

function emptyStore(): LocalStore {
  return { version: 1, users: [] };
}

export async function readStore(path: string): Promise<LocalStore> {
  const abs = resolve(path);
  try {
    const raw = await fs.readFile(abs, 'utf8');
    const parsed = JSON.parse(raw) as LocalStore;
    if (parsed.version !== 1 || !Array.isArray(parsed.users)) {
      throw new LocalAuthError(`Invalid user store at ${abs}`, 'store_unavailable');
    }
    await warnOnLoosePermissions(abs);
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore();
    if (err instanceof LocalAuthError) throw err;
    throw new LocalAuthError(`Cannot read user store: ${(err as Error).message}`, 'store_unavailable');
  }
}

export async function writeStore(path: string, store: LocalStore): Promise<void> {
  const abs = resolve(path);
  await fs.mkdir(dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(tmp, abs);
  try { await fs.chmod(abs, 0o600); } catch { /* best-effort on Windows */ }
}

async function warnOnLoosePermissions(path: string): Promise<void> {
  if (process.platform === 'win32') return;
  try {
    const st = await fs.stat(path);
    const mode = st.mode & 0o777;
    if (mode & 0o077) {
      console.warn(`[local] warning: user store ${path} has permissions ${mode.toString(8)} (expected 600). Run: chmod 600 ${path}`);
    }
  } catch { /* ignore */ }
}

// ─── Authentication ────────────────────────────────────────

export async function authenticateLocal(
  username: string,
  password: string,
  config: LocalConfig,
): Promise<AuthUser> {
  if (!username || !password) throw new LocalAuthError('Missing credentials', 'invalid_credentials');

  const store = await readStore(config.LOCAL_USERS_PATH);
  const needle = username.toLowerCase();
  const user = store.users.find((u) => u.username.toLowerCase() === needle);

  // Always run a compare to keep response time uniform regardless of
  // whether the username exists. Defends against enumeration timing leaks.
  const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hashToCheck);
  if (!user || !ok) throw new LocalAuthError('Invalid username or password', 'invalid_credentials');

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initials: initialsFromName(user.name),
    role: user.role,
  };
}

// ─── User management ───────────────────────────────────────

export interface CreateUserInput {
  username: string;
  name: string;
  email: string;
  role: AppRole;
  password: string;
}

export class UserMgmtError extends Error {
  constructor(message: string, public code: 'username_taken' | 'not_found' | 'invalid_password' | 'last_admin') {
    super(message);
  }
}

export async function createLocalUser(config: LocalConfig, input: CreateUserInput): Promise<AuthUser> {
  const store = await readStore(config.LOCAL_USERS_PATH);
  const needle = input.username.toLowerCase();
  if (store.users.some((u) => u.username.toLowerCase() === needle)) {
    throw new UserMgmtError(`Username '${input.username}' already exists`, 'username_taken');
  }
  const now = Date.now();
  const user: LocalUser = {
    id: randomUUID(),
    username: input.username,
    name: input.name,
    email: input.email,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(user);
  await writeStore(config.LOCAL_USERS_PATH, store);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initials: initialsFromName(user.name),
    role: user.role,
  };
}

export async function changeLocalUserPassword(
  config: LocalConfig,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const store = await readStore(config.LOCAL_USERS_PATH);
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new UserMgmtError('User not found', 'not_found');
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new UserMgmtError('Current password is incorrect', 'invalid_password');
  user.passwordHash = await hashPassword(newPassword);
  user.updatedAt = Date.now();
  await writeStore(config.LOCAL_USERS_PATH, store);
}

// ─── Bootstrap ─────────────────────────────────────────────

export async function bootstrapAdminIfEmpty(config: LocalConfig): Promise<void> {
  const store = await readStore(config.LOCAL_USERS_PATH);
  if (store.users.length > 0) return;

  const bUser = config.BOOTSTRAP_ADMIN_USER;
  const bPass = config.BOOTSTRAP_ADMIN_PASSWORD;
  if (!bUser || !bPass) {
    console.warn(
      '[local] user store is empty and no BOOTSTRAP_ADMIN_USER / BOOTSTRAP_ADMIN_PASSWORD set — '
      + 'no one will be able to sign in. Seed an account with `npm run user:add` or set the bootstrap env vars.',
    );
    return;
  }

  const now = Date.now();
  const admin: LocalUser = {
    id: randomUUID(),
    username: bUser,
    name: bUser,
    email: `${bUser}@localhost`,
    role: 'Admin',
    passwordHash: await hashPassword(bPass),
    createdAt: now,
    updatedAt: now,
  };
  await writeStore(config.LOCAL_USERS_PATH, { version: 1, users: [admin] });
  console.warn(
    `[local] bootstrapped admin user '${bUser}' — remove BOOTSTRAP_ADMIN_USER / `
    + `BOOTSTRAP_ADMIN_PASSWORD env vars now (they are only needed for first-run seeding).`,
  );
}
