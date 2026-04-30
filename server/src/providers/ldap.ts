import fs from 'node:fs';
import ldap from 'ldapjs';
import type { Config } from '../config.js';
import { type AppRole, type AuthUser, initialsFromName } from '../types.js';

type LdapConfig = Extract<Config, { mode: 'ldap' }>;

export class LdapAuthError extends Error {
  constructor(message: string, public code: 'invalid_credentials' | 'unavailable' | 'not_found') {
    super(message);
  }
}

function render(template: string, username: string): string {
  return template.replaceAll('{{username}}', username);
}

function pickRole(memberOf: string[], map: Record<string, AppRole>, fallback: AppRole): AppRole {
  for (const dn of memberOf) {
    if (map[dn]) return map[dn];
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return [value];
  return [];
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  return undefined;
}

export async function authenticateLdap(
  username: string,
  password: string,
  config: LdapConfig,
): Promise<AuthUser> {
  if (!username || !password) {
    throw new LdapAuthError('Missing credentials', 'invalid_credentials');
  }

  const bindDn = render(config.LDAP_BIND_DN_TEMPLATE, username);

  const tlsOptions: Record<string, unknown> = {
    rejectUnauthorized: config.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false',
  };
  if (config.LDAP_TLS_CA_CERT_PATH) {
    tlsOptions['ca'] = [fs.readFileSync(config.LDAP_TLS_CA_CERT_PATH)];
  }

  const client = ldap.createClient({
    url: config.LDAP_URL,
    connectTimeout: 5000,
    timeout: 8000,
    tlsOptions,
  });

  const cleanup = () => {
    try { client.unbind(); } catch { /* swallow */ }
  };

  client.on('error', () => { /* surfaced via bind callback */ });

  // 1. Bind as the user (authentication)
  await new Promise<void>((resolve, reject) => {
    client.bind(bindDn, password, (err) => {
      if (!err) return resolve();
      const code = (err as { name?: string }).name === 'InvalidCredentialsError'
        ? 'invalid_credentials'
        : 'unavailable';
      reject(new LdapAuthError(err.message, code));
    });
  }).catch((err) => { cleanup(); throw err; });

  // 2. Search for user attributes
  const filter = render(config.LDAP_SEARCH_FILTER, username);
  const entry = await new Promise<Record<string, unknown>>((resolve, reject) => {
    client.search(
      config.LDAP_SEARCH_BASE,
      { filter, scope: 'sub', attributes: ['displayName', 'cn', 'mail', 'userPrincipalName', 'sAMAccountName', 'objectGUID', 'memberOf'] },
      (err, res) => {
        if (err) return reject(new LdapAuthError(err.message, 'unavailable'));
        let found: Record<string, unknown> | null = null;
        res.on('searchEntry', (e) => {
          found = (e as unknown as { pojo?: { attributes: Array<{ type: string; values: string[] }> }; object?: Record<string, unknown> }).pojo
            ? Object.fromEntries(
                (e as unknown as { pojo: { attributes: Array<{ type: string; values: string[] }> } }).pojo.attributes.map((a) => [a.type, a.values.length === 1 ? a.values[0] : a.values]),
              )
            : (e as unknown as { object: Record<string, unknown> }).object;
        });
        res.on('error', (e) => reject(new LdapAuthError(e.message, 'unavailable')));
        res.on('end', () => {
          if (!found) return reject(new LdapAuthError('User not found in directory after successful bind', 'not_found'));
          resolve(found);
        });
      },
    );
  }).finally(cleanup);

  const displayName = asString(entry['displayName']) ?? asString(entry['cn']) ?? username;
  const email = asString(entry['mail']) ?? asString(entry['userPrincipalName']) ?? `${username}@unknown`;
  const id = asString(entry['objectGUID']) ?? asString(entry['sAMAccountName']) ?? username;
  const memberOf = asStringArray(entry['memberOf']);
  const role = pickRole(memberOf, config.LDAP_ROLE_MAP, config.LDAP_DEFAULT_ROLE);

  return {
    id,
    name: displayName,
    email,
    initials: initialsFromName(displayName),
    role,
  };
}
