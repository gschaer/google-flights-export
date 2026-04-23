# Google Flights Export

A browser bookmarklet that copies Google Flights booking details to the clipboard as formatted plain text (for chat / notes) and HTML (for email).

## Usage

1. Build the bookmarklet (see below) and paste the contents of [`dist/GoogleFlightsExport.bookmarklet.js`](dist/GoogleFlightsExport.bookmarklet.js) as the URL of a new browser bookmark. The file starts with `javascript:` — use the whole string as-is.
2. Open a Google Flights booking page (the one that lists each segment of the selected itinerary) and click the bookmark.
3. A toast appears ("Copied N flight legs to clipboard") and the result is on your clipboard in both plain-text and HTML flavors. Paste into Gmail and the formatting is preserved; paste into a text editor and the markdown-style `*bold*` fallback shows.

Example output:

```
*Etihad EY 146* (dur: 6 hr 15 min)
Departure Geneva Airport (GVA) 12 May 10:45 AM
Arrival Zayed International Airport (AUH) 12 May 7:00 PM

*Etihad EY 800* (dur: 10 hr 10 min)
Departure Zayed International Airport (AUH) 12 May 9:25 PM
Arrival Narita International Airport (NRT) 13 May 12:35 PM
```

## Build

```sh
yarn install
yarn build
```

This produces:
- `dist/GoogleFlightsExport.bundle.js` — readable IIFE, useful for inspection.
- `dist/GoogleFlightsExport.bookmarklet.js` — URL-encoded, `javascript:`-prefixed, ready to paste into a bookmark.

## Test

```sh
yarn test                  # unit + fixture-based integration (offline)
LIVE=1 yarn test           # also runs the live Google Flights end-to-end test
```

Live test variants:

```sh
# Drive the search flow from scratch (GVA → NRT, 90 days out).
LIVE=1 yarn test tests/bookmarklet-live.test.js

# Or point the test at an existing booking URL in your browser history.
LIVE=1 GFE_TEST_URL="https://www.google.com/travel/flights/booking?tfs=..." \
  yarn test tests/bookmarklet-live.test.js
```

## How it works

The bookmarklet looks for flight-leg containers on Google Flights' booking page using DOM selectors (`.c257Jb` for each leg, `.MX5RWe` for the airline/flight number/aircraft, `.dPzsIb` + `.SWFQlc` for departure/arrival, `.CQYfx` for duration). Text from each container is parsed with regex into a structured Leg, then serialized to plain text and HTML. Result is written to the clipboard via `navigator.clipboard.write()`.

When it breaks — and it will, because Google cycles these class names — the fix lives in [`src/extract.js`](src/extract.js): update the selectors at the bottom of the file and re-capture a fresh DOM fixture into [`tests/fixtures/`](tests/fixtures/).

## Files

- [`src/GoogleFlightsExport.js`](src/GoogleFlightsExport.js) — bookmarklet entry point: DOM query + clipboard write + toast.
- [`src/extract.js`](src/extract.js) — pure extraction and formatting helpers.
- [`tests/extract.test.js`](tests/extract.test.js) — unit tests for the pure functions.
- [`tests/bookmarklet.test.js`](tests/bookmarklet.test.js) — Playwright integration test against the HTML fixture.
- [`tests/bookmarklet-live.test.js`](tests/bookmarklet-live.test.js) — live end-to-end test against google.com/travel/flights (opt-in via `LIVE=1`).
- [`scripts/build.mjs`](scripts/build.mjs) — esbuild-driven bundler that emits the bookmarklet.

## Authors

- **Guillaume Schaer** — [gschaer](https://github.com/gschaer)

## License

MIT — see [LICENSE.md](LICENSE.md).

## Disclaimer

This is an unofficial, independent project and is not affiliated with, endorsed by, or sponsored by Google LLC. "Google Flights" is a trademark of Google LLC. The bookmarklet only reads DOM content already visible in your browser and does not interact with any Google API. Use at your own risk; Google may change the page structure at any time, breaking extraction.
