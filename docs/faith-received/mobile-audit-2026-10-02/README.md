# Mobile reading audit and tested improvements

2 October 2026. Prepared for Ian at the owner's request.

**Status: tested source patch, not a production deployment.** The live audit found useful foundations and specific navigation friction. This package fixes the verified reader, Scripture preview, and dictionary problems below; it does not certify every signed-in tool or physical device.

## What is ready

| Surface | Before | Tested change |
|---|---|---|
| Reader contents | Reopening a long outline centres the current entry, leaving search and work-switching controls far above it. | A 44px **Find or switch** button returns to the controls. The full search panel remains non-sticky, preserving Ian's decision to leave room for the outline. |
| Reader Library | Only the first 900 works are drawn; author headings are click-only; the current author may be absent. | Current author and work come first. Native expandable groups, 25-author/40-work batches and explicit Show more retain the full catalogue. |
| Work/volume search | Only title/author matching; a naive volume search also matches unrelated numeric work IDs. | Combined author/title/edition search and exact PG/PL/PO volume matching. **PG 73 returns four PG 73 works**, not PG 28 or work ID 1473. |
| Volume picker | Options load on the first tap, after a native phone picker may have opened. PO incorrectly uses the PL volume index. | PG/PL options load before interaction, with a retry on failure. PO keeps adjacent-volume navigation without offering a false PL index. |
| Scripture commentary choices | 80 commentaries produce a 12,732px page; two narrow columns make long titles hard to scan. | One column in a bounded mobile list. All works remain available; the close control and citations stay reachable. |
| Mini reader | Opening a preview or its delayed source anchor can pull the surrounding verse desk out of place. | The chooser and embedded reader move their own scroll panes. Standalone reader behaviour is preserved. |
| Dictionary | Long entries leave Back, Contents and language controls tens of thousands of pixels away; targets are 26–32px. | Reachable compact controls, 44px targets, and no horizontal overflow at 320/390px. |
| Dictionary language switching | Changing English/Both far into an entry can lose the current paragraph. | Save and restore the paragraph from the actual mobile reading viewport. Browser tests preserved paragraphs 36 and 40 through language changes. |

The four-button phone dock, visual identity, source text, corpus IDs, access policy, backend and production configuration are unchanged. No OpenRouter calls or paid research requests were used.

## Actual reading journeys

Live MereO at 390 × 844, using scrolling and navigation controls rather than screenshots alone:

| Shelf | Works and actions |
|---|---|
| PG | Basil's **Letters**, three screens down and one up, contents and reader Library; switched to Chrysostom's **Homilies on the Statues** and scrolled onward. |
| PL | Augustine's **Confessions**, scrolled and jumped to Book II; switched through reader Library to **Soliloquies**, then read down into column 870. |
| English Divines | Baxter's **Five Disputations**, scrolled, filtered contents and reached **Chapter II, Nature and Ends of Ordination**, section 141; switched to Owen's **Practical Exposition on Psalm 130** and scrolled onward. |
| Continental Reformed | Calvin's **Institutes** (Beveridge), scrolled; switched to Polanus's **System of Christian Theology, volume 4**, read down, and reached **chapter VI, On the eternal counsel and decree of God**. |

Live reader destinations:

