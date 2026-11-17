# Shooting Logbook

Privacy-first, local-first PWA for sport shooting records.

## Architecture

- Static React + TypeScript app built with Vite
- IndexedDB local database via Dexie
- i18n via i18next/react-i18next with translations in `src/i18n/locales`
- PWA support via `vite-plugin-pwa`
- Google Drive backup/sync via the user's own Drive `appDataFolder`
- Local score imports from PractiScore CAB and Mare2 FITDS PDF files
- Public Mare2 catalog import from static Cloudflare Pages JSON/assets
- Shareable query-string routes for sections and subsections
- No app-owned backend database

## Docker-only development

Only Docker with Compose v2 and standard shell/filesystem utilities are required
on the host. Do not install Node, npm, ImageMagick or automated browsers locally.
Run all commands below **from the repository root** (mounted at `/app`). The root
`package.json` / `package-lock.json` define the application and Mare2 CLI; `design/`
is an excluded design reference, not a second supported workspace. No submodules
or downloaded assets are required to start the app.

### Initial setup (POSIX / Linux, also applicable to Docker Desktop)

```bash
# Preserve an existing .env; otherwise start from the safe template.
[ -f .env ] || cp .env.example .env
export LOCAL_UID="$(id -u)"
export LOCAL_GID="$(id -g)"
mkdir -p .docker/node_modules .docker/wrangler .docker/tls-data .docker/tls-config
docker compose build npm
docker compose run --rm npm ci
```

Export UID/GID in each new shell, or put the numeric results of `id -u` / `id -g`
in your ignored `.env`. Do not copy another developer's IDs. Create bind directories
as your host user, not with sudo. Containers run with those IDs and writable homes;
no privileged mode, Docker socket or recursive chown is needed. On Windows use a
POSIX shell in WSL2 with Docker integration and a checkout owned by that WSL user.
Old host/Alpine `node_modules` is not used: dependencies live exclusively in
`.docker/node_modules` (Debian/glibc). Reinstall after architecture/ABI changes.

The derived `docker/Dockerfile` uses official `node:24.11.1-bookworm-slim`, satisfying
the resolved Vite 8, Vitest 5, ESLint 10 and PDF.js 6 engine requirements. It adds
ImageMagick 6 (JPG → WebP) from the fixed Debian snapshot dated 2025-11-18.
The optional TLS proxy uses `caddy:2.10.2-alpine`. Tags are patch-pinned, not
immutable digests; update pins/snapshot deliberately for security fixes and rerun
checks. `npm ci` uses the committed lockfile even where manifest ranges say latest.

### Lifecycle and independent commands

```bash
docker compose up -d               # only web; dependencies must be installed first
docker compose logs -f web
docker compose down

# All work while web is stopped; nonzero failures propagate to the shell.
docker compose run --rm npm run build   # TypeScript + Vite → dist/
docker compose run --rm npm run lint
docker compose run --rm npm test
docker compose run --rm npm run mare2 -- inspect --match=1616

# After a build: serve dist/ at http://<VM-host>:4173
docker compose --profile preview up -d preview
docker compose --profile preview down
```

`npm` and `publish` are optional `cli`-profile execution configurations, not daemons.
Explicit `run` enables the selected service's profile automatically. Equivalent:
`docker compose --profile cli run --rm npm test` (`--profile` precedes `run`).
`run` replaces the npm arguments; it does not publish ports. `exec` instead requires
an already-running service, e.g. `docker compose exec web npm --version`.

**Serialize writable workflows:** stop web/preview/TLS before `npm ci`, builds,
validation or catalog generation; run CLI tasks one at a time in this checkout.
They share dependencies, Vite caches, TypeScript build info and `dist/`; catalog
sync/publish also shares `public/mare2` and `.mare2-cache`. Do not rebuild while
preview serves `dist/`. For actual concurrency use separate checkouts with separate
`.docker` directories and output/catalog paths. Changing only the Compose project
name does not isolate these bind mounts. Vitest uses Node, without a separate test
server or browser; one-off containers are removed by `--rm`, with no dependency
services to clean up and no teardown of another development environment.

