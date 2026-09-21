# Catalogue and mobile reader parity, 20 September 2026

The Ghost library now uses the published Vercel works-index, dupfold and workgroups ledgers through Cloudflare. Each canonical work ID and each shelf total was compared with the live Vercel catalogue. The protected corpus registry and corpus files were not edited.

| Shelf | Vercel core | Local core |
| --- | ---: | ---: |
| Latin Fathers | 8,967 | 8,967 |
| Greek Fathers | 3,822 | 3,822 |
| Eastern Fathers | 400 | 400 |
| Medieval | 359 | 359 |
| Roman Catholic | 506 | 506 |
| Continental Reformed | 422 | 422 |
| English Divines | 4,416 | 4,415 |
| Lutheran | 268 | 268 |
| Humanism and Law | 46 | 46 |
| Total | 19,206 | 19,205 |

The one exclusion is `westminster-assembly-minutes-vol-1`, the introductory volume explicitly withdrawn by the owner. The five other Westminster minutes entries remain. The theme excludes that volume from catalogues and refuses its reader load. A direct HEAD check of its Cloudflare metadata URL returned 404; no storage, backend, or Vercel publication was changed in this patch.

Ian's English Editions collection (`mo`, `v1/mo/index.json`) is preserved in full: 69 entries at verification time. It is the additions catalogue, including unfeatured works, not a fixed list of landing cards. `scripts/convert-native-works.mjs` records how the original Ghost text pages were converted. Counts distinguish core works from these additional English editions. Creeds and confessions retain their dedicated 260-document catalogue, separate from the nine-shelf work count as on Vercel.

The core uses source work IDs rather than title-based guesses. Vercel's duplicate ingestion ledger folds repeated imports, while explicit workgroup witnesses remain. Baxter has 155 works, Manton 18, and Perkins 53. These names and counts were checked in the rendered local catalogue; Baxter and Manton were also checked against live Vercel search. Edwards's Resolutions is in the MereO additions catalogue. A separate Perkins addition outside Vercel has not yet been identified.

## Implementation

- `assets/js/lib/faith-catalogue.js`: shared canonical inventory, author display, duplicate folding, additions and withdrawal policy.
- `assets/data/faith-received/english-author-aliases.json` and `scripts/build-author-aliases.py`: 287 raw catalogue labels reconciled by published work IDs, preserving distinct people where dates or occupations disambiguate them. The existing patristic author-alias file remains unchanged.
- Native room, shelf, author, saved-work, index and landing consumers use the shared loader. Source collection adapters still provide supplemental printed-location metadata.
- `assets/js/port/reader-core.js`: Vercel's updated contents dismissal, focus and button states, and SVG dock icons. Expansion is excluded from drawer-dismissal handling. Touch uses native click activation.
- `assets/css/faith-port-reader-skin.css` and the reader template: 48px expansion controls through the 880px mobile breakpoint, a close-contents button, legible dock icons, and the restored Research control. Ian's colors and typography remain.
- Changed standalone asset references carry updated hashes in their templates. Full build completed; bundled outputs remain current.

## Verification

- Full theme build, lint, build freshness and diff whitespace checks passed.
- `scripts/check-catalogue-policy.cjs` covers alias variants, homonyms, preserved source records, withdrawal, duplicate ingestions, witnesses, and unfeatured MereO additions.
- `scripts/check-catalogue-parity.cjs` compared every core work ID and every shelf count using freshly downloaded public Vercel data.
- Browser checks at 390px and 863px: expand/collapse April 1644, navigate to Session 200, close the drawer, Search, Research, and the dock's accessible states. Light and dark renderings checked.
- English-only Westminster, Greek-and-English `pg-3127` (On Prayer), and Latin-and-English Suárez volume 1 render on mobile. Existing Greek and Roman Catholic shelf scrolling was also checked in the preceding mobile audit.
- Minutes search gives five entries and the introductory volume's reader shows an unavailable message.

## Delivery boundary

These changes are for the owner's fork and localhost integration branch. No PR to Ian and no production deployment is included. The existing upstream CI path restrictions recorded in `GITHUB-MOBILE-CHECK-2026-09-20.md` still require maintainer review before the larger port is submitted upstream.
