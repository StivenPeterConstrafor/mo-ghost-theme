# GitHub readiness and mobile verification, 2026-09-20

The working branch is `tfr-parity-20260919` on the owner’s `StivenPeterConstrafor/mo-ghost-theme` fork. Local Ghost runs the same code on `local-all`. The fork owner and ADMIN access were verified through GitHub. No PR or deployment to Ian’s repository was initiated.

## Checks

- Security/style lint: zero errors and zero warnings after correcting 41 style failures in nine recent TFR files.
- Full theme build and its regression checks: pass, including separate-volume ordering for generic Works titles.
- Compiled CSS/JS freshness and digest freshness: pass.
- Scripture-reference parsing: 3,222 references pass.
- Live gzip-reader check: all 14 sampled public library endpoints parse correctly.
- The tracked machine-specific node_modules symlink was removed; dependencies are ignored. A normal locked npm install and the checks succeed in the served theme. No dependency target contents were deleted.

## Mobile walkthrough

Tested Chrome at 390 and 360 pixels, using actual page and reader scrolling. This is viewport testing, not a claim of testing physical iOS/Android hardware.

- Greek Fathers: entered from All works, scrolled the author list and volume grid, opened PG 44, scrolled its works and opened Gregory of Nyssa’s On the Making of Man. English and Greek remain readable together as the text continues into subsequent rendered columns.
- Roman Catholic: filtered catalogue now starts with that shelf, not Continue reading and all nine global shelf cards again. Its heading identifies the shelf immediately, and a clear All shelves link returns to the catalogue. The count names Roman Catholic, and the undated-work note follows the active results.
- Expanded Suárez’s works and scrolled their contents descriptions. Available volumes sort 1, 2, 3 through 22 and 24, preserving the actual holdings. No missing volume was invented.
- Opened Suárez’s Trinity section and scrolled the paired text. At 360px, Latin and English now each use the full 336px text width. The original paragraph pairs remain intact. At 1280px, the two-column desktop layout remains.
- Checked the paired reader in light and dark. An English-only EEBO work remains a single column with no empty original-language lane. The original dark theme and normal viewport were restored afterward.
- Increased small catalogue touch targets, added header clearance for result jumps, and decoded the entity in Thomas à Kempis’s display name.

## Upstream review is still required

The fork is synchronized and the code checks above pass. GitHub’s configured checks run on main/PRs, not feature-branch pushes, so there is no feature-branch Actions run to call green.

Comparison uses the current upstream main, `b3ba475187c334751e317cf6816f9237c6e8d5ec`. The broader existing port contains shared-file changes outside Ian’s contributor allowlist, plus an inherited change to the protected corpus registry. Most of those changes predate this mobile check; the list also includes the repository cleanup and check updates made here. They require a maintainer-owned integration/review; changing or disabling the guard would not resolve that requirement. The corpus registry and CI guard were not changed in this task.

Paths outside the allowlist:

- `.gitignore`
- `assets/built/faith-ask-workspace.min.css`
- `assets/css/faith-ask-workspace.css`
- `assets/css/faith-port-reader-skin.css`
- `assets/css/faith-port-surfaces.css`
- `assets/css/port/authors.in01.css`
- `assets/css/port/connection-evidence.css`
- `assets/css/port/dtc.in01.css`
- `assets/css/port/eebo.css`
- `assets/css/port/pins.in01.css`
- `assets/css/port/research-experience.css`
- `assets/css/port/search.in01.css`
- `assets/css/port/search.in02.css`
- `assets/css/port/search.in03.css`
- `assets/css/port/search.in04.css`
- `assets/images/tfr/bellarmine-title.webp`
- `assets/images/tfr/chamier-title.webp`
- `assets/images/tfr/gerhard-title.webp`
- `assets/js/lib/faith-notebook-store.js`
- `assets/js/lib/faith-web-graph.js`
- `assets/js/page/faith-ask-config.js`
- `assets/js/page/faith-ask-open.js`
- `assets/js/page/faith-bookmarks.js`
- `assets/js/page/faith-constellations.js`
- `assets/js/page/faith-desk.js`
- `assets/js/page/faith-landing-counts.js`
- `assets/js/page/faith-port-auth.js`
- `assets/js/page/faith-port-downloads.js`
- `assets/js/page/faith-port-links.js`
- `assets/js/page/faith-port-reader-address.js`
- `assets/js/page/faith-web-redirect.js`
- `assets/js/port/ask-workspace.js`
- `assets/js/port/author-address.js`
- `assets/js/port/authors.in01.js`
- `assets/js/port/authors.in02.js`
- `assets/js/port/authors.in03.js`
- `assets/js/port/authors.in04.js`
- `assets/js/port/bible.in03.js`
- `assets/js/port/connection-evidence.js`
- `assets/js/port/dtc.in01.js`
- `assets/js/port/dtc.in02.js`
- `assets/js/port/pins-experience.js`
- `assets/js/port/pins.in01.js`
- `assets/js/port/pins.in02.js`
- `assets/js/port/read-tools.js`
- `assets/js/port/readen.in01.js`
- `assets/js/port/readen.in02.js`
- `assets/js/port/readen.in03.js`
- `assets/js/port/reader-core.js`
- `assets/js/port/research-notebook.js`
- `assets/js/port/research-tools.js`
- `assets/js/port/search-tools.js`
- `assets/js/port/search.in01.js`
- `assets/js/port/search.in02.js`
- `assets/js/port/search.in03.js`
- `assets/js/port/search.in04.js`
- `assets/js/port/shelf-constellations.js`
- `assets/js/port/site-navigation.js`
- `assets/js/port/web.in02.js`
- `custom-bible.hbs`
- `default.hbs`
- `package.json`
- `routes.yaml`
- `scripts/build-collected-contents.py`
- `scripts/build-web-author-shelves.py`
- `scripts/check-ask-selectors.mjs`
- `scripts/check-collected-contents.mjs`
- `scripts/check-faith-port-addresses.cjs`
- `scripts/check-faith-port-links.py`
- `scripts/check-title-order.mjs`
- `scripts/check-web-network.mjs`

Protected path already present in the broader integration:

- `assets/js/faith-corpora.js`
