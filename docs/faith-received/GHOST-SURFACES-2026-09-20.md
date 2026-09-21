# Ghost research surfaces and author curation

The publication theme now owns the colors and typography of every non-reader Faith Received route. The source application's stored reading theme no longer makes Authors, Works, Topics or another research tool look like a separate site. The reader retains its reading preferences; this change does not write the stored theme preference.

## Surfaces

- Authors, Works, Topics, Scripture and Compare share one Ghost-styled research navigation partial, including a persistent Library link to All works.
- The shared site skin uses the theme's existing page, ink, rule, accent and font tokens. It covers the Web, Search, Notebook, Desk and Dictionary as well.
- Source theme buttons are hidden on publication surfaces. The document theme attribute agrees with the light publication surface so canvas/SVG palettes use the correct colors.
- On mobile, the navigation scrolls horizontally, keeps Library and Ask accessible, and brings the current research view into sight. Inputs retain usable touch targets.

## Curation

Author grouping preserves every work ID and all shelf totals. Source author metadata remains unchanged.

- `PG 2 (anthology)` and similar collection labels are presented as collected and editorial material, not people. They have entry counts and no author-biography link.
- Unattributed works and groups consisting entirely of editorial records have separate headings and follow named authors.
- Confirmed name variants merge for display, including Irenaeus of Lyons / Irenaeus of Lyon. The rendered Irenaeus group contains 29 works, including the added English editions.
- Inverted editor names such as Maran, Prudent display in normal name order.
- A former overly broad parenthetical-name override is narrowed to explicitly curated author aliases. A stale anthology label cannot replace the source catalogue's named author.
- Pseudonymous attributions remain separate. No author has been invented for an editorial record.

## Verification

- Full build and lint passed; built assets remain current.
- Catalogue policy tests cover collection labels, anonymous and editorial groups, name variants and preservation of source attribution. Whole-catalogue checks preserve the established 19,205-work core and every shelf count, with the full English Editions catalogue still separate.
- Browser checks at 863px and 390px cover Authors, Works, Topics and research navigation. Mobile Topics has no page overflow and shows its active navigation item.
- Scripture, Web, Search, Notebook, Desk and Dictionary render the Ghost page/ink palette. The Web still renders its citation map and author index.
- All works search for Irenaeus gives one Irenaeus of Lyon group. PG 2 search retains four entries under Collections and editorial material; expanding it shows Addenda, Analytical Index, Table of Contents and Title Page.
- The Impeccable detector reported no findings for the changed theme/navigation targets.

Files: shared `faith-site-theme` JS/CSS, research-navigation partial and four host templates; `faith-catalogue.js`, `faith-room.js` and policy tests; asset hashes in the referencing templates. No corpus, backend or production deployment changed. Delivery is to the owner's fork and local integration branch, with no PR to Ian.
