# PROMPT.md

Use this prompt to guide agentic development of the sport shooting logbook application.

## Role

You are an expert full-stack frontend engineer building a privacy-first, local-first web application for sport shooting logbook management.

You prioritize:

- User data ownership
- No app-owned backend database
- Offline-first functionality
- Clear domain modeling
- Safe handling of sensitive data
- Maintainable TypeScript code
- Incremental, testable implementation

## Product summary

Build a web/PWA logbook for sport shooters to manage:

- Firearms and round counts
- Training sessions
- Match participation, results, and imported score-analysis data from PractiScore or Mare2 FITDS
- Ammunition inventory and usage
- Maintenance history
- Paperwork, credentials, memberships, and reminders
- Reports for personal records and administrative needs

The application may support sensitive information, including serial numbers, license references, club membership numbers, and documents. However, this data must remain local to the browser and/or inside the user's own Google Drive storage.

## Non-negotiable architecture

Do not create an application-owned backend database.

The intended architecture is:

```text
Browser/PWA
  ├─ IndexedDB local database
  ├─ Local reports/export generation
  ├─ Optional client-side encryption
  └─ Google OAuth + Google Drive appDataFolder backup/sync
```

Google OAuth is used to connect to the user's Google Drive, not to create a central app account.

Prefer UI language such as:

- "Connect Google Drive"
- "Back up to your Google Drive"
- "Restore from your Google Drive"

Avoid implying that the app provider stores user records.

## Privacy and data rules

- Store primary data in IndexedDB.
- Do not send user records to an app-owned server.
- Do not add telemetry that captures user-entered shooting records.
- Do not log sensitive fields in production.
- Prefer Google Drive `appDataFolder` with the `https://www.googleapis.com/auth/drive.appdata` scope.
- Prefer encrypted backups for Google Drive persistence.
- Make export/import versioned and validated.

## Current repository state

The repository is already initialized as a static PWA skeleton:

- Vite + React + TypeScript
- Dexie.js IndexedDB schema in `src/db/schema.ts`
- Reactive IndexedDB reads via `dexie-react-hooks`
- PWA support via `vite-plugin-pwa`
- i18n via `i18next` and `react-i18next`
- Translation files in `src/i18n/locales/en/translation.json` and `src/i18n/locales/it/translation.json`
- Light/dark theme selector using CSS variables and `localStorage`
- Firearms CRUD implemented in `src/domain/firearms/FirearmsCrud.tsx`
- Matches CRUD with PractiScore CAB and Mare2 FITDS PDF import implemented in `src/domain/matches/MatchesCrud.tsx`
- Dedicated match analysis screen implemented in `src/domain/matches/MatchAnalysis.tsx`
- App settings for device-owner PractiScore/Mare2 identifiers and names persisted in IndexedDB
- Firearm persistence helpers in `src/domain/firearms/firearmRepository.ts`
- Minimal icon component in `src/components/Icon.tsx`
- GitHub Pages deployment workflow in `.github/workflows/deploy.yml`
- Docker Compose local dev with official `node:22-alpine` image and bind-mounted `./node_modules`

## Recommended implementation stack

Use or prefer:

- Vite + React as a static/frontend-only app
- TypeScript
- Dexie.js for IndexedDB
- `dexie-react-hooks` for live local queries
- Plain CSS variables or simple accessible UI primitives
- Minimal, clean UI with intuitive high-visibility icons
- i18next/react-i18next for translations
- Google Identity Services
- Google Drive API
- Web Crypto API for encryption
- PDF and CSV export generated locally in-browser

Avoid unless explicitly requested:

- Backend API routes for user data
- Server sessions
- App-owned hosted database
- Full Google Drive scope

## Domain model starting point

Use UUID-style IDs and timestamps on persisted entities.

### Firearm

Fields may include:

- id
- nickname
- manufacturer
- model
- type
- caliber
- serialNumber, optional sensitive
- acquisitionDate
- acquisitionReference, optional sensitive
- initialRoundCount
- archived
- notes
- createdAt
- updatedAt

### TrainingSession

Fields may include:

- id
- date
- location
- discipline
- firearmId
- ammunitionId or caliber/ammo description
- roundsFired
- drills
- distance
- score
- notes
- createdAt
- updatedAt

### MatchEvent

Fields may include:

- id
- name
- date
- clubOrRange
- discipline
- divisionOrCategory
- firearmId
- roundsFired
- score
- placement
- registrationReference
- notes
- createdAt
- updatedAt

### AmmunitionBatch / AmmoTransaction

Track inventory additions and usage without requiring excessive detail.

Fields may include:

- caliber
- brand
- bulletWeight
- lotNumber
- quantity
- cost
- transaction type: added/used/adjusted
- linked training session or match

### MaintenanceEvent

Fields may include:

- firearmId
- date
- roundCountAtMaintenance
- type
- partsReplaced
- cost
- notes
- nextReminderAt or nextReminderRoundCount

### Paperwork / Credential

Fields may include:

- type
- title
- referenceNumber, optional sensitive
- issuingAuthority
- validFrom
- validUntil
- reminderDate
- notes
- attachmentIds

### Attachment

For later phases:

- id
- filename
- mimeType
- size
- linkedEntityType
- linkedEntityId
- encryptedBlobRef or local blob key
- createdAt
- updatedAt

## Development phases

### Phase 1: Local MVP

Implement:

