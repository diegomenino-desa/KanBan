import 'dotenv/config';
import { z } from 'zod';
import type { AppRole } from './types.js';

const AppRoleSchema = z.enum(['Admin', 'Editor', 'Viewer']);

const RoleMapSchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (!raw) return {} as Record<string, AppRole>;
    try {
      const parsed = JSON.parse(raw);
      const result: Record<string, AppRole> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const role = AppRoleSchema.parse(value);
        result[key] = role;
      }
      return result;
    } catch (err) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid role-map JSON: ${(err as Error).message}` });
      return z.NEVER;
    }
  });

const BaseSchema = z.object({
  AUTH_MODE: z.enum(['ldap', 'oidc', 'local']),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 chars'),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
});

const LdapSchema = z.object({
  LDAP_URL: z.string().min(1),
  LDAP_BIND_DN_TEMPLATE: z.string().min(1),
  LDAP_SEARCH_BASE: z.string().min(1),
  LDAP_SEARCH_FILTER: z.string().default('(|(sAMAccountName={{username}})(userPrincipalName={{username}}))'),
  LDAP_ROLE_MAP: RoleMapSchema,
  LDAP_DEFAULT_ROLE: AppRoleSchema.default('Viewer'),
});

const OidcSchema = z.object({
  OIDC_TENANT_ID: z.string().min(1),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_REDIRECT_URI: z.string().url(),
  OIDC_ROLE_MAP: RoleMapSchema,
  OIDC_DEFAULT_ROLE: AppRoleSchema.default('Viewer'),
});

const LocalSchema = z.object({
  LOCAL_USERS_PATH: z.string().default('./data/users.json'),
  BOOTSTRAP_ADMIN_USER: z.string().min(1).max(64).optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).optional(),
});

export type Config =
  | ({ mode: 'ldap' } & z.infer<typeof BaseSchema> & z.infer<typeof LdapSchema>)
  | ({ mode: 'oidc' } & z.infer<typeof BaseSchema> & z.infer<typeof OidcSchema>)
  | ({ mode: 'local' } & z.infer<typeof BaseSchema> & z.infer<typeof LocalSchema>);

export function loadConfig(): Config {
  const base = BaseSchema.parse(process.env);

  if (base.AUTH_MODE === 'ldap') {
    const ldap = LdapSchema.parse(process.env);
    if (base.NODE_ENV === 'production' && ldap.LDAP_URL.startsWith('ldap://')) {
      throw new Error('Refusing to start: LDAPS required in production (set LDAP_URL=ldaps://…)');
    }
    return { mode: 'ldap', ...base, ...ldap };
  }

  if (base.AUTH_MODE === 'oidc') {
    const oidc = OidcSchema.parse(process.env);
    return { mode: 'oidc', ...base, ...oidc };
  }

  // local
  const local = LocalSchema.parse(process.env);
  // Bootstrap vars must be both-or-neither.
  const hasUser = local.BOOTSTRAP_ADMIN_USER !== undefined;
  const hasPass = local.BOOTSTRAP_ADMIN_PASSWORD !== undefined;
  if (hasUser !== hasPass) {
    throw new Error('BOOTSTRAP_ADMIN_USER and BOOTSTRAP_ADMIN_PASSWORD must be set together or not at all.');
  }
  return { mode: 'local', ...base, ...local };
}