### LAN / remote VM, live reload and HTTPS

Open `http://<VM-LAN-IP>:5173` from another trusted LAN machine; `localhost` refers
to the browsing PC, not the VM. Ports are published on **all host interfaces**.
Set `APP_PORT` (default 5173) or `PREVIEW_PORT` (4173) in `.env` to avoid collisions;
internal ports are fixed with Vite `strictPort`. Numeric IPs and localhost are
accepted; add explicit DNS names in comma-separated `DEV_ALLOWED_HOSTS`, without
scheme or port. The workstation domain remains allowed. Never use `allowedHosts: true`.
Vite HMR uses the page's hostname and public port, including through the WebSocket
proxy below; no SSH tunnel or per-run bind address is needed.

Choose one canonical browser origin: for example
`https://dev.example.test:8443` with DNS (or a browser PC hosts entry) pointing to
the VM. Put `DEV_TLS_HOST=dev.example.test` and
`DEV_ALLOWED_HOSTS=dev.example.test` in `.env`, then:

```bash
docker compose --profile tls up -d
# Caddy generates its local CA and certificate inside the container.
docker compose logs tls
```

Install **only** `.docker/tls-data/caddy/pki/authorities/local/root.crt` in the
browsing PC/device trusted root store (Firefox may use its own certificate store).
Never distribute the CA private keys. Open `https://dev.example.test:8443` after
trusting it; `HTTPS_PORT` can change the public port without changing certificates
or HMR configuration. Other HTTP host IPs remain usable, but TLS certificates cover
only `DEV_TLS_HOST`. No host TLS tools are required. Startup may briefly return
502 until Vite is listening; the proxy does not need application readiness to start.

For production-like PWA testing, first stop the environment, build, then proxy the
preview server instead of the development server:

```bash
docker compose --profile tls --profile preview down
docker compose run --rm npm run build
TLS_UPSTREAM=preview:4173 docker compose --profile tls --profile preview up -d
# Stop all optional services too after testing:
docker compose --profile tls --profile preview down
```

The same trusted HTTPS browser origin now serves `dist/` with its service worker.
Development mode does not enable the production service worker. Plain HTTP on a
remote LAN IP is not a secure context; full PWA/secure-context APIs require trusted
HTTPS (localhost is a browser exception). Verify HMR by editing a component, and
PWA offline behavior by loading preview online once then switching the browser
offline. Reset stale workers/caches via DevTools → Application → Service Workers /
Storage. Export user data first: clearing site storage also deletes IndexedDB.
Different schemes/hosts/ports are distinct origins and do not share browser data.

Expose ports only to trusted networks: use Docker-aware filtering such as Linux
`DOCKER-USER` rules or the VM/network firewall; ordinary UFW rules alone may be
bypassed by Docker publishing. Do not add public router forwarding. Verify each VM
address from the remote PC. IPv6 is deployment-dependent: enable Docker/host IPv6
publication/routing and verify `http://[<VM-IPv6>]:5173` if needed; IPv6/LAN browser
and device certificate trust cannot be certified by a local container smoke test.

### Configuration, external dependencies and state

`.env` is Compose interpolation input, **not** automatic container injection.
Compose explicitly passes `VITE_GOOGLE_CLIENT_ID`, `VITE_GIT_COMMIT_SHA` and
`DEV_ALLOWED_HOSTS` to the Node app/CLI services. Empty defaults are safe. Only
`publish` receives `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; no credentials
are baked into images, and the build context excludes source and secret files.
Vite also reads framework `.env*` files from `/app`, but existing process values
win: use the root Compose `.env`/shell for the documented variables, not conflicting
`.env.local` values. Never put secrets under `VITE_*`: they are public bundle data.
The source bind mount includes local files, so these development containers must
still be trusted; environment separation is not a security sandbox.

Image pulls, Debian snapshot downloads and npm installation require Internet access.
Normal local CRUD works offline after loading the app. Optional browser integrations
need Google Identity/Drive (`drive.appdata`), the public Mare2 Pages catalog, or a
CORS-enabled import URL. Mare2 CLI needs public `mare2.fitds.it`; publishing needs
Cloudflare's API and a restricted Pages-edit token. No private Mare2 credentials or
local backend/database substitute is required. Set `MARE2_ORIGIN` for CLI testing
with `docker compose run --rm -e MARE2_ORIGIN=https://example.test npm run mare2 -- ...`.

