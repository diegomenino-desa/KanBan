# KanbanBoard — v2.1

A multi-board Kanban workspace for teams that want a calm, travel-magazine feel over chrome-heavy UI, with pluggable enterprise authentication (Active Directory, Entra ID, or a built-in local user store).

![KanbanBoard Preview](https://github.com/diegomenino/KanbanBoard/raw/main/src/assets/hero.png)

---

## What's new in 2.1

### Redesigned UI — Airbnb-inspired design system

Version 2.1 retires the dark-glassmorphism theme in favor of a light, photography-first system modeled on Airbnb's 2026 visual language:

- **Rausch coral** (`#ff385c`) as the single accent — reserved for primary actions and active-tab indicators. Every other surface is disciplined grayscale.
- **Ink Black** (`#222222`) text, **Hairline Gray** (`#dddddd`) 1-pixel dividers, **Soft Cloud** (`#f7f7f7`) canvas — the entire color system is six tokens.
- **Single typeface**: Inter 500/600/700 as a stand-in for Airbnb Cereal VF. No display-face mixing.
- **Radius scale**: 4 / 8 / 14 / 20 / 32 / 50% — cards sit at 14px, containers at 20px, circular icon buttons everywhere.
- **Layered shadows**: three-layer stacked elevation (`0 0 0 1px @ 2%`, `0 2px 6px @ 4%`, `0 4px 8px @ 10%`) instead of a single drop shadow — lifts feel premium and anti-aliased.
- **Light mode is the default.** The legacy dark mode is still available via Settings but is no longer the primary surface.

Design reference: the full token system and component spec lives in [DESIGN-airbnb.md](DESIGN-airbnb.md).

### Pluggable authentication — three modes

A new auth proxy service in [server/](server/) sits between the SPA and an identity provider, exposing a provider-agnostic session-cookie contract. Pick one mode at boot with `AUTH_MODE`:

| Mode | Use it when | Bind / login flow |
|---|---|---|
| `local` | Demos, isolated networks, air-gapped labs, sites without a directory | Username + bcrypt-hashed password, stored in `server/data/users.json`, managed via `npm run user:*` CLI |
| `ldap` | On-prem Active Directory Domain Services | `ldapjs` bind-as-user against the DC, group DN → app role mapping |
| `oidc` | Microsoft Entra ID / Azure AD (M365-enabled orgs) | Authorization code + PKCE, Entra app-role claim → app role mapping |

All three modes share the same REST surface (`/auth/me`, `/auth/login`, `/auth/logout`, `/auth/callback`), the same HttpOnly SameSite=Strict session cookie, and the same 5-attempt / 15-minute rate-limiter on login. The SPA doesn't know or care which provider is active — swapping modes is a config change, not a code change.

Security baked into every mode:
- HttpOnly + SameSite=Strict + Secure (in production) session cookies — no tokens touch JavaScript.
- bcrypt cost 12 for local passwords, with a dummy compare on unknown-user lookups to defend against enumeration timing leaks.
- Atomic writes for the local user store (write-temp + rename) and a permissions warning on POSIX if `users.json` is wider than `0600`.
- LDAPS-only in production (`ldap://` refused on startup when `NODE_ENV=production`).
- Passwords never appear in logs or API responses; CLI password entry never touches `argv`.

The "current user" in the Kanban workspace is now the authenticated identity — no more hardcoded `board.users[0]`. On first sign-in, the user is auto-provisioned into the active board's roster.

---

## Feature overview

### Workflow
- **Multi-board support** with isolated card and user sets per board.
- **Drag-and-drop** cards across columns and swimlanes via `@dnd-kit`.
- **WIP limits** per column with over-limit visual cues.
- **Definition of Done** policy text per column, surfaced on hover.
- **Expedite swimlane** for priority work, rendered with the Rausch tint.
- **Relative due dates** with overdue highlighting.
- **Five card types**: Feature, Bug, Expedite, TechDebt, Spike — each with a semantically mapped chip color.

### Analytics
- Lead Time and Cycle Time tracking.
- Cycle distribution and throughput charts (Recharts).
- Per-board activity breakdown.

### Team & data
- Per-board user roster — populated by the authenticated identity and editable in Settings.
- JSON export / import for the full boards collection (backup and restore).
- English and Spanish localization.

---

## Getting started

### Prerequisites
- [Docker](https://www.docker.com/) + [Docker Compose](https://docs.docker.com/compose/)

### Quickest path — local authentication

No directory, no external deps, a seeded admin on first boot.

1. Clone:
   ```bash
   git clone https://github.com/diegomenino/KanbanBoard.git
   cd KanbanBoard
   ```

2. In [docker-compose.yml](docker-compose.yml), switch to local mode:
   ```yaml
   kanban:
     environment:
       - VITE_AUTH_MODE=local
   auth:
     environment:
       - AUTH_MODE=local
       - BOOTSTRAP_ADMIN_USER=admin
       - BOOTSTRAP_ADMIN_PASSWORD=change-me-at-least-8-chars
   ```

3. Boot:
   ```bash
   docker compose up -d --build
   ```

4. Open [http://localhost:8102](http://localhost:8102) → sign in as `admin` / `change-me-at-least-8-chars`.

5. After first successful sign-in, **remove the `BOOTSTRAP_ADMIN_*` env vars** (they only run once, when the store is empty) and restart the `auth` container.

### Managing local users

All CLI commands run inside the `auth` container against the mounted user store:

```bash
# Add a user — prompts for password twice, no echo
docker compose exec auth npm run user:add alice "Alice Adams" alice@intranet Editor

# List everyone (never prints hashes)
docker compose exec auth npm run user:list

# Reset a password
docker compose exec auth npm run user:reset alice

# Remove — refuses to delete the last Admin
docker compose exec auth npm run user:remove alice
```

### Using on-prem Active Directory (LDAP)

1. Switch `AUTH_MODE=ldap` and `VITE_AUTH_MODE=ldap` in `docker-compose.yml`.
2. Set the LDAP block — see [server/.env.example](server/.env.example) for the full variable reference:
   ```yaml
   - LDAP_URL=ldaps://dc.corp.example:636
   - LDAP_BIND_DN_TEMPLATE={{username}}@corp.example
   - LDAP_SEARCH_BASE=DC=corp,DC=example
   - LDAP_ROLE_MAP={"CN=Kanban-Admins,OU=Groups,DC=corp,DC=example":"Admin"}
   - LDAP_DEFAULT_ROLE=Viewer
   ```
3. `docker compose up -d` and sign in with a domain account.

### Using Entra ID (Azure AD)

1. Register an SPA+Web app in the Entra admin center with redirect URI `http://localhost:8102/auth/callback`.
2. Switch `AUTH_MODE=oidc` and `VITE_AUTH_MODE=oidc` in `docker-compose.yml`.
3. Set the OIDC block:
   ```yaml
   - OIDC_TENANT_ID=<your-tenant-guid>
   - OIDC_CLIENT_ID=<your-client-guid>
   - OIDC_CLIENT_SECRET=<your-client-secret>
   - OIDC_REDIRECT_URI=http://localhost:8102/auth/callback
   ```
4. `docker compose up -d` — the login page shows "Sign in with Microsoft" and round-trips through Entra.

---

## Architecture

```
┌────────────────────┐        ┌────────────────────────┐        ┌──────────────────────┐
│  React SPA (Vite)  │◀──────▶│  auth-service (Node)   │◀──────▶│  local users.json    │
│  LoginGate +       │  same- │  Express + HttpOnly    │        │   — OR —             │
│  AuthContext       │  origin│  signed session cookie │        │  AD DC (LDAP/LDAPS)  │
└────────────────────┘        └────────────────────────┘        │   — OR —             │
                                                                │  Entra ID (OIDC)     │
                                                                └──────────────────────┘
```

- SPA and auth-service share an origin in production (NGINX in front, or Express serves `dist/` directly).
- In dev, Vite proxies `/auth/*` to `http://localhost:4000` so the cookie flow works same-origin.
- Session TTL is 8h rolling, stored in `express-session` with an HttpOnly signed cookie.
- All three modes normalize to a single `AuthUser` shape — `{ id, name, email, initials, role }` — consumed by [src/KanbanContext.tsx](src/KanbanContext.tsx) to drive the Kanban workspace.

---

## Tech stack

**Frontend** — React 19, TypeScript, Vite 8, `@dnd-kit`, Recharts, Lucide icons, vanilla CSS (Airbnb token system).

**Backend (auth-service)** — Node 20, Express 4, `express-session`, `express-rate-limit`, `bcryptjs`, `ldapjs`, `openid-client`, `zod`.

**Tooling** — ESLint, Vitest + Testing Library, Playwright (e2e), Docker + Docker Compose.

---

## Contributing / development

```bash
# Frontend dev
npm install
npm run dev                    # vite on :5173

# Auth service dev (separate terminal)
cd server
cp .env.example .env           # fill in your mode
npm install
npm run dev                    # tsx watch on :4000

# Tests
npm test                       # vitest
npm run test:e2e               # playwright
cd server && npm run typecheck
```

---

## 🇪🇸 Versión en Español

KanbanBoard v2.1 es un espacio de trabajo Kanban multi-tablero con un nuevo sistema de diseño inspirado en Airbnb (canvas blanco, acento coral Rausch, tipografía Inter/Cereal) y autenticación empresarial conectable con tres modos: **local** (usuarios con contraseña bcrypt en un archivo JSON, gestionados por CLI), **ldap** (Active Directory on-prem) y **oidc** (Microsoft Entra ID). Todos los modos comparten el mismo contrato de cookie de sesión — cambiar de proveedor es una edición de `AUTH_MODE`, no un cambio de código. El "usuario actual" ahora es la identidad autenticada real, no `board.users[0]`. La guía rápida es idéntica a la versión inglesa — véase más arriba.

---

## License

MIT
