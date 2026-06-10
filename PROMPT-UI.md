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
- Settings

Google Drive sync is shown inside Settings, not as a separate primary section.

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
- Notes

Also include score import flows:
- Provide import CTAs for PractiScore and Mare2.
- Each import opens a modal with concise instructions and a drag-and-drop file zone.
- PractiScore import uses a user-downloaded CAB file; Mare2 import uses a FITDS/Mare2 PDF.
- Drop zones must also be clickable file pickers and show the selected filename before confirmation.
- Imported match cards show a colored source pill for PractiScore or Mare2.

Generic match CRUD may exist for manual records, but imported score analysis data should be created through the PractiScore/Mare2 import flows.

### Analysis concept

Dedicated section for imported match analysis from PractiScore CAB or Mare2 FITDS PDF snapshots.

Layout:
- Section heading: “Analysis”
- Main panel using same card/form visual language as other sections
- Top controls: match selector plus a neutral comparison competitors autocomplete search
- Empty state if no imported score data exists yet

Charts and summaries:
- Pie chart cards for every selected comparison competitor, including the first/primary competitor
- Device owner is suggested as the first pill when Settings identifiers match, but can be removed like any other competitor
- Hit distribution includes Alpha, Charlie, Delta, Miss, No-shoot, and procedural values when present
- Each pie card title spans the full card width and shows competitor name plus placement as `#XX`; legend shows counts and percentages only
- Line chart for placement by stage, where closer to #1 is better and placement is computed within division
- Compact stage detail cards showing:
  - compact stage title with `(min rounds / max points)`
  - time, points, and hit factor with gap from stage winner
  - compact colored hit counts showing only values greater than zero
  - one row per selected competitor, including competitor name

Visual style:
- Clean analytical dashboard, not dense or tactical
- Use small badges/chips and compact cards
- Use the existing accent blue for the first competitor, a rotating palette for additional competitors, and calm semantic colors for hit types
- Preserve light/dark theme compatibility

### Settings with Google Drive sync

Settings should contain:
- Device-owner identifiers as removable/addable pills, one value per pill; commas are treated as part of a single value
- Google Drive sync card
- Data management card
- About ShootLog card with privacy notes

Do not duplicate theme/language selectors here if they already exist in the header.

Privacy-first sync card states:
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

Settings data management includes:
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
- File drop zone: prefer this over plain file buttons for every local file upload/import
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
- Sync: cloud upload, used inside Settings
- Privacy/encryption: shield/lock
- Add: plus
- Save: check
- Edit: pencil
- Delete: trash or X

## Accessibility

Ensure:
- Modals have an X close button in the top-right; bottom-right actions place Cancel immediately left of the confirming CTA
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
