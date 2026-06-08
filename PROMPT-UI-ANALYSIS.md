# PROMPT-UI-ANALYSIS.md

Use this prompt for Figma updates only. The existing ShootLog UI already exists; add the new **Analysis** section and small related changes without redesigning the whole app.

## Goal

Add a dedicated **Analysis** screen for imported PractiScore match data. Keep the same calm, privacy-first, administrative visual language already used in the generated app.

Do not introduce tactical, aggressive, militarized, or weapon-focused styling.

## Navigation changes

Add a new primary navigation item:

- Label: **Analysis**
- Position: after **Matches**, before **Ammunition**
- Icon: simple activity/chart-line icon
- Active state: same style as existing sidebar active nav items

Keep existing responsive/mobile navigation behavior. If bottom navigation has limited slots, preserve the existing prioritization unless there is room to add Analysis.

## Analysis screen layout

Create a new screen titled **Analysis**.

Top section:

- Section heading: “Analysis”
- Description: “Select an imported PractiScore match and a competitor to inspect performance.”

Main content card:

- Use same visual treatment as existing panels/forms:
  - white/dark card background
  - soft border
  - subtle shadow
  - same padding, spacing, radius
- The card should visually align with panels using the app’s `panel form-grid` style.

Controls row:

- Left: Match selector
  - Label: “Match”
  - Select dropdown with imported match name
- Right: Competitor search/autocomplete
  - Label: “Competitor”
  - Text input placeholder: “Search by name, alias or number”
  - Show an example selected value like: “TESSORE EMANUELE · IT027386 · #187”

## Analysis content

Show three analysis blocks inside the main card.

### 1. Hit distribution

A compact pie chart showing:

- Alpha
- Charlie
- Delta
- Miss
- No-shoot

Next to the chart, show a legend:

- colored dot
- label
- count
- percentage

Use calm semantic colors:

- Alpha: green
- Charlie: blue
- Delta: amber
- Miss: red
- No-shoot: purple

Keep chart minimal and readable in light/dark themes.

### 2. Stage placement trend

Add a line chart titled:

- “Stage placement trend”

Subtitle:

- “Ranking by stage, calculated from stage hit factor. Lower is better.”

Chart requirements:

- X axis: stages, e.g. S1, S2, S3…
- Y axis: placement, with #1 at the top
- Line uses the app primary blue
- Dots at each stage
- Small labels showing placement, e.g. #12
- Layout must remain readable on mobile; horizontal scroll is acceptable for many stages

### 3. Stage details

Add compact stage cards in a responsive grid.

Each stage card should show:

- Stage name, e.g. “Stage 6”
- Hit factor badge/value, e.g. “4.95 HF”
- Metadata chips:
  - “Min 32”
  - “Max 160”
  - “31.95s”
- A compact six-cell hit row:
  - A count
  - C count
  - D count
  - M count
  - NS count
  - P count

Example card data:

```text
Stage 6        4.95 HF
Min 32   Max 160   31.95s
A 31 | C 1 | D 0 | M 0 | NS 0 | P 0
```

Visual style for stage cards:

- compact, clean, scannable
- muted card background inside main panel
- small hit cells with subtle background
- numeric values emphasized
- labels small and muted

## Empty state

If no PractiScore match has been imported, show an empty state:

- Icon: chart/activity icon
- Title: “No PractiScore data yet”
- Text: “Import a PractiScore CAB file from Matches before opening analysis.”

Use same empty-state style as existing app cards.

## Settings screen addition

In the existing Settings screen, add a card titled:

- “Device owner”

Fields:

- Multiline textarea label: “PractiScore identifiers / names”
- Placeholder:

```text
IT027386
Emanuele Tessore
```

Helper text:

- “One value per line or comma-separated. Analysis will use these aliases or names to preselect your competitor when a PractiScore match is opened.”

The card should use the same settings-card style already present.

## Matches screen addition

In the existing Matches screen, add/update a PractiScore import panel:

- Title: “PractiScore import”
- Field: “PractiScore ID or URL”
- Field: “Downloaded CAB file”
- Button: “Import PractiScore data”
- Success/error message area

Imported match cards should show a small **PractiScore** badge.

## Responsive behavior

Desktop:

- Controls row: two columns
- Hit chart and legend: side by side
- Stage detail cards: responsive multi-column grid

Mobile:

- Controls stack vertically
- Pie chart centered above legend
- Line chart can horizontally scroll
- Stage detail cards become single column or two compact columns if space allows

## Theme requirements

Support both light and dark themes using existing app colors.

Do not hard-code backgrounds that break dark mode.

## Copy tone

Use calm, analytical, administrative language. Avoid competitive hype or tactical wording.
