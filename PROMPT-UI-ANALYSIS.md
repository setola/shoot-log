# PROMPT-UI-ANALYSIS.md

Use this prompt for Figma updates only. The existing ShootLog UI already exists; add the new **Analysis** section and small related changes without redesigning the whole app.

## Goal

Add a dedicated **Analysis** screen for imported match score data from PractiScore CAB files and Mare2 FITDS PDFs. Keep the same calm, privacy-first, administrative visual language already used in the generated app.

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
- Description: “Select an imported match and competitors to inspect performance.”

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
- Center: Primary competitor search/autocomplete
  - Label: “Competitor”
  - Text input placeholder: “Search by name, alias or number”
  - Show an example selected value like: “TESSORE EMANUELE · IT027386 · #187”
  - Use a blue left border/label accent to identify this as the primary competitor
- Right: Comparison competitor search/autocomplete
  - Label: “Compare with”
  - Text input placeholder: “Search another competitor”
  - Use an orange left border/label accent to match comparison rows and charts

## Analysis content

Show three analysis blocks inside the main card.

### 1. Hit distribution

A compact card with title and description, containing one or two competitor pie chart cards. Each pie chart shows:

- Alpha
- Charlie
- Delta
- Miss
- No-shoot

Next to each chart, show a legend:

- colored dot
- label
- count
- percentage

Do not show “total scored hits / penalties” as a standalone metric inside each competitor chart.

When a comparison competitor is selected:

- Show two pie chart cards side by side on desktop and stacked on mobile
- Primary competitor card uses blue left-border/name accent
- Comparison competitor card uses orange left-border/name accent

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

- “Ranking by stage, calculated from stage hit factor. Closer to #1 is better.”

Chart requirements:

- X axis: stages, e.g. S1, S2, S3…
- Y axis: placement, with #1 at the top
- Primary line uses the app primary blue
- Comparison line, if present, uses orange and may be dashed
- Dots at each stage
- Small labels showing placement, e.g. #12
- Layout must remain readable on mobile; horizontal scroll is acceptable for many stages

### 3. Stage details

Add compact stage cards in a responsive grid.

Each stage card should show:

- Stage name plus compact course info, e.g. “Stage 6 (32/160)” where values are min rounds / max points
- Metric columns: Time, Points, HF, Hits
- Time, Points, and HF show the competitor value and the gap from first place in division
- Hits shows only non-zero hit/penalty counts as compact colored numbers, with no separators and no total count
- If a comparison competitor is selected, show a second metric row in the same card

Example card data:

```text
Stage 6 (32/160)
Time       Points     HF       Hits
31.95s     158        4.95     31 1
+6.19s     -2         -1.20
```

Visual style for stage cards:

- compact, clean, scannable
- muted card background inside main panel
- primary row has a blue left accent
- comparison row has an orange left accent
- numeric values emphasized
- labels small and muted
- include a short color legend above the cards with labels colored by hit type: Alpha green, Charlie blue, Delta amber, Miss red, No-shoot purple, Procedure gray

## Empty state

If no score snapshot has been imported, show an empty state:

- Icon: chart/activity icon
- Title: “No imported score data yet”
- Text: “Import a PractiScore CAB file or Mare2 PDF from Matches before opening analysis.”

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

In the existing Matches screen, add/update score import panels:

PractiScore panel:
- Title: “PractiScore import”
- Field: “PractiScore ID or URL”
- Field: “Downloaded CAB file”
- Button: “Import PractiScore data”
- Success/error message area

Mare2 FITDS panel:
- Title: “Mare2 FITDS PDF import”
- Field: “Mare2 PDF file”
- Button: “Import Mare2 PDF”
- Success/error message area

Imported match cards should show a small **PractiScore** or **Mare2** badge depending on source.

## Responsive behavior

Desktop:

- Controls row: three columns
- Hit chart cards: side by side when comparing
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
