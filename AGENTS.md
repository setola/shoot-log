# AGENTS.md

Guidance for AI coding agents working on this repository.

## Project vision

Build a privacy-first web application for sport shooting logbook management.

The app helps users track:

- Firearms and equipment usage
- Training sessions
- Matches and competition history
- Ammunition inventory and usage
- Maintenance events
- Paperwork, licenses, memberships, reminders, and reports
- Optional sensitive data such as serial numbers or permit references

Core architectural principle:

> The application must not use an app-owned backend database. User data is stored locally in the browser and optionally backed up/synced to the user's own Google Drive.

## Architecture principles

### Local-first

- Primary data store: browser IndexedDB.
- Recommended library: Dexie.js.
- The app should work offline whenever possible.
- Reads/writes should not require network access.

### No central user database

Do not add:

- Server-side user database
- App-owned cloud database
- Backend session store
- Backend storage of shooting records
- Backend storage of firearm or license data

If serverless/static hosting is used, it should serve the app only.

### Google Drive persistence

Google Drive is used as user-controlled persistence.

- Use Google OAuth only to access the user's Drive.
- Prefer the `drive.appdata` scope.
- Store backups/sync data in Google Drive `appDataFolder`.
- Avoid broad Drive scopes unless explicitly needed.

UI wording should prefer:

- "Connect Google Drive"

rather than:

- "Login"

### Sensitive data

Sensitive data may be supported, but it must remain under the user's control.

Potential sensitive fields:

- Firearm serial numbers
- License or permit references
- Club membership numbers
- Match paperwork references
- Attachments such as PDFs/images

Rules:

- Never send sensitive data to an app-owned server.
- Never log sensitive data to console in production code.
- Avoid analytics that capture user-entered records.
- Clearly label sensitive sections in the UI.

### Encryption

Design Drive backup/sync to support client-side encryption.

Recommended approach:

- Web Crypto API
- AES-GCM for encryption
- PBKDF2 or Argon2id for passphrase-based key derivation
- Random salt and IV per encrypted backup

If encryption is implemented, make recovery limitations clear:

> If the user loses the passphrase, the app cannot recover encrypted backups.

## Current project skeleton

The repository currently contains a Vite + React + TypeScript static PWA skeleton.

Current implementation notes:

- Build tool: Vite.
- UI framework: React.
- Language: TypeScript.
- Local database: Dexie.js over IndexedDB.
- Reactive IndexedDB reads: `dexie-react-hooks`.
- PWA support: `vite-plugin-pwa`.
- i18n: `i18next` + `react-i18next`.
- Translation files live in `src/i18n/locales/{locale}/translation.json`.
- Current locales: English (`en`) and Italian (`it`).
- Styling: plain CSS in `src/styles/global.css` using CSS variables.
- Theme support: light/dark theme selector with `localStorage` persistence.
- Deployment: GitHub Actions to GitHub Pages via `.github/workflows/deploy.yml` using Node 24 actions.
- Production/custom domain: `https://shootlog.emanueletessore.com/` with `public/CNAME`.
- Vite `base` is relative (`./`) so the app works on localhost, GitHub Pages project URLs, and the custom root domain.
- Local development: Docker Compose using the official `node:22-alpine` image and bind-mounted `./node_modules`.
- Build-time env:
  - `VITE_GOOGLE_CLIENT_ID` is injected from the GitHub `github-pages` environment secret.
  - `VITE_GIT_COMMIT_SHA` is injected from `${{ github.sha }}` and shown as a sidebar source link.

## Recommended stack

Prefer:

- Vite + React as a static/frontend-only app
- TypeScript
- IndexedDB via Dexie.js
- `dexie-react-hooks` for live local queries
- Plain CSS variables or lightweight accessible component primitives
- Minimal, clean UI with simple high-contrast icons
- i18next/react-i18next for translations
- Google Identity Services
- Google Drive API
- Web Crypto API
- jsPDF/pdfmake for PDFs
- PapaParse or equivalent for CSV export

Avoid unless explicitly requested:

- Traditional backend APIs for app data
- Server-side auth sessions
- SQL/NoSQL hosted databases
- Full Drive access scope

## Core domain entities

Expected model areas:

- Firearm
- TrainingSession
- MatchEvent
- AmmunitionBatch
- AmmoTransaction
- MaintenanceEvent
- PaperworkDocument or Credential
- ClubMembership
- Reminder
- Attachment
- AppSettings
- SyncMetadata

## Current feature status

Implemented local-first modules:

1. App shell / PWA-friendly frontend.
2. IndexedDB schema with Dexie migrations.
3. Firearms CRUD with sensitive details and archive flag.
4. Training sessions CRUD.
5. Matches CRUD.
6. Maintenance CRUD.
7. Ammunition batches and stock movement basics.
8. Paperwork/credentials CRUD.
9. Paperwork attachments stored locally as IndexedDB `Blob`s.
10. Settings panel with theme/language/data actions and local device-owner PractiScore identifiers.
11. JSON export/import, including base64 serialization of paperwork attachments, PractiScore snapshots, and app settings.
12. Google Drive connection and manual backup/restore to the user's `appDataFolder`.
13. Source commit link in the sidebar footer.
14. PractiScore CAB import for matches, storing a single local snapshot per match.
15. Dedicated Analysis section for imported PractiScore matches, including competitor autocomplete/default owner matching, hit distribution pie chart, stage placement trend, and compact stage details.

Important limitations / follow-up work:

1. Drive backups are currently plaintext JSON; client-side encryption is still pending.
2. Import validation is basic and should be hardened before treating imports as fully trusted.
3. Conflict detection/merge strategy is not implemented.
4. Dashboard summaries are present but should be expanded with more live computed data.
5. PractiScore CAB parsing currently supports the uncompressed CAB export format observed in `design/WinMSS.cab`; compressed CAB support is still pending.
6. Reports, CSV/PDF export, and reminders are still pending.
7. Attachment encryption and incremental sync are still pending.

## Data handling rules

When implementing features:

- Keep all record mutations local-first.
- Include `id`, `createdAt`, and `updatedAt` on persistent records.
- Prefer UUIDs for local IDs.
- Use migrations for IndexedDB schema changes.
- Make export/import versioned.
- Validate imported data before writing it to IndexedDB.
- Preserve user data during migrations.

## Sync strategy guidance

Current implementation uses a single plaintext backup file:

- `shooting-logbook-backup.json` for JSON export/import and Google Drive backup/restore

Planned encrypted backup file:

- `shooting-logbook-backup.enc.json` for encrypted Drive backup

Backup envelope should include:

- Format identifier
- Schema version
- Updated timestamp
- Device/client metadata
- Payload or encrypted ciphertext

Future record-level sync can be added later.

## UX guidelines

Tone:

- Serious
- Clear
- Privacy-focused
- Not tactical or militarized

Visual style:

- Simple, clean, minimalistic.
- Prefer generous spacing, readable typography, soft borders, and subtle shadows.
- Support both light and dark themes.
- Use intuitive, highly visible icons.
- Avoid aggressive, militarized, or tactical aesthetics.
- Keep forms calm and administrative in tone.

Prefer practical labels:

- Firearms
- Training
- Matches
- Ammunition
- Maintenance
- Paperwork
- Analysis
- Reports
- Settings

Use warnings sparingly but clearly for:

- Sensitive fields
- Encryption passphrases
- Destructive imports
- Conflict resolution

## Safety and legal boundaries

This application is a sport shooting logbook, not a weapons modification or tactical instruction system.

Do not add content focused on:

- Evading laws or recordkeeping requirements
- Concealing illegal activity
- Weapon modification instructions
- Harmful tactical guidance

Do support:

- Administrative organization
- Maintenance records at a high level
- Sport training logs
- Competition reporting
- License/membership reminders

## Development workflow for agents

Before coding:

1. Inspect existing project files.
2. Identify framework and package manager.
3. Read relevant source files before editing.
4. Keep changes small and focused.

When editing:

- Prefer TypeScript.
- Keep data access behind small repository/service modules, following the existing `firearmRepository.ts` pattern.
- Keep Google Drive and crypto concerns isolated from UI components.
- Keep all user-facing strings in locale JSON files.
- Preserve light/dark theme compatibility by using CSS variables instead of hard-coded colors.
- Add tests for schema transforms, imports/exports, crypto helpers, and sync logic when practical.
- Do not introduce backend dependencies without explicit approval.

Before final response:

- Mention changed files.
- Mention tests or checks run.
- Note any follow-up work.