| Path | Lifecycle / recovery |
| --- | --- |
| `.docker/node_modules` | Disposable container dependencies, including Vite/TS caches; recreate with `npm ci` while stopped. |
| `/tmp` in CLI containers | Disposable npm cache/home, removed with the container. |
| `dist/`, `tmp/`, `coverage/`, `.vite/`, `.wrangler/` | Regenerable output/cache; ignored by Git. |
| `.mare2-cache/` | Disposable original public PDFs/JPGs; deleting forces downloads. |
| `public/mare2/` | **Persistent incremental catalog**, ignored by Git. Back up the full directory before sync/deploy; restore it before incremental runs. Deleting it can drop older catalog years. |
| `.docker/wrangler/` | Writable CLI home/login/config/log state. Token auth is recommended; delete to reset credentials/state. |
| `.docker/tls-data/`, `.docker/tls-config/` | Persist local CA/config across container removal. Protect keys; deletion generates a new CA requiring device re-trust. |
| Browser IndexedDB | User records, not Docker data. Back up via app JSON export or user-controlled Drive; import to restore. Drive backups are currently plaintext. |

`docker compose down` preserves all bind data. No Docker volume backs up browser
records. Never delete all of `.docker` as if every path were a disposable cache.

### Applicability and CI

No server database, migrations, backend sessions, service readiness chain,
submodules, or browser automation runner applies to this static app. Existing
Vitest tests need no test profile/server. TLS and preview are optional workflows,
not dependencies of normal development. IPv6 requires site-specific verification.
The existing GitHub Actions pipelines still install their own toolchains; migrating
them to these same Compose commands is a recommended follow-up, not implemented here.

## App navigation and shareable routes

The main menu is intentionally limited to macro areas: Dashboard, Matches,
Training, Logbook and Settings. Match analysis is the primary workflow, while
administrative material management lives under Logbook so the sidebar and mobile
navigation stay focused on desktop, tablet and phone.

Routes are encoded in the query string and can be copied directly from the
browser address bar:

```text
?section=matches
?section=matches&tab=analysis
?section=logbook&tab=firearms
?section=logbook&tab=reloading&reloadingTab=recipes
?section=logbook&tab=reloading&reloadingTab=chrono
?section=logbook&tab=reloading&reloadingTab=components
?section=logbook&tab=reloading&reloadingTab=stock
?section=logbook&tab=maintenance
?section=logbook&tab=paperwork
```

Settings also include optional regular competitors. When an imported match is
opened in Analysis for the first time, the app silently preselects matching
regular competitors for comparison; later manual changes are saved per match.

The Matches area also has a Scorecards tab for in-match notes. A scorecard is a
local draft created from the public Mare2 catalog: it stores match metadata,
power factor, per-stage time and C/D/M/no-shoot/procedure counters, calculated
Alpha/points/hit factor, plus any stage-page mapping for later override export.
Backups include scorecard data and mapping, but not downloaded stage images.

Shared analysis links may also include match and competitor parameters, for
example:

```text
?section=matches&tab=analysis&mare2=1616&competitors=102,117
```

Legacy `?section=analysis`, `?section=firearms`, `?section=ammunition`,
`?section=maintenance` and `?section=paperwork` links are still accepted and
opened in their new tab locations.

## Import sample data by URL

The app can import JSON backup data at startup from a CORS-enabled URL:

