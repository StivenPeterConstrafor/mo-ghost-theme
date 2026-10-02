# MereO public mobile library spot check

Date: 2026-10-02. Read-only browser check; no production writes or paid calls.

## Scope and viewport

The available browser was the user's Chrome extension (only one browser available). A temporary viewport override requested 390 × 844 but measured 520 × 1125 CSS pixels, reflecting the existing browser zoom. An adjusted override produced **389 × 844 CSS pixels**. The override was reset at the end; browser zoom was not changed. A separate temporary audit tab was used.

## Verified

- Public landing: https://mereorthodoxy.com/the-faith-received/ loaded without a gate. Scrolled several screens into the collection/shelf area. No document horizontal overflow at the measured 389px width.
- Discovered and followed the Greek Fathers shelf link to https://mereorthodoxy.com/the-faith-received/patrologia-graeca/?collection=pg.
- Greek shelf loaded 3,062 works; By author / By volume controls, author/title search, century filter, page-scan filter and A–Z controls were present. Scrolled the actual page. No document horizontal overflow at 389px.
- Opened the native folded **Acacius of Beroea** author group. Both works were exposed with English/Latin titles and volume/column metadata. One work offered a separate contents disclosure.
- Followed **Four Letters** to https://mereorthodoxy.com/the-faith-received/read/?w=pg-1774. Reader loaded as **Four Epistles** with substantial source text and a previous-work navigation band. No document horizontal overflow at 389 × 844. This confirms shelf → author → work, not transcription accuracy.
- Landing exposed Roman Catholic shelf destination https://mereorthodoxy.com/the-faith-received/all-works/?collection=all&tradition=Roman%20Catholic.

## Recommendations and limits

- The Greek shelf places a sizeable “Study this shelf” block before browse controls and works. On a phone, consider a compact folded research block or an early “Browse works” jump so routine reading reaches the shelf sooner. The controls functioned; this is navigation friction rather than a confirmed break.
- Preserve volume/column labels and separate contents disclosure when refining mobile author rows: these already provide useful context before opening a work.
- The shelf label **Four Letters** becomes **Four Epistles** in the reader. Metadata/title consistency could be reviewed separately; this spot check did not retitle data.
- Roman Catholic room, its author/work journey, All Works list scrolling, browser-back restoration, keyboard appearance, real touch gestures, and mobile Safari were **not fully retested in this bounded pass**. The audit stopped when instructed because the in-app browser was unavailable. No claim of all-mobile-surface verification is made.
