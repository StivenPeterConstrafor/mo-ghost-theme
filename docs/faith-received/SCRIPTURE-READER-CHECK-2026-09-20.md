# Reader Scripture verification, 20 September 2026

Localhost uses the Vercel reader for the core library and Ian's English Editions. The legacy English Editions URL for Edwards's Resolutions redirects to `/the-faith-received/read/?w=edwards-resolutions` and uses the same Scripture parser and popup.

## Verified

The complete inline Scripture parser and DOM continuation block in `assets/js/port/reader-core.js` equals the current Vercel source after changing Scripture search URLs to their local equivalents. This includes Latin and English abbreviations, Roman-numbered chapters, verse lists and ranges, inherited chapters, formatting boundaries, and paragraph continuations. Text and reading-row pairing were not changed.

Live browser checks:

- Westminster minutes: `Lk. 10:1, 7` opens Luke 10:1 and 10:7, without filling in the intervening verses. Vercel and localhost attach the same full reference.
- Suárez, Works volume 1: Latin `Joan. 4` opens John 4 on a 390px screen and labels the three opening verses as an excerpt.
- Edwards, Resolutions: `Eph. 6:6-8` opens the same mobile Scripture sheet and displays exactly verses 6, 7, and 8 from the added English edition. Checked in light and dark themes; the sheet fits the 390×844 viewport. Escape closes it and returns focus to the citation.
- The Bible-chapter link opens the local Luke 10 page with the verse parameter preserved.
- Local previews display ESV, with the existing ASV fallback. The source Vercel popup uses ASV. Local URLs and the existing translation choice are intentional port differences.

## Fixes and regression protection

Two popup defects were reproduced in tests and fixed:

1. Hover prefetch and the subsequent click could request the same ESV chapter twice. They now share one pending request; completed chapters remain cached and failed requests can be retried.
2. A missing-verse warning always named ASV. It now names the edition actually loaded.

`check-reader-scripture.cjs` ports the 16 Vercel parser tests. `check-reader-scripture-preview.cjs` covers 13 popup cases, including lists and ranges, keyboard activation, dismissal, stale responses, ASV fallback, ESV labels, and request sharing. All 29 pass and run in the theme build.

Files changed: the popup script, its hashed reader-template reference, the build test command, the two regression suites, and this note. Full build and lint pass. No corpus data, backend, source Vercel publication, or production deployment changed.
