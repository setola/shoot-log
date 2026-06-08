# Shooting Logbook

Privacy-first, local-first PWA for sport shooting records.

## Architecture

- Static React + TypeScript app built with Vite
- IndexedDB local database via Dexie
- i18n via i18next/react-i18next with translations in `src/i18n/locales`
- PWA support via `vite-plugin-pwa`
- Future Google Drive backup/sync via the user's own Drive `appDataFolder`
- No app-owned backend database

## Local development

### With Docker Compose

```bash
docker compose up
```

Open <http://localhost:5173>.

### With local Node.js

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Google Drive sync

Google Drive sync is browser-only and uses the user's own Drive `appDataFolder`.

1. Create an OAuth 2.0 Client ID in Google Cloud Console.
2. Use application type **Web application**.
3. Add authorized JavaScript origins, for example:
   - `http://localhost:5173`
   - `https://shootlog.emanueletessore.com`
   - your GitHub Pages origin
4. Copy `.env.example` to `.env.local` and set:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The app requests only this scope:

```text
https://www.googleapis.com/auth/drive.appdata
```

## Deployment

GitHub Actions workflow `.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on pushes to `main`.

Before first deploy, enable GitHub Pages in the repository settings and select **GitHub Actions** as the source.

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
