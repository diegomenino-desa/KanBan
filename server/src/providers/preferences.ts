import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';

export type Theme = 'light' | 'dark';
export type Lang = 'en' | 'es';

export interface UserPreferences {
  theme: Theme;
  lang: Lang;
}

interface PrefsStore {
  version: 1;
  prefs: Record<string, UserPreferences>;
}

const DEFAULTS: UserPreferences = { theme: 'light', lang: 'en' };

function emptyStore(): PrefsStore {
  return { version: 1, prefs: {} };
}

async function readStore(path: string): Promise<PrefsStore> {
  const abs = resolve(path);
  try {
    const raw = await fs.readFile(abs, 'utf8');
    const parsed = JSON.parse(raw) as PrefsStore;
    if (parsed.version !== 1 || typeof parsed.prefs !== 'object' || parsed.prefs === null) {
      return emptyStore();
    }
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore();
    throw err;
  }
}

async function writeStore(path: string, store: PrefsStore): Promise<void> {
  const abs = resolve(path);
  await fs.mkdir(dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tmp, abs);
}

function sanitize(input: Partial<UserPreferences> | undefined | null): UserPreferences {
  const theme: Theme = input?.theme === 'dark' ? 'dark' : 'light';
  const lang: Lang = input?.lang === 'es' ? 'es' : 'en';
  return { theme, lang };
}

export async function getPreferences(path: string, userId: string): Promise<UserPreferences> {
  const store = await readStore(path);
  return sanitize(store.prefs[userId] ?? DEFAULTS);
}

export async function setPreferences(
  path: string,
  userId: string,
  prefs: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const store = await readStore(path);
  const next = sanitize({ ...(store.prefs[userId] ?? DEFAULTS), ...prefs });
  store.prefs[userId] = next;
  await writeStore(path, store);
  return next;
}