```text
?importJsonUrl=https%3A%2F%2Fexample.com%2Fbackup.json
```

Aliases are also supported: `importUrl` and `jsonUrl`.

To load the bundled demo dataset:

```text
?importSample=true
```

The URL parameter is removed after startup to avoid repeated imports on refresh.

## Mare2 public catalog

The app can import prepared public Mare2 matches from a static catalog hosted on
Cloudflare Pages:

```text
https://shooting-logbook-mare2-data.pages.dev/manifest.json
```

This is not an app-owned database. It is a static mirror of public Mare2-derived
JSON plus app-ready WebP stage-page assets. When a user imports a catalog match,
the selected match snapshot and images are stored only in the browser's
IndexedDB, and then optionally in the user's own Google Drive backup.

The catalog is generated by the local CLI in `tools/mare2-importer`:

```bash
docker compose run --rm publish run mare2:publish:cf -- --year=2026 --request-delay-ms=1000
docker compose run --rm publish run mare2:publish:cf -- --year=2026 --since=2026-07-01
docker compose run --rm publish run mare2:publish:cf -- --year=2026 --since="last week"
docker compose run --rm publish run mare2:publish:cf -- --year=2026 --championship=federale --ma=3
```

The generated catalog includes match name, dates, location, public source links,
normalized score snapshots and app-ready WebP stage-page assets.

See `tools/mare2-importer/README.md` for discovery filters, rate limiting,
Cloudflare Pages deployment, and cron-style update guidance.

## Google Drive sync

Google Drive sync is available inside Settings. It is browser-only and uses the
user's own Drive `appDataFolder`.

1. Create an OAuth 2.0 Client ID in Google Cloud Console.
2. Use application type **Web application**.
3. Add authorized JavaScript origins, for example:
   - `http://localhost:5173`
   - `https://pi-workstation.villa.emanueletessore.com`
   - `https://shootlog.emanueletessore.com`
   - your GitHub Pages origin
4. Set this public value in the root Compose `.env` and recreate web (or rebuild
   the bundle for preview/deployment):

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Authorize the **exact browser origin**, including the chosen HTTPS port (e.g.
`https://dev.example.test:8443`), in Google Console. Google may reject private IP or
non-public development domains; use localhost for same-PC testing or an authorized
HTTPS domain such as the workstation domain. Local CRUD requires no OAuth setup.
No server callback/session is used. Provider restrictions must match the actual
origin; trusting a local CA does not bypass Google's origin policy.

The app requests only this scope:

```text
https://www.googleapis.com/auth/drive.appdata
```

## Deployment

The PWA is deployed by GitHub Actions workflow `.github/workflows/deploy.yml`,
which builds and deploys `dist/` to GitHub Pages on pushes to `main`.

The Mare2 public data catalog is deployed separately to Cloudflare Pages with
Wrangler:

```bash
docker compose run --rm publish run mare2:deploy:cf
```

`publish` passes the configured API token explicitly; prefer this to interactive
login. If OAuth login is necessary, run
`docker compose run --rm publish exec -- wrangler login --help` and follow Wrangler's
remote-browser flow. Login state stays in `.docker/wrangler`, not the host home;
logout with `docker compose run --rm publish exec -- wrangler logout`. Do not mount
the host home or put tokens in URLs/frontend variables.

If Wrangler has more than one Cloudflare account, set `CLOUDFLARE_ACCOUNT_ID` in
your local `.env`; do not commit local account values or API tokens.

Before first app deploy, enable GitHub Pages in the repository settings and select
**GitHub Actions** as the source.

## Project layout

```text
src/
  app/                 App shell
  components/          Shared UI components
  db/                  IndexedDB/Dexie schema and repositories
  domain/              Domain models by feature area
  sync/                Backup/sync logic, Google Drive integration
  crypto/              Client-side encryption helpers
  export/              JSON/CSV/PDF export helpers
  i18n/locales/        Translation files
  styles/              Global styles
```