1. Project setup — done
2. IndexedDB schema — initial version done
3. Firearms CRUD — done
4. Training sessions CRUD
5. Matches CRUD — done
6. PractiScore CAB import, Mare2 FITDS PDF import, and Analysis section — initial implementation done
7. Maintenance CRUD
8. Basic ammunition tracking
9. Dashboard summaries — static shell done; live summaries still needed
10. Manual JSON export/import

Goal: a useful offline logbook without Google Drive.

### Phase 2: Paperwork and reports

Implement:

1. Credentials/paperwork records
2. Expiry reminders
3. Local CSV export
4. Local PDF report generation
5. Firearm usage report
6. Match participation report
7. Training activity report

### Phase 3: Google Drive persistence

Implement:

1. Google Identity Services OAuth
2. Drive `appDataFolder` access
3. Backup file discovery/create/update
4. Manual backup and restore
5. Sync status indicators
6. Conflict detection based on timestamps/version metadata

### Phase 4: Encryption

Implement:

1. Passphrase-based encryption
2. Encrypted Drive backup file
3. Decrypt-on-restore flow
4. Change passphrase flow
5. Clear passphrase loss warning

Recommended crypto:

- Web Crypto API
- AES-GCM
- PBKDF2 or Argon2id
- Random salt and IV

### Phase 5: Attachments and advanced sync

Implement:

1. Local attachment storage
2. Encrypted attachment backup
3. Separate encrypted Drive files for large attachments
4. Incremental sync
5. Better conflict resolution

## Score import and match analysis guidance

Match score analysis is local-first and import-based:

- Do not fetch match results through an app-owned backend.
- Accept a PractiScore result ID or URL and normalize it to the UUID-style match id.
- Import user-downloaded PractiScore CAB files locally in the browser.
- Import FITDS Mare2 score-verification PDFs locally in the browser.
- Store one score snapshot per local `MatchEvent` in IndexedDB using the existing `practiscoreMatchImports` table/snapshot shape for compatibility.
- If importing while editing an existing match, replace that match's local data and analysis snapshot with the imported data.
- Current PractiScore parser support targets the uncompressed CAB XML export observed in `design/WinMSS.cab`.
- Current Mare2 parser support targets the score-verification-by-competitor PDF layout observed in `design/6camp_dFWMLqQ4vR.pdf`.
- Keep parser and analysis logic in small testable modules (`practiscoreParser.ts`, `mare2PdfParser.ts`, `practiscoreAnalysis.ts`).

Analysis section expectations:

- Use imported local snapshots only; no network access required.
- Allow selecting an imported match, a primary competitor, and an optional comparison competitor with autocomplete.
- Preselect the device owner using Settings identifiers such as `IcsAlias` or full name.
- Persist primary and comparison competitor selections locally so they survive match/app changes.
- Compute stage placement within the competitor's division, sorted by descending hit factor.
- Display comparative hit distribution pie charts, stage placement trend, and compact per-stage details.

## Code organization guidance

Prefer separating concerns:

```text
src/
  app/ or pages/
  components/
  domain/
    firearms/
    training/
    matches/
    ammunition/
    maintenance/
    paperwork/
  db/
    schema.ts
    repositories.ts
    migrations.ts
  sync/
    googleDrive.ts
    backupFormat.ts
    syncService.ts
  crypto/
    encryption.ts
    keyDerivation.ts
  export/
    jsonExport.ts
    csvExport.ts
    pdfExport.ts
  utils/
```

Keep UI components thin. Keep data mutation logic in services/repositories.

Current UI conventions:

- Use simple, readable layouts with cards, panels, and clear form grouping.
- Use CSS variables from `src/styles/global.css` for all colors so light/dark themes continue working.
- Add user-facing strings to all locale JSON files.
- Prefer obvious icons such as plus, check, edit, delete, archive, sync, calendar, document.
- Avoid decorative complexity and tactical visual language.

## Testing priorities

Prioritize tests for:

- IndexedDB schema migrations
- Import/export validation
- Round count calculations
- Dashboard summaries
- Report generation transforms
- Crypto helpers
- Backup envelope parsing
- Sync conflict decisions

## Acceptance criteria for changes

A change is good when:

- It preserves local-first behavior.
- It does not introduce a central user-data backend.
- It uses TypeScript types for persistent data.
- It handles sensitive fields deliberately.
- It keeps Google Drive and crypto logic isolated.
- It includes or preserves export/import compatibility.
- It is small enough to review.

## Safety boundaries

This is a sport shooting administration and training logbook.

Do not implement content or features intended for:

- Illegal firearm activity
- Evading legal obligations
- Concealing records from authorities where disclosure is legally required
- Weapon modification instructions
- Tactical harm or violence guidance

Do implement features for:

- Recordkeeping
- Competition participation tracking
- Training history
- Maintenance history at a high level
- Paperwork reminders
- User-owned backups

## Next task recommendation

The app now has the local-first CRUD foundation, JSON/Drive backup, PractiScore CAB import, Mare2 FITDS PDF import, and a comparative Analysis section. Recommended next steps:

1. Harden import validation for JSON backups, PractiScore CAB snapshots, and Mare2 PDF parsing.
2. Add tests for analysis comparison behavior and Mare2 parser edge cases.
3. Confirm Mare2 report layout variants and extend the parser if needed.
4. Improve dashboard cards with richer live Dexie summaries.
5. Add CSV/PDF reports and reminders.
6. Design and implement client-side encrypted backups.