- [Basil](https://mereorthodoxy.com/the-faith-received/read/?w=pg-419&p=665#b665-0), [Chrysostom](https://mereorthodoxy.com/the-faith-received/read/?w=pg-667)
- [Confessions](https://mereorthodoxy.com/the-faith-received/read/?w=pld-2722), [Soliloquies](https://mereorthodoxy.com/the-faith-received/read/?w=pld-2855)
- [Baxter](https://mereorthodoxy.com/the-faith-received/read/?w=baxter-five-disputations-church-government-worship), Owen (opened from the reader Library)
- [Calvin](https://mereorthodoxy.com/the-faith-received/read/?w=calvin-institutes-of-the-christian-religion), [Polanus](https://mereorthodoxy.com/the-faith-received/read/?w=polanus-amandus-polanus-syntagma-theologiae-christianae-liber-iv-de-de)

The public landing and Greek shelf were also scrolled, including shelf → Acacius of Beroea → **Four Letters**. Scripture checks covered Genesis 1 → verse 3 → Verse Desk → commentaries → preview → mini reader. Author checks covered Reformed → Calvin → works → Matthew citations. Topic checks covered Trinity → Nicea → source work. Dictionary checks covered search → Congruism → distant section → language switch → back → Grace II.

Search, Ask, Connections, Notebook and Desk presented account gates in the 390px in-app session. A later authenticated Chrome pass at **520 × 1125 CSS pixels**, preserving its existing zoom, verified Baxter search pagination, Compare topic/work expansion, Ask scope controls without sending, Bookmarks/Notebook empty states, and Desk scrolling without editing. These are not 390px signed-in acceptance tests. Connections graph interactions, saving, model responses, mobile keyboards and complete Devotional plan creation remain unverified. Devotional showed its setup and Bible tracks but sources remained loading during the brief check. Physical iPhone/Android, Safari and assistive-technology testing are still required before calling this comprehensive mobile acceptance.

## Recommendations for the next pass

1. **Keep an existing-member Sign in action above the promotional gate.** On Search it is currently around 1,860px down. Preserve access rules.
2. **Bound or batch long author lists**, keeping filter and selected-author context reachable. Reformed expands 108 authors into an 8,699px page.
3. **Use single-column work choices on phone Topics pages**, and avoid repeating the preview when the full section opens.
4. **Keep the feedback tab clear of reading actions.** It can cover Preview/Save near the bottom of the screen.
5. **Strengthen tiny, pale citation numerals** without changing the already adequate hit areas.
6. **Reduce the Scripture preamble** with a selected translation and a folded comparison of the others, or a local section jump bar.
7. **Consider grouping phone Tools into a compact sheet.** The current strip exposes roughly 19 controls in a 1,071px horizontal run behind a 290px viewport. This is a design recommendation, not changed here because Ian explicitly chose the sliding dock.
8. **Fold the large shelf research introduction** or provide an early Browse works jump. Preserve the useful volume/column information already shown on work rows.

Separate editorial/relevance review: some contents still expose generic labels such as “Div1”; Calvin's Genesis 1:3 preview starts with translator prefatory material. In Compare, three different Augustine index notes opened the same Confessions opening at PL 32:659 under “the passage the index marks”; verify those evidence locators before presenting them as exact passages. These were not retitled or repaired as layout changes. The previous PG corpus-quality audit remains separate.

## Validation and application

- Based on upstream **2c135af91**. Tested implementation: [95ec85453](https://github.com/StivenPeterConstrafor/mo-ghost-theme/commit/95ec85453) on `fix/tfr-mobile-reading-20261002`.
- Full `npm run build` passed, including required reader, Scripture, Ask, catalogue and asset checks. Generated bundles were unchanged; modified standalone assets receive updated template cache versions.
- **17 focused regression tests passed**: library coverage/search, dictionary reading place, and framed reader scrolling. Independent review found no blocking issue.
- After-checks used the actual Ghost templates/assets in an isolated local preview and real public Cloudflare data through a read-only local proxy. No product endpoints were changed. The preview origin cannot load the Bible translation endpoint; live Bible text was tested separately.
- Mobile evidence covers 320px and 390px; Scripture desktop layout was checked at 1200px. This is browser emulation, not physical-device certification.

The repository's TFR Path Guard excludes contributor edits to `assets/js/port`, `assets/css/port`, and several other engine paths. This documentation-only PR therefore carries the complete patch for a maintainer to review and apply. **Merging this documentation PR does not install the fixes.** The guard is not changed.

From a clean checkout at the recorded base (or after checking against current main):

```sh
git apply --check docs/faith-received/mobile-audit-2026-10-02/mobile-reading.patch
git apply docs/faith-received/mobile-audit-2026-10-02/mobile-reading.patch
npm run build
node --test scripts/check-reader-library.cjs scripts/check-dictionary-reading-place.cjs scripts/check-embedded-reader-scroll.cjs
```

Review the resulting changes and commit the source, template cache versions and any regenerated assets through the maintainer's normal deployment process. The patch includes a one-line correction to a stale test mock (`MOCorpora.url`); protected corpus configuration is untouched.

Supporting material: [Scripture/Authors/Topics audit](scripture-authors-topics.md), [research/dictionary audit](research-dictionary.md), [library spot check](library.md), [build log](build.log), [focused tests](focused-tests.log), and [screenshots](evidence/).
