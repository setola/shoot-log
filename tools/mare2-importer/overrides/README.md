# Mare2 catalog overrides

Optional manual corrections for stage-to-image mapping.

Create one JSON file per Mare2 match, named either `<matchId>.json` or
`mare2-<matchId>.json`.

Example for match `1616`:

```json
{
  "stagePageMapping": {
    "1": 7,
    "2": 10,
    "3": 12,
    "4": 8,
    "5": 11,
    "6": 13,
    "7": 6,
    "8": 9
  }
}
```

Keys are stage ids from `snapshot.json` (`"1"`, `"2"`, ...). Values are carousel
page numbers from `match.json` (`pages[].pageNumber`).

During `build-match`/`sync`, the CLI validates the override against the generated
stage and page ids and writes the normalized mapping to `match.json` as
`stagePageMapping`. The app uses that mapping when importing images from the
public Mare2 catalog.
