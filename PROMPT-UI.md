# PROMPT-UI.md

Design a privacy-first PWA for sport shooting logbook management.

The app is a calm administrative/training logbook for sport shooters. It tracks firearms, training, matches, ammunition, maintenance, paperwork, reports, and Google Drive backup. It is not tactical or militarized.

## Design direction

Use a clean, minimalist style.

Prioritize clarity, readability, fast data entry, privacy-first messaging, accessible contrast, touch-friendly controls, and intuitive icons.

Avoid tactical styling, camouflage, weapon-glorifying visuals, and dense dashboards.

## Themes

Create both light and dark themes.

Light theme:
- Off-white background
- White cards
- Near-black slate text
- Medium slate muted text
- Clear blue accent
- Soft gray borders
- Subtle shadows

Dark theme:
- Deep navy/slate background
- Dark slate cards
- Near-white text
- Light slate muted text
- Bright accessible blue accent
- Slate borders
- Subtle dark elevation

Use a readable sans-serif font such as Inter/system UI.

## Layout

Primary sections:
- Dashboard
- Firearms
- Training
- Matches
- Analysis
- Ammunition
- Maintenance
- Paperwork
- Reports
- Google Drive Sync
- Settings

Desktop:
- Spacious centered layout
- Header with title, tagline, theme selector, language selector
- Cards and panels
- Forms and lists side-by-side when useful

Mobile:
- Single-column layout
- Large buttons and inputs
- Compact navigation or bottom nav
- Forms optimized for phone use

## Key screens

### Dashboard

Show overview cards for:
- Firearms
- Training
- Matches
- Ammunition
- Maintenance reminders
- Google Drive sync status

Example metrics:
- Total firearms
- Rounds fired this month
- Recent training sessions
- Upcoming credential expiry
- Last Google Drive backup

### Firearms CRUD

This is the first implemented feature. Make it polished.

Layout:
- Section heading: “Firearm registry”
- Short privacy/local-storage description
- “New firearm” button with plus icon
- Left panel: add/edit form
- Right panel: saved firearms list

Form fields:
- Nickname, required
- Type selector
- Caliber
- Manufacturer
- Model
- Acquisition date
- Initial round count
- Notes
- Archive checkbox

Sensitive details:
- Collapsible disclosure panel
- Serial number
- Acquisition reference
- Privacy note: “These fields stay local and can be backed up to your Google Drive.”

List cards:
- Neutral target-circle icon, not detailed weapon art
- Firearm nickname
- Manufacturer/model/caliber line
- Initial round count
- Archived badge
- Edit icon button
- Delete icon button

### Training sessions concept

CRUD screen with:
- Date
- Location
- Discipline
- Firearm
- Rounds fired
- Ammo description
- Drills
- Distance
- Score/result
- Notes

List rows/cards show date, firearm, rounds, discipline, edit/delete.

### Matches concept

CRUD screen with:
- Match name
- Date
- Club/range
- Discipline
- Division/category
- Firearm
- Rounds fired
- Score
- Placement
- Registration reference
- Notes

Also include score import panels:
- PractiScore import with PractiScore ID or URL field, downloaded CAB file upload, import action, clear success/error state, and PractiScore badge on imported match cards
- Mare2 FITDS PDF import with PDF file upload, import action, clear success/error state, and Mare2 badge on imported match cards

### Analysis concept

Dedicated section for imported match analysis from PractiScore CAB or Mare2 FITDS PDF snapshots.

Layout:
- Section heading: “Analysis”
- Main panel using same card/form visual language as other sections
- Top controls: match selector, primary competitor autocomplete search, and comparison competitor autocomplete search
- Empty state if no imported score data exists yet

Charts and summaries:
- Pie chart card for selected competitor's hit distribution: Alpha, Charlie, Delta, Miss, No-shoot
- If a comparison competitor is selected, show a second pie chart card using the same hit-distribution layout
- Legend with counts and percentages; do not emphasize total scored hits as a primary metric
- Line chart for placement by stage, where closer to #1 is better and placement is computed within division
- Compact stage detail cards showing:
  - compact stage title with `(min rounds / max points)`
  - time, points, and hit factor with gap from stage winner
  - compact colored hit counts showing only values greater than zero
  - comparison row when a comparison competitor is selected

Visual style:
- Clean analytical dashboard, not dense or tactical
- Use small badges/chips and compact cards
- Use the existing accent blue for the primary competitor, orange for the comparison competitor, and calm semantic colors for hit types
- Preserve light/dark theme compatibility

### Google Drive sync/settings

Privacy-first sync panel with states:
- Not connected
- Connected
- Syncing
- Last synced
- Conflict detected
- Error

Buttons:
- Connect Google Drive
- Backup now
- Restore from Drive

Use “Connect Google Drive”, not “Login”.

Settings include:
- Language selector
- Theme selector: Light / Dark
- Device-owner PractiScore identifiers / names, entered as multiline text
- Export data
- Import data
- Future encryption/passphrase settings

## Components

Create a reusable UI kit:
- App header and navigation item
- Dashboard card and panel/card
- Section heading
- Text input, select, textarea, checkbox row
- Primary, secondary, ghost, and icon buttons
- Badge and empty state
- Confirmation dialog
- Collapsible sensitive section
- Sync status indicator
- Theme and language selectors

## Icon style

Use simple line icons or high-contrast glyph icons with consistent stroke width.

Avoid detailed firearm silhouettes. Prefer neutral metaphors: target circle, document, calendar, box, chart, cloud, shield, lock.

Suggested icons:
- Dashboard: grid
- Firearms: target circle
- Training: stopwatch/checklist
- Matches: trophy/flag
- Ammunition: stacked dots/inventory box
- Maintenance: wrench
- Paperwork: document
- Analysis: activity/chart line
- Reports: chart
- Sync: cloud upload
- Privacy/encryption: shield/lock
- Add: plus
- Save: check
- Edit: pencil
- Delete: trash or X

## Accessibility

Ensure:
- WCAG-friendly contrast in both themes
- Visible focus states
- Labels for all fields
- Large tap targets
- Accessible labels for icon buttons
- Clear, calm error messages

## Copy tone

Use short, clear text:
- “Your data stays on this device.”
- “Back up to your Google Drive.”
- “Sensitive details are stored locally.”
- “If encryption is enabled, losing the passphrase means the backup cannot be recovered.”

## Output requested

Generate desktop and mobile designs for:
1. Light dashboard
2. Dark dashboard
3. Firearms CRUD
4. Training CRUD concept
5. Google Drive sync/settings concept
6. Component library

Keep the design minimal, polished, and easy to implement in React/CSS.
