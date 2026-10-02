# Mere Orthodoxy mobile audit: Scripture, Authors, Topics

2026-10-02. Live Mere Orthodoxy in the in-app browser, measured viewport 390 × 844. Actual scroll and click interactions, not screenshots alone. Read-only data access; no Ask requests, saved works, or form submissions.

## Flows exercised

- Scripture: Genesis 1, scroll to y=844, select verse 3, open the inline verse summary, follow Open the Verse Desk.
- Verse Desk: Genesis 1:3, scroll through five translations to y=844, open 80 chapter commentaries, scroll choices to y=1,688, open Calvin Commentary on Genesis, scroll the preview, activate Keep reading here, scroll its embedded reader. Parent page remained y=3,531 while the iframe advanced from the preface to Genesis 1:1–6.
- Authors: open Continental Reformed, actually scroll 108 names, open John Calvin, scroll Works, switch Scripture, open Matthew, expand verse 1’s two citations.
- Topics: scroll index to y=844; open Trinity; select Nicea 325; scroll and expand the complete article; scroll to y=4,220 into works; open Bonaventure’s Disputed Questions and Read the Section.

URLs:

- https://mereorthodoxy.com/the-faith-received/scripture/?ref=genesis.1.3
- https://mereorthodoxy.com/the-faith-received/scripture/desk/?ref=genesis.1.3
- https://mereorthodoxy.com/the-faith-received/author/
- https://mereorthodoxy.com/the-faith-received/fathers/?sh=rf#john-calvin/s/matthew/1
- https://mereorthodoxy.com/the-faith-received/topics/?t=de-trinitate

## Findings and recommendations

1. **High: mobile commentary choice overwhelms the desk.** Opening all 80 Genesis commentaries increases the document to 12,732px. The two-column cards are roughly 150px wide; Lightfoot’s title wraps across seven lines. The close button is above the entire list, and citations below take many screens to reach. Use one-column choices inside a bounded list with its close header outside the scrolling body. Keep all works available. Source: assets/css/scripture-dev.css:966 and mobile block beginning 1047; markup assets/js/page/scripture-dev-desk.js:89–90 and 382–401.
2. **Medium: Authors loses the switching context in long lists.** Expanding Reformed produces an 8,699px document with 108 authors; no independently scrolling list. Rows themselves read well. Calvin’s 40 initial work cards and 71 Scripture books likewise extend the page. Keep author tabs/name and filtering reachable; use bounded lists or explicit batches, retaining the selected author and list position. Sources: assets/js/port/authors.in03.js, assets/css/port/authors.in01.css, research-experience.css.
3. **Medium: Topics shares the narrow-card issue.** At 390px, Bonaventure’s work name wraps eight lines and leaves an empty adjacent grid cell. Selecting a work correctly opens a full-width reading panel, but works begin several screens below confessions. Prefer one-column work rows on phones and a compact section switch/jump link. Keep confessions and works collapsed until requested. Source: topics-dev.css and the shared .sd-index-grid mobile rule in scripture-dev.css.
4. **Medium: fixed feedback tab covers reading controls.** Tell Us What You Think sits across the lower right of author citation actions and other content. It obscured Preview/Save controls in a screenshot. Move to a quiet floating icon clear of safe areas, or hide it while a reading panel is active.
5. **Medium: citation controls have weak contrast.** The 44px verse comment buttons in Calvin’s Matthew view have extremely pale tiny numerals. Use normal secondary text contrast and a clear Comments label/number. The hit region exists and clicks work, but discoverability is weak.
6. **Recommendation: reduce preamble before core research.** Five full-width translations precede commentaries/citations; by y=844 the user is still finishing them. Keep the selected translation visible and put the rest in a closed Compare translations disclosure or provide a local jump bar.
7. **Separate data/relevance finding:** Calvin’s Genesis 1:3 commentary preview returns translator’s prefatory discussion on p.5 instead of exposition of the verse. This is a retrieval issue, not repaired by mobile CSS; do not silently label it direct commentary. UI and full reader work.

## Positive findings

- No horizontal document overflow in assessed 390px Bible, desk, author room, or topic views.
- Bible reading type is comfortable, verse taps show a useful inline panel, and the Verse Desk keeps a back-to-chapter link with the selected verse.
- Commentaries, whole-Bible works, citations, and similar passages are clearly distinguished and initially folded.
- Inline mini reader loads real work text and independently scrolls while retaining the desk’s place.
- Author works display volume 1, 2, 3 metadata; mobile filtering is already folded to keep the page quiet.
- Topic article expansion and source-context links work, and the full-width selected preview is legible.

## Scoped implementation

In the tested theme worktree, assets/css/scripture-dev.css makes the phone commentary list one column; max-height 64svh (vh fallback), overflow-y auto, contained scroll; close header remains outside; Preview target is 44px; source head uses auto height; iframe is 46svh to fit within the chooser. Data, ordering, and open/closed defaults are unchanged.

Browser testing exposed a second issue: opening the iframe and its later source-anchor arrival could scroll the containing desk. assets/js/page/scripture-dev-core.js now reveals the frame by scrolling only the bounded chooser. assets/js/port/reader-core.js now positions framed reading anchors inside their own #scroll element; standalone behavior stays native. The late progressive-load arrival uses the same helper. No text rendering, row pairing, data, or corpus changes. scripts/check-embedded-reader-scroll.cjs contains six passing behavior tests for framed/standalone placement and bounded/unbounded frame reveal. JavaScript syntax and git diff --check pass. Root performs the serial build and commit.

Browser verification after implementation: local preview at http://localhost:8902/the-faith-received/scripture/desk/?ref=genesis.1.3 renders the actual current template and public Cloudflare commentary data. At 390 × 844, all 80 entries remain available inside a 540px list; computed grid is one 316px column, and Preview targets measure 44px high. Actual scroll over the list moved its scrollTop from 0 to 844 while document scrollY stayed 1,350.5. The collection close header and Citations heading below remained visible in the same screen. Document scrollWidth equals 390. Evidence: evidence/mereo-scripture-commentaries-after.png. The isolated preview origin cannot load the protected Bible text endpoint (Origin not allowed); live Bible text was separately verified above. No production deployment by this agent.

Evidence images: evidence/mereo-scripture-mini-reader-before.png and evidence/mereo-topics-mobile-before.png. The latter captures section-load progress, so it is layout evidence, not proof of completed text loading.

After the anchor fix, opened Calvin's embedded reader at p.5: document y=1,284.5 and chooser scrollTop=1,954 stayed unchanged after real text loaded and the source anchor arrived. An actual scroll inside the iframe advanced the text to Genesis 1:1–6, while document y, chooser scrollTop, and iframe top=355.6px stayed identical. Evidence: evidence/mereo-scripture-mini-reader-after.png. At 320×700 the list is one 246px column and 448px tall with no horizontal overflow. At 1200×900 the five-column desktop layout and unbounded height remain unchanged. Closing the chooser brings citations back immediately.
