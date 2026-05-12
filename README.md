# KanbanBoard — v3.0

A multi-board Kanban workspace for teams that want a calm, travel-magazine feel over chrome-heavy UI, with pluggable enterprise authentication (Active Directory, Entra ID, or a built-in local user store).

![KanbanBoard Preview](https://github.com/diegomenino/KanbanBoard/raw/main/src/assets/hero.png)

---

## What's new in v3.0

### Production-grade Docker deployment

The frontend and auth service now ship as lean, multi-stage Docker images ready for production:

- **Frontend** — `node:20-alpine` build stage compiles the Vite SPA, then a bare `nginx:alpine` stage serves the static bundle. No Node.js runtime in prod.
- **Auth service** — `tsc` compiles TypeScript in a build stage; the final image runs only compiled JS with no `devDependencies`.
- **nginx reverse proxy** (`nginx.conf`) — handles SPA history-mode fallback (`try_files`), and proxies `/auth/*` and `/api/*` upstream to the auth service. One public port, no CORS.
- **`SESSION_SECRET`** is now required at runtime (loaded from `.env` via docker-compose) — the service refuses to start without it.
- Session cookie `secure` flag is driven by `APP_BASE_URL` scheme rather than `NODE_ENV`, so HTTPS is detected correctly behind a terminating proxy.
- `.dockerignore` excludes test files, `e2e/`, and `.env` from build contexts.
- `.env.example` documents every required and optional variable.

### LDAPS TLS fine-tuning

Three new variables let you adapt the LDAP TLS connection to corporate CAs and non-standard deployments:

| Variable | Purpose |
|---|---|
| `LDAP_TLS_CA_CERT_PATH` | Path to a PEM bundle for an internal CA — mount it as a Docker secret or volume |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | Set to `false` to disable cert verification (dev/lab only — never in production) |
| `LDAP_ALLOW_PLAINTEXT` | Set to `true` to allow `ldap://` in production (use with a TLS-terminating proxy) |

### Security patch

- `postcss` bumped to 8.5.12 (fixes [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)).

---

## What's new in v2.5

### Server-side board store + role-based access control

Boards no longer live in `localStorage` — they're persisted on the auth service at `server/data/boards.json` and fetched per session, so workspace state follows the user across browsers and devices instead of being trapped in one machine.

Three roles are now enforced both in the UI and on the server:

| Role | Can do |
|---|---|
| **Admin** | All of Editor + Viewer, plus: create/delete boards, assign or remove users to boards, create/delete auth accounts, reset any user's password |
| **Editor** | Read & write cards, columns, comments — only on boards they are a member of |
| **Viewer** | Read-only access to assigned boards. All edit UI is hidden; server also rejects writes |

Membership is per-board: an admin assigns specific users to specific boards from **Settings → Board members**. Non-members never see a board in their picker. Admins bypass the membership check (they see everything).

### Admin user management UI (local mode)

Admin Settings now ships a full account management panel:
- **Add new user** — creates an auth account from username / name / email / role / password and (when a board is open) auto-assigns to it.
- **All users** — full directory list with one-click reset-password and delete (refuses to remove the only Admin).
- **Assign existing user** — drop-down picker on each board to bring an existing user onto the team.

### Self-service password change

Any signed-in user gets a **Change password** card in Settings (local auth only) — current password verification, new password ≥ 8 chars, double-confirm, rate-limited at 10 attempts / 15 min.

### Per-user theme & language preferences

Theme and language are now stored server-side per user (`server/data/preferences.json`, keyed by user id). They follow the user — sign in on a different browser and your dark-mode + Spanish settings come with you. Auth-mode-agnostic (works under LDAP, OIDC, and local).

### Mobile-friendly UX (≤768px)

- Top nav collapses (wordmark + button labels hide; icons stay).
- Columns shrink to `min(86vw, 320px)` with x-scroll-snap so one column dominates and the next peeks.
- `TouchSensor` with a 250 ms long-press lets taps and swipes scroll naturally, while a held finger starts a drag.
- All `.btn-icon` controls scale up to 40px on mobile for finger-sized targets.
- Modal backdrop padding shrinks; settings 2-col grids collapse to 1 col.

### New REST endpoints

```
GET    /api/boards                          list boards visible to me
POST   /api/boards                          admin: create board
PUT    /api/boards                          admin: bulk replace (Import)
PUT    /api/boards/:id                      Editor+ on board: persist board
DELETE /api/boards/:id                      admin: delete board
POST   /api/boards/:id/users                admin: add member
DELETE /api/boards/:id/users/:userId        admin: remove member
GET    /auth/users                          admin (local): list accounts
POST   /auth/users                          admin (local): create account
DELETE /auth/users/:id                      admin (local): delete account
POST   /auth/users/:id/password             admin (local): reset another user's password
POST   /auth/me/password                    self (local): change own password
GET    /auth/me/preferences                 self: read theme + lang
PUT    /auth/me/preferences                 self: update theme + lang
```

CSRF protection rides on the existing `SameSite=Strict` + `HttpOnly` session cookie — no token middleware needed for these endpoints.

> **Upgrading from 2.1:** `localStorage` boards are not migrated automatically. The first admin sign-in lands on an empty workspace; either click **Add board** to start fresh or use **Settings → Import** with a previously exported JSON to restore.

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
- Per-board membership — admins explicitly assign users to specific boards from Settings.
- Server-side board persistence (`server/data/boards.json`) — workspace state follows the user, not the browser.
- Per-user preferences (theme + language) persisted server-side and synced across devices.
- JSON export / import for the full boards collection (admin only — replaces all server-side board data).
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
│  React SPA (Vite)  │◀──────▶│  auth-service (Node)   │◀──────▶│  Identity provider   │
│  LoginGate +       │  same- │  Express + HttpOnly    │        │   users.json         │
│  AuthContext +     │  origin│  signed session cookie │        │    — OR —            │
│  KanbanContext     │   /auth│  + role-based authz    │        │   AD DC (LDAP/LDAPS) │
│   (server-fetched  │   /api │                        │        │    — OR —            │
│    boards & prefs) │        │                        │        │   Entra ID (OIDC)    │
└────────────────────┘        └────────────────────────┘        └──────────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │  Server-side state     │
                              │  data/boards.json      │
                              │  data/preferences.json │
                              └────────────────────────┘
```

- SPA and auth-service share an origin in production (NGINX in front, or Express serves `dist/` directly).
- In dev, Vite proxies both `/auth/*` and `/api/*` to `http://localhost:4000` so the cookie flow works same-origin.
- Session TTL is 8h rolling, stored in `express-session` with an HttpOnly signed cookie.
- All three modes normalize to a single `AuthUser` shape — `{ id, name, email, initials, role }` — consumed by [src/KanbanContext.tsx](src/KanbanContext.tsx) to drive the Kanban workspace.
- Boards, board membership, card data, and per-user preferences are all persisted server-side and authorized per-request against the session user's role and board membership.

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
npm run test:e2e               # playwright (see note below)
cd server && npm run typecheck

# Playwright reads E2E_USERNAME / E2E_PASSWORD from the environment and
# falls back to admin / password (the docker-compose bootstrap values).
# If you've rotated the admin password since first boot, export them:
#   E2E_USERNAME=admin E2E_PASSWORD='your-current-pw' npm run test:e2e
```

---

## 🇪🇸 Versión en Español

KanbanBoard v3.0 es un espacio de trabajo Kanban multi-tablero con sistema de diseño inspirado en Airbnb (canvas blanco, acento coral Rausch, tipografía Inter) y autenticación empresarial conectable con tres modos: **local** (usuarios con contraseña bcrypt en un archivo JSON), **ldap** (Active Directory on-prem) y **oidc** (Microsoft Entra ID). Cambiar de proveedor es una edición de `AUTH_MODE`, no un cambio de código.

### Novedades en 2.5

**Almacenamiento de tableros en el servidor + control de acceso por roles.** Los tableros ya no viven en `localStorage`: se guardan en el servicio de autenticación (`server/data/boards.json`) y se cargan por sesión, así que el espacio de trabajo te sigue entre navegadores y dispositivos. Tres roles ahora se aplican tanto en la interfaz como en el servidor:

- **Admin** — acceso total: crea/elimina tableros, asigna o quita usuarios de tableros, crea/elimina cuentas, restablece contraseñas de cualquier usuario.
- **Editor** — lee y edita tarjetas, columnas y comentarios solo en los tableros donde es miembro.
- **Visor** — solo lectura en los tableros asignados; toda la interfaz de edición está oculta y el servidor también rechaza escrituras.

La membresía es por tablero. Un administrador asigna usuarios específicos a tableros específicos desde **Configuración → Miembros del tablero**. Quien no es miembro nunca ve el tablero en su selector.

**Panel de gestión de usuarios para administradores (modo local).** Configuración incluye un panel completo para administrar cuentas: agregar usuario nuevo (usuario / nombre / email / rol / contraseña), listar todas las cuentas, restablecer contraseñas con un clic y eliminar usuarios (se rechaza eliminar al único administrador).

**Cambio de contraseña por el propio usuario.** Cualquier usuario autenticado puede cambiar su contraseña desde Configuración (modo local), con verificación de la actual y limitación de intentos.

**Preferencias de tema e idioma por usuario.** El tema (claro/oscuro) y el idioma (en/es) ahora se guardan en el servidor por usuario (`server/data/preferences.json`) y te siguen entre dispositivos. Funciona en los tres modos de autenticación.

**Experiencia móvil mejorada (≤768px).** Barra superior compacta, columnas con `scroll-snap` horizontal, gesto de mantener pulsado (250 ms) para arrastrar tarjetas sin interferir con el desplazamiento, botones más grandes para toques.

> **Migración desde 2.1:** los tableros en `localStorage` no se migran automáticamente. El primer ingreso de un administrador muestra un espacio vacío; usa **Añadir tablero** para empezar de cero, o **Configuración → Importar** con un JSON exportado previamente para restaurar.

La guía de instalación es idéntica a la versión inglesa — véase más arriba.

---

## License

MIT
