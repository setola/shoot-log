# Mare2 importer CLI

Builds app-ready static data from public Mare2 match pages without adding any
backend dependency.

## Current behavior

- inspects public Mare2 match details pages;
- extracts the `VERIFY` PDF URL and carousel page images;
- downloads the PDF only into the local CLI cache and parses it into the existing
  `PractiscoreMatchSnapshot` shape;
- converts carousel JPG pages into WebP assets for the app;
- writes only JSON and app-ready image assets to the output directory;
- discovers historical matches from the public Mare2 archive, following
  pagination;
- skips future matches before opening their details page unless `--include-future`
  is passed;
- supports date-window cron sync with `--since=YYYY-MM-DD`;
- rate-limits Mare2 HTTP requests during `sync` via `--request-delay-ms`;
- merges optional manual stage-to-page overrides from
  `tools/mare2-importer/overrides`;
- writes Cloudflare Pages `_headers` with CORS enabled for app-side `fetch()`.

The original Mare2 PDF is not published. Its public URL, hash and byte size are
recorded in `source.json`. Original carousel JPGs and PDFs are cache-only.

## Usage

```bash
npm run mare2 -- inspect --match=1616
npm run mare2 -- build-match --match=1616 --out=tmp/mare2
npm run mare2:sync -- --year=2026 --min-level=3 --championship=federale --ma=3
npm run mare2:deploy:cf
```

Useful options:

```bash
--url=<details-url>       Full Mare2 details URL instead of --match.
--cache-dir=<dir>         Local cache directory. Default: .mare2-cache.
--overrides-dir=<dir>     Manual mapping override directory.
--year=<year>             Discover archive matches by year.
--championship=<name>     Archive match type filter, e.g. federale, winter.
--ma=<n>                  Macro-area/category filter, e.g. 3 for MA3.
--since=<YYYY-MM-DD>      Sync past matches whose end date is on/after this date.
--include-future          Also inspect future matches. Default: skip them.
--request-delay-ms=<n>    Delay between Mare2 HTTP requests. Default: 300.
--max-pages=<n>           Stop archive discovery after n pages. Default: 100.
--limit=<n>               Limit sync builds while debugging.
--force                   Re-download cached files and rebuild assets.
```

## Cloudflare Pages publishing

`npm run mare2:sync` writes generated data to `public/mare2`, which is ignored by
Git. Deploy with:

```bash
npm run mare2:deploy:cf
```

or run both steps:

```bash
npm run mare2:publish:cf -- --year=2026 --min-level=3 --championship=federale --ma=3
```

If Wrangler has access to more than one Cloudflare account, set
`CLOUDFLARE_ACCOUNT_ID` in your local `.env` file first. This value is not a
secret, but local account IDs should not be committed.

The deployment uses Wrangler project `shooting-logbook-mare2-data` and publishes
to:

```text
https://shooting-logbook-mare2-data.pages.dev/manifest.json
```

The generated `_headers` file enables CORS:

```text
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type
  Cache-Control: public, max-age=300
```

## Output

```text
mare2/
  matches/
    1616/
      match.json
      source.json
      snapshot.json
      assets/
        pages/
          page-01.webp
          page-02.webp
```

`sync` writes `manifest.json` and `years/<year>.json`. Existing matches older than
`--refresh-recent-days` are skipped when source URLs are unchanged. Recent matches
are rebuilt so partial VERIFY PDFs can refresh while score entry is still in
progress.

For a daily cron-style update after a known date:

```bash
npm run mare2:publish:cf -- --year=2026 --since=2026-07-01 --request-delay-ms=1000
```

## Manual stage-page overrides

When automatic image mapping is ambiguous, add a JSON override under
`tools/mare2-importer/overrides`. See the README in that directory.

Example:

```json
{
  "stagePageMapping": {
    "1": 7,
    "2": 10,
    "3": 12
  }
}
```

The CLI validates stage ids and page numbers, then writes the mapping into
`match.json`. The app uses this mapping before falling back to the old "last N
pages" heuristic.

Future work: attach a custom Cloudflare domain, persist the last successful sync
date, and generate suggested stage-page mappings from parsed briefing metadata.
