/* CLI for managing local users. Run via:
 *   npm run user:add    <username> <name> <email> <role>
 *   npm run user:remove <username>
 *   npm run user:list
 *   npm run user:reset  <username>
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as readline from 'readline';
import { z } from 'zod';
import { hashPassword, readStore, writeStore, type LocalStore, type LocalUser } from '../providers/local.js';
import { initialsFromName, type AppRole } from '../types.js';

const RoleSchema = z.enum(['Admin', 'Editor', 'Viewer']);

function storePath(): string {
  return process.env.LOCAL_USERS_PATH ?? './data/users.json';
}

function usage(): never {
  console.error(`Usage:
  npm run user:add    <username> <name> <email> <Admin|Editor|Viewer>
  npm run user:remove <username>
  npm run user:list
  npm run user:reset  <username>`);
  process.exit(2);
}

async function promptPassword(label: string): Promise<string> {
  // Silent input: write prompt directly to stdout, read from stdin without
  // echoing, and never store in shell history (password never touches argv).
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: { write: (s: string) => void } };
  const origWrite = out._writeToOutput.bind(rl);
  out._writeToOutput = () => { /* swallow echo */ };
  return new Promise<string>((resolve) => {
    rl.question(`${label}: `, (answer) => {
      out._writeToOutput = origWrite;
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function promptTwicePassword(): Promise<string> {
  const a = await promptPassword('New password');
  if (a.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  const b = await promptPassword('Confirm password');
  if (a !== b) {
    console.error('Passwords do not match.');
    process.exit(1);
  }
  return a;
}

async function loadOrInit(): Promise<LocalStore> {
  return readStore(storePath());
}

async function cmdAdd(args: string[]): Promise<void> {
  const [username, name, email, roleArg] = args;
  if (!username || !name || !email || !roleArg) usage();
  const role: AppRole = RoleSchema.parse(roleArg);
  const store = await loadOrInit();
  if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    console.error(`User '${username}' already exists.`);
    process.exit(1);
  }
  const password = await promptTwicePassword();
  const now = Date.now();
  const user: LocalUser = {
    id: randomUUID(),
    username,
    name,
    email,
    role,
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(user);
  await writeStore(storePath(), store);
  console.log(`Added ${username} (${role}, initials ${initialsFromName(name)})`);
}

async function cmdRemove(args: string[]): Promise<void> {
  const [username] = args;
  if (!username) usage();
  const store = await loadOrInit();
  const target = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!target) {
    console.error(`User '${username}' not found.`);
    process.exit(1);
  }
  const admins = store.users.filter((u) => u.role === 'Admin');
  if (target.role === 'Admin' && admins.length <= 1) {
    console.error(`Refusing to remove '${username}': it is the only Admin. Create another Admin first.`);
    process.exit(1);
  }
  store.users = store.users.filter((u) => u.id !== target.id);
  await writeStore(storePath(), store);
  console.log(`Removed ${target.username}`);
}

async function cmdList(): Promise<void> {
  const store = await loadOrInit();
  if (store.users.length === 0) {
    console.log('(no users)');
    return;
  }
  const col = (s: string, w: number) => s.padEnd(w);
  console.log(`${col('USERNAME', 20)}${col('ROLE', 10)}${col('NAME', 24)}EMAIL`);
  for (const u of store.users) {
    console.log(`${col(u.username, 20)}${col(u.role, 10)}${col(u.name, 24)}${u.email}`);
  }
}

async function cmdReset(args: string[]): Promise<void> {
  const [username] = args;
  if (!username) usage();
  const store = await loadOrInit();
  const target = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!target) {
    console.error(`User '${username}' not found.`);
    process.exit(1);
  }
  const password = await promptTwicePassword();
  target.passwordHash = await hashPassword(password);
  target.updatedAt = Date.now();
  await writeStore(storePath(), store);
  console.log(`Password updated for ${target.username}`);
}

async function main(): Promise<void> {
  const [, , sub, ...rest] = process.argv;
  switch (sub) {
    case 'add':            await cmdAdd(rest); break;
    case 'remove':         await cmdRemove(rest); break;
    case 'list':           await cmdList(); break;
    case 'reset-password': await cmdReset(rest); break;
    default: usage();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
