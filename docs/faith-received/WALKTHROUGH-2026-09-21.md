# Local reading walkthrough, 21 September 2026

Used the rendered Ghost site along three representative paths, then checked the public tunnel. This is a flow check, not a claim that every work or research record has been audited.

## Changes

- Eastern Fathers now uses the public 1907 Patrologia Orientalis volume 1 title page. The Latin Library uses Suárez's Opera Omnia volume 1 title page. Sources and captions are recorded in LANDING-IMAGE-SOURCES.md.
- The landing Reformed link previously selected only eight added English editions. It now reaches Continental Reformed: 422 core works plus eight English editions. Legacy Reformed links resolve to the same filter. Counts continue to separate the core corpus from added editions.
- Scripture passage navigation now accepts verse ranges, including Romans 6:3-4, on both Scripture and author research hosts. It highlights the selected verses and retains the range while their citation panels open. Invalid and unavailable ranges receive an explicit message.
- Added a temporary read-only Cloudflare tunnel bridge. No production worker, corpus data or authentication policy changed.

## Browser checks

General reader: landing page → Didache → Concerning Baptism → Fasting and Prayer → Library. The shared reader loaded all 16 contents entries, scrolled the text continuously and returned to All works.

Seminarian: Library → Scripture → Romans 6:3-4 → verse 3 citations → Augustine → Against Julian → Preview source passage. Both selected verses appeared; the source preview displayed Latin and English. Verse 3 showed 142 records, verse 4 showed 156. These are recorded citations, not independently verified unique passages.

Academic: Web → Johannes Andreas Quenstedt → Abraham Calov → citation evidence. The two witnesses remain distinct: 418 and 305 records. Clicking “Show all 418 records” rendered 418 reference articles for the first witness. Dictionary → Congruism paragraph 22 in English → Both displayed paired English and French text.

Mobile: at 390 × 844, scrolled the landing page, inspected both new title-page crops, and followed Reformed into the filtered library. Both images loaded; neither page overflowed horizontally; the result read “422 works + 8 English editions.” The Ghost palette and existing masthead were retained.

Public tunnel: All works and the Didache reader loaded real data through the public address, with local links rewritten. Public Portal configuration initialized; admin routes and account writes are blocked. No Ask submissions, account transactions or membership purchases were made during these checks.

## Limits

The dictionary currently returns to the beginning of the article when switching language lanes. This existing behavior was observed but was not changed in this pass. The temporary tunnel supports reading and public evidence; signed-in and paid actions still require the normal local or deployed application.

Changes were built and linted and integrated into local Ghost and the owner's parity branch. They were not deployed to Mere Orthodoxy or submitted to Ian's upstream repository.

## Other-agent update integrated

The parity branch was fast-forwarded through local-all's Index Rerum and per-volume title fallback changes (01c7fba77 and a30eba3eb), including the worktree symlink cleanups. The shared authors and Bible assets now carry refreshed content hashes in all four host templates. Local browser checks found Amadesius's Dissertation on the Ecclesiastical Metropolis of Ravenna (2,170 entries) and Pérez Bayer's Dissertation on Damasus and Laurentius (1,166 entries) under their readable titles and authors.

At verification, the other agent's third Latin Library sparse rebuild was still running (`tools/build_tfr_sparse.mjs`). Its R2 refresh and Aquinas alias scripts were waiting, the refresh log was empty, and the post-rebuild coverage file did not yet exist. No duplicate rebuild was started and no corpus pipeline was changed here. This index work must not be described as verified on Cloudflare until that chain finishes and the resulting coverage and worker data are checked.
