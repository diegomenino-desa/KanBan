import { Issuer, generators, type Client } from 'openid-client';
import type { Config } from '../config.js';
import { type AppRole, type AuthUser, initialsFromName } from '../types.js';

type OidcConfig = Extract<Config, { mode: 'oidc' }>;

export interface OidcRuntime {
  client: Client;
  buildAuthRequest(): { url: string; state: string; nonce: string; codeVerifier: string };
  handleCallback(args: {
    url: string;
    state: string;
    nonce: string;
    codeVerifier: string;
  }): Promise<AuthUser>;
}

function pickRole(roles: string[], map: Record<string, AppRole>, fallback: AppRole): AppRole {
  for (const r of roles) {
    if (map[r]) return map[r];
  }
  return fallback;
}

export async function buildOidcRuntime(config: OidcConfig): Promise<OidcRuntime> {
  const issuer = await Issuer.discover(`https://login.microsoftonline.com/${config.OIDC_TENANT_ID}/v2.0`);
  const client = new issuer.Client({
    client_id: config.OIDC_CLIENT_ID,
    client_secret: config.OIDC_CLIENT_SECRET,
    redirect_uris: [config.OIDC_REDIRECT_URI],
    response_types: ['code'],
  });

  return {
    client,
    buildAuthRequest() {
      const state = generators.state();
      const nonce = generators.nonce();
      const codeVerifier = generators.codeVerifier();
      const codeChallenge = generators.codeChallenge(codeVerifier);
      const url = client.authorizationUrl({
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      return { url, state, nonce, codeVerifier };
    },
    async handleCallback({ url, state, nonce, codeVerifier }) {
      const params = client.callbackParams(url);
      const tokenSet = await client.callback(
        config.OIDC_REDIRECT_URI,
        params,
        { state, nonce, code_verifier: codeVerifier },
      );
      const claims = tokenSet.claims();
      const name = (claims.name as string | undefined) ?? (claims.preferred_username as string | undefined) ?? 'Unknown';
      const email = (claims.email as string | undefined) ?? (claims.preferred_username as string | undefined) ?? 'unknown@unknown';
      const id = (claims.oid as string | undefined) ?? claims.sub;
      const rolesClaim = claims.roles;
      const roles = Array.isArray(rolesClaim) ? rolesClaim.map(String) : [];
      const role = pickRole(roles, config.OIDC_ROLE_MAP, config.OIDC_DEFAULT_ROLE);
      return {
        id,
        name,
        email,
        initials: initialsFromName(name),
        role,
      };
    },
  };
}
