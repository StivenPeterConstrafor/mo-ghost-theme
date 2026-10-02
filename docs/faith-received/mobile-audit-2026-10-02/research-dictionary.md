# Mere Orthodoxy mobile research audit, 2 October 2026

Live browser, measured 390 × 844 CSS pixels. Actual scrolling and link/control interaction; no account sign-in, account changes, saved notes or model calls. Tested the logged-out journey. Desktop-sized incidental checks are excluded from mobile conclusions.

## Journeys exercised

- Search: opened `/the-faith-received/search/`, scrolled through the beta gate, form and sign-in. Search modes are not exposed to this unauthenticated session; Find/full text/meaning functionality therefore remains unverified.
- Ask: opened `/the-faith-received/ask/` at390px. Only the beta gate is served, so composer/answer/mobile keyboard behavior remains unverified.
- Global research navigation: swiped the horizontal rail right, opened Research, selected Desk, inspected and closed its account gate. Drawer items have generous full-width rows and remain usable. Keep Ian's intentional one-line horizontally scrolling rail; improve cues only if subsequent testing warrants it.
- Connections: opened `/the-faith-received/web/`, inspected the account modal at390px, closed it and scrolled the underlying gate. Actual author graph/evidence interactions remain unverified without an account. Current rail instead points to `/connections/`; this may intentionally identify Ian's newer surface and is not declared a broken link.
- Notebook: opened `/the-faith-received/research/#notebook` at390px, inspected/dismissed the account modal, scrolled the research gate. No notebook CRUD tested.
- Dictionary: searched `congruisme`, opened Congruism, scrolled the English text, returned to controls, opened Contents, jumped to IV. Congruism and Molinism, verified the settled section, returned to top, switched Both languages, returned to dictionary, searched `grace`, opened Grace II (Habitual or sanctifying grace), then scrolled its paired French/English text. Search state survives closing an entry. Both mode stacks French after English rather than squeezing columns.

## Findings and priorities

### P1: dictionary loses its reading/navigation controls within long entries

URL: https://mereorthodoxy.com/the-faith-received/dictionary/#congruisme

The English entry is about45,718px tall. At the settled IV section jump, `scrollY=25,216.5`; all article buttons are offscreen, with `.artbar` positioned relative, not sticky. The global rail remains but provides no way to change this article's section, language or entry. This turns a successful contents jump into an expensive trip back to the beginning.

Recommendation: retain the existing Back/title bar and compact language/Contents controls below the measured site rail. Preserve native page scrolling rather than restoring an inner scroll box. Scope this to phone/tablet widths already using page flow.

Source: `assets/css/port/dtc.in01.css:71–81`; native page-flow override `assets/css/faith-received.css:18647–18684`; current article markup `assets/js/port/dtc.in02.js:183–201`.

A CSS-only fix is prepared in `assets/css/port/dtc.in01.css`, awaiting isolated browser verification. No content, TEI, article IDs or data stores changed.

### P2: dictionary controls are too small for reliable touch

Measured painted/tap boxes: Back29.6px high; close32px; previous/next23.4×26px; language27.5px high; Contents79.3×26.3px; text-size34.6×26px. These dictionary buttons do not have the enlarged pseudo-element target that the gate's Sign in control already has.

Recommendation:44px minimum for these controls and contents rows, with a compact two-row toolbar, sufficient contrast/focus and no horizontal page overflow. Included in prepared CSS-only fix.

### P2: repeat visitors must scroll past the entire promotional gate to sign in

Search mobile gate first-name field begins at documentY1344; existing-member Sign in atY1860. The whole search request is replaced with six feature descriptions before any account action. Ask likewise begins with promotion and hides the account action far below the fold. A single context-specific account prompt with Sign in immediately visible would shorten return visits. Keep the beta/access policy; do not bypass the gate or change entitlements.

Source: `partials/faith-received/_beta-gate.hbs:99–159`. The small visual Sign in label already has a44px-plus pseudo target in `assets/css/faith-received.css:16783–16805`, so do not classify its24px painted height as an inaccessible target.

### P2 recommendation: improve dictionary text presentation

Congruism English visibly prints `*congrua*`, `*De divers. quæst. ad Simpl.*`, and longer asterisk-delimited citations. The renderer admits escaped HTML italics but leaves Markdown stars literal (`assets/js/port/dtc.in02.js:140–146`). Fully justified text with automatic hyphenation also causes distracting word gaps at this phone width (`assets/css/port/dtc.in01.css:57`). A separate narrowly tested formatting pass should render supported emphasis safely and consider ragged-right phone text. Not changed in this UI navigation pass.

## Positive checks

- Measured dictionary and search width remain390px: no page horizontal overflow.
- Dictionary search works in French and English; back restores the prior query.
- Entry Contents jumps to the selected section after smooth scrolling settles.
- Both-language reading stacks comfortably on the phone.
- Horizontal rail swiping and Research drawer selection work. Drawer items are legible and full width.
- Access modals fit390×844, clearly describe the requested tool and close without needing to submit.
- No model call or signup submitted; no evidence of authentication bypass.

