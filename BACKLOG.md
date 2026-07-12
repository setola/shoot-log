# Backlog

Planned improvements for ShootLog. Keep all features privacy-first, local-first, and focused on administrative sport-shooting analysis.

## Match analysis for IPSC improvement

### 1. Automatic stage insights

- Identify best and worst relative stages for the selected competitor.
- Highlight stages with the largest hit-factor gap, time gap, and points gap against selected comparison competitors.
- Summarize each stage in plain language, for example: “Stage 4: largest HF gap, mostly driven by time.”

### 2. Time vs points diagnosis

- Break down whether a stage gap is mostly caused by time, points, or both.
- Add compact diagnostic cards per stage or per match.
- Keep competitor colors stable; use text, neutral badges, or symbols for gap interpretation rather than changing chart series colors.

### 3. Penalty cost report

- Add a dedicated view for misses, no-shoots, and procedurals.
- Show total penalties, stages where they mattered most, and estimated points lost.
- Keep hit-type colors in compact stage details because they improve readability without expanding the table.

### 4. Personal historical baseline

- Compare the current match against the shooter’s own historical averages.
- Track historical HF, Alpha percentage, penalties per match/round count, and time-per-point style metrics.
- Support trend analysis even when no external competitor comparison is selected.

### 5. Stage type tagging and trends

- Allow users to tag stages manually, for example: short/medium/long course, classifier, strong hand, weak hand, moving targets, long distance, unloaded start, high movement.
- Analyze strengths and weaknesses by stage type over time.
- Keep tags local and included in JSON/Drive backups.

### 6. Competitor benchmark groups

- Let users save comparison groups such as “top division shooters”, “same category”, or specific recurring benchmark competitors.
- Make it easy to reuse benchmark competitors across matches when aliases/names match.
- Consider division/category filters for fairer comparison.

### 7. What-if simulator

- Simulate simple scoring changes such as removing one miss, improving a stage time, or changing Charlie/Delta hits into Alpha hits.
- Estimate impact on stage points and possible placement.
- Keep simulations local and clearly marked as hypothetical.

### 8. Training recommendation summaries

- Convert analysis findings into calm, administrative training focus areas.
- Examples: “Prioritize accuracy consistency”, “Review stages with procedures”, “Track long-course performance”.
- Avoid tactical or weapon-modification guidance.

### 9. Match recap report

- Generate a concise recap for each imported match.
- Include final placement, best/worst relative stage, largest time gap, largest points gap, penalties, and three key takeaways.
- This can become the foundation for future PDF/CSV reporting.

## Import automation

### 10. Mare2 PDF import automation

- Add a workflow to reduce manual Mare2/FITDS PDF importing.
- Possible approaches to evaluate:
  - A local multi-file import queue for dropping several Mare2 PDFs at once.
  - Optional browser-side polling/import from a user-selected local folder when supported by the File System Access API.
  - Optional Google Drive appData/import folder workflow where the user places PDFs in their own Drive-controlled area and the app imports them after explicit authorization.
- Requirements:
  - No app-owned backend.
  - No scraping or credential sharing.
  - User remains in control of source files.
  - Imported PDFs are parsed locally in the browser.
  - Duplicate detection should avoid creating repeated match snapshots.
  - Status should show imported, skipped duplicate, failed parse, and needs review.