## Verification limits

This is browser phone-width emulation, not a physical iPhone/Safari keyboard or screen-reader certification. Signed-in Search/Ask/Web/Notebook/Desk behavior cannot be certified from this logged-out live session. Source reviewed only to explain observed behavior. No production deployment occurred in this subtask.

Evidence screenshots:
- `evidence/dictionary-deep-section.png`
- `evidence/search-sign-in-buried.png`

## Isolated preview verification and additional finding

The CSS fix is browser-verified at `http://localhost:8902/the-faith-received/dictionary/#congruisme`, using the real Ghost template/assets and public dictionary data through the preview's Cloudflare proxy. At390×844 after scrolling, rail occupies0–43px, article Back/title43–95px, and reading controls95–211px. All observed article controls are44px. Contents still opens and a distant section jump lands visibly below controls. Evidence: `evidence/dictionary-deep-section-after.png`.

A separate existing position bug surfaced when switching languages far into the entry: the URL becomes `?paragraph=0&lang=both#congruisme` while the browser displays sec59–60 at the end. `current()` uses the old nested scroller's top+16 (`dtc.in02.js:220`) even on mobile page flow, and only `asc.onscroll` saves the reading place. This needs the viewport reading line and document scroll events on phones; root informed. CSS does not change paragraph state or implement this fix.

## Completed local changes and final verification

Edited:
- `assets/css/port/dtc.in01.css`: sticky Back/title and language/Contents controls below the measured header;44px controls and outline rows; narrow-phone layout; real parallel paragraph heights to prevent layout-estimate jumps when switching languages.
- `assets/js/port/dtc.in02.js`: select current paragraph against the phone viewport below reading controls; listen to document scrolling on phones; remove old listeners on repaint/entry close; restore the same paragraph after language changes, reconciling masthead height in the next two animation frames; new articles start at the article head.
- `scripts/check-dictionary-reading-place.cjs`: six tests run the actual helper code against mobile/desktop geometry and paragraph restore targets.

Passed all6 tests, JS syntax check, and diff whitespace check. Browser at390×844: actual scrolling from paragraph36 to40 followed by an AX/touch-style English→Both tap retained paragraph40 and the same opening words. Both→English round trip retained paragraph36 in a separate check. Sticky Contents remained available and its distant section jump worked. Back was usable from the deep reading position. At320×740 all measured reader controls were44px and page width stayed320px.

Important testing detail: Playwright click's automatic scroll-into-view can shift a sticky control and the visible paragraph before its click. Final preservation checks used AX taps, the same interaction class as the user's mobile tap, and measured the paragraph before/after. Physical iOS keyboard and Safari remain untested.

No production deployment. Root will package these tested source changes for Ian; corpus data, translation text, account gates and model routing are untouched.

Coverage follow-up: the in-app browser disconnected before the requested additional Compare/Bookmarks/Devotional journey; no further live mobile claim is made for those tools. Current source points Research→Compare to `/research/#compare` and Bookmarks to `/research/#bookmarks`, both explicitly account-gated; the earlier Notebook gate was live-tested, while Collections source forwards into Notebook (with a legacy browser-local fallback). Devotional has a dedicated template/route, but is not an item in the current main Read/Research rail and its plan interaction remains unverified.

## Completed authenticated coverage follow-up (Chrome)

After the in-app browser disconnected, one fresh agent-owned Chrome tab was used and closed afterward, with its temporary viewport override reset. The existing Chrome account was authenticated; the requested390×844 override measured **520×1125 CSS pixels** under inherited browser zoom, which was left unchanged. These are additional520px checks, not390px verification; no personal conversation/document contents or identifiers are reproduced here.

Actual journeys completed: Research→Compare→Augustine and Jerome→Grace, scroll loaded evidence, expand Confessions; Bookmarks empty state and its Browse library link; Notebook/Collections empty state and New collection control without creating anything; Find a work search for Baxter, scroll results and Next to page2 (175works,18pages); Ask blank composer, open/close Scope without a message; Ask→Desk and scroll the blank editor without writing. Search, Ask and Desk remained520px wide with no horizontal document overflow. Ask's visible input was52px high, send42px, scope/mode40px; no software-keyboard test. No model request, manual save, note edit, plan save, or account change was performed.

Devotional's dedicated URL loaded the setup page and Bible-track choices, and actual scrolling reached the lower setup area; sources remained “Loading sources…” throughout this brief visit and the Save plan button stayed disabled. The live Read menu contains Curated, Full Library, Page Scans, Authors, Traditions and Dictionary, with no Devotional link. Treat source-loading and discoverability as follow-up recommendations, not a completed plan-flow certification.

Separate evidence-quality concern encountered while reading Compare: in Augustine/Jerome→Grace→Confessions, three distinct index notes display the identical Confessions opening quotation atPL32:0659, all labelled “the passage the index marks”; the notes concern different claims. This needs a retrieval/source-location audit independent of mobile styling. No corpus or quote-selection code was altered in this pass.
