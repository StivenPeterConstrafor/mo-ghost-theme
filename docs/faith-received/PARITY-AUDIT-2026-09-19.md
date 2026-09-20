# Vercel to local Ghost parity audit, 2026-09-19

Source: thefaithreceived.vercel.app and the current page assets in ~/fr_deploy.
Target: localhost:2368, served from mo-ghost-theme-ian on local-all. Vercel was not changed or deployed. Use my ChatGPT is the owner's only feature exclusion.

## Surface map

All paths in the Ghost column start with `/the-faith-received/`.

| Source | Ghost | Implementation / observed result |
|---|---|---|
| `/` | `all-works/?collection=all` | MereO catalogue retained. Added research navigation and six research doors on each of the nine large shelves. |
| `/search?m=title` | `search/?m=title` | Imported the actual source Search page: Works, Passages (exact words / by idea), Scripture, Ask, legacy mode URLs, filters and ordering. Member gated. |
| `/ask`, `/search?m=ask&trad=…` | `ask/`, `search/?m=ask&trad=…` | Existing Ask workspace, now member gated; configured on every mounted port surface; corrected Desk and Collections links. |
| `/authors`, `/fathers` | `author/`, `authors/`, `fathers/` | Shared source research engine. Medieval shelf opens; Aquinas room loads works and all seven subviews; Positions exercised. |
| `/bible?sh=md` | `bible/?sh=md` | Romans 8 opened with “Sources: Medieval”; chapter and commentary controls present. Corrected Authors navigation. |
| `/topics?sh=md` | `topics/?sh=md` | Shared source Topics engine; 125 Medieval topics rendered with the shelf selected. Earlier curated topic directory preserved at `topics/reading-guides/`. |
| `/compare` | `compare/` | Shared source Compare engine, preserving fragment state, member gated. Earlier Research compare tab retained. |
| `/pins` | `pins/` | Imported source Notebooks: collections and all-saved-research surface, sharing/import/export and Desk handoff. Member gated. Link to earlier account bookmarks retained. |
| `/desk` | `desk/` | Existing source Desk retained and member gated; links to the ported notebook/search. |
| `/dtc` | `dictionary/`, `dtc/` | Existing full dictionary port; “grace” returns seven of 1,916 articles; article opens with bilingual and contents controls. |
| `/web` | `web/` | Existing atlas port; 2,608 entries loaded and Shelf maps opened with 287 English Divines authors. |
| `/read?w=…` | `read/?w=…` | Existing source reader kept. Latin/English Isidore and English-only EEBO 1022 opened. English title/text checked against source. Light and dark desktop reviewed. |
| `/readen?id=…` | `readen/?id=…` | Source standalone English reader imported; public route and assets present. |
| `/review?w=…` | `review/?w=…` | Reader destination mounted. Owner-only corpus editing is not certified by this UI audit; backend/auth not changed. |

## Link and save contract

`faith-port-links.js` handles emitted internal source links, static-work URLs, query strings, and fragments. External citations and MereO's site-home/membership links stay intact. Legacy `reader/?c=eebo&w=1022#b3-0` was followed in the browser and arrived at `read/?w=eebo-1022#b3-0`. MereO-only editions retain their existing reader.

Shelf doors carry their codes: pl, gf, po, md, rc, rf, ed, lu, hl. Every shelf links to Ask, Scripture, Authors, Topics, Web, and Dictionary. Ask carries `trad`; Scripture/Authors/Topics carry `sh`.

New catalogue work saves use FRResearchNotebook, the same store as the ported reader and Notebooks. Earlier account bookmarks remain reachable on `/dashboard/faith-received/`; this change does not delete or migrate those records. MereO-only editions keep the account bookmark service.

## Verification

- Required `npm run build` passed, including all nine project checks and built-file generation.
- Changed unbundled JS parsed with Node 22.
- `node scripts/check-faith-port-addresses.cjs`: 14 checks passed, including query filters, source/local reader addresses, external URLs, and colon-bearing page IDs.
- In-memory notebook API check: repeat work save deduplicates; removing a saved work preserves its separately saved passage and column anchor.
- `scripts/check-faith-port-links.py` inventories 15 source pages and their static internal URLs, then checks the destinations and assets emitted by anonymous Ghost pages. See `parity-audit.json` for the latest run. This is not a claim that every dynamic corpus record was clicked.
- Public browser checks: library doors, Medieval Topics, Medieval Scripture and Romans 8, author directory and Aquinas Positions, dictionary search/article, atlas/Shelf maps, Latin/English and English-only reader, legacy reader handoff.

## Remaining verification / limits

This is a surface and workflow parity audit, not a claim that every individual corpus page or every generated answer was reviewed.

- A local-only test member was created through Ghost's normal signup and emailed confirmation. Signed-in title search, full-text search, semantic search, Scripture search, Compare, saving to Notebooks, Desk handoff, Ask completion and embedded citation reading have now been exercised.
- With explicit owner approval, staging now also verifies localhost Ghost signatures for a 24-hour window. The production verifier runs first and is unchanged. The local verifier requires the exact staging hostname, loopback Origin, configured public key, valid RS512 signature, and current token expiry. Both outer routing and Ask's inner gate use it; budget checks remain. All 17 original staging bindings were preserved and verified. The production worker was not changed.
- The in-app viewport override did not change the measured width. Responsive testing moved to Chrome, where 390 × 844 was measured and the library fit without horizontal overflow. Library, signed-in Search, comparison, the English-only reader and the bilingual reader were measured at 390px without page overflow. The Aa menu clipping bug was repaired and verified in light and dark themes.
- Source and local catalogue totals differ. This audit does not certify corpus-data parity or change corpus data.
- Owner editing / QA writes are outside the verified public reader behavior. No corpus writes were made.

## Local sign-in support

A loopback-only Mailpit process accepts SMTP at 127.0.0.1:1025 and exposes its inbox at http://127.0.0.1:8025/. Ghost's development config points there. A test message was accepted. The test message itself is not a sign-in link: retry Ghost's sign-in form and use the resulting email. This development setting is not part of the theme or production deployment.

## Reproduce

Use Node 22. The theme's tracked node_modules symlink may not supply build dependencies in a new worktree; install the locked package set locally if needed. `npm --script-shell=/bin/bash run build` was used because the inherited shell invocation exited before executing the checks.

```sh
node scripts/check-faith-port-addresses.cjs
python3 scripts/check-faith-port-links.py --source ~/fr_deploy --output docs/faith-received/parity-audit.json
```

Routes are Ghost site configuration: the theme GitHub build alone does not install routes.yaml. The current routes were copied to the local Ghost settings directory and Ghost restarted. Production route upload and any upstream handoff remain the owner's decision.

## Signed-in test results

- Title search: Turretin returned five works, with 86 matches including sections.
- Exact-word search: “foedus operum” returned 2,297 indexed sections with pagination and local reader links.
- Semantic search: “grace” returned 100 ranked passages in 66 works after correcting the Cloudflare response adapter. Opaque vector anchors are not treated as printed reader pages; citations remain visible and such hits open their work.
- Scripture search: Romans 8:1 returned 1,000 published source locations in 357 works, with local chapter and reader links.
- A new test save appeared in the source Notebooks page and the Desk research view. Earlier saves were not deleted.
- Ask completed an authenticated test answer and “Read here” opened the Acts of the Council of Trent at p. 699 inside the local reader. Its source-verification warnings remained visible.

- Legacy `m=tradition&trad=Medieval` opens Deep research with Medieval scope. A background test completed with its unsupported quotation explicitly marked as an unverified reference, rather than asserted as a verified page.
- The completed Deep report downloaded as `research-report.md` (482 bytes); its evidence JSON downloaded as `research-evidence.json` (2,374 bytes, valid JSON). Authenticated fetch supplies the bearer before a local Blob download; credentials are never added to exported URLs.
- Standalone English-reader collection navigation now stays on the local equivalents for PL, PG, PO, Aquinas and EEBO. Its wrapper uses the existing theme tokens to avoid pale headings on a pale background in dark mode.

## What was changed

Theme sources: mounted port templates; `routes.yaml`; shared port URL/auth/download adapters; the source Search response adapter and shelf query handling; catalogue shelf doors and save integration; scoped reader/standalone-reader CSS; required built CSS; address/link checks. Source engines and corpus text were retained. The full file list is in the branch diff.

Backend sources: staging's outer and inner member-verifier imports, a signature-verifying localhost wrapper with explicit expiry, its negative/positive tests, and a staging-only deployment helper. Shared production auth and budget implementations were not edited.

No Vercel deployment or canonical MereO deployment was performed. No PR was opened against Ian's repository. The local Ghost route configuration was applied; a production handoff will still need the corresponding Ghost route upload.

## Final local evidence

The final anonymous audit checked 15 source-page mappings, 17 static source URLs, and 123 local destinations/assets with no failures. Dynamic shelf doors were checked in the browser for all nine shelves. Two-author comparison (Aquinas and Scotus) remained within a 390px page and its “Where they meet” view retained the explicit rare-vocabulary explanation, not an agreement/contradiction verdict.

The test save was recognized on its catalogue row, then removed through that row; the button returned to its unsaved state. No earlier saved items were removed. The standalone English reader's dark wrapper and heading were measured as rgb(34,35,32) and rgb(233,233,229). The library's research navigation uses white text on the existing MereO image hero. Phone viewport was 390 × 844; no page-level horizontal overflow was measured on the tested library, search, comparison and readers.

One short Ask and one short Deep test were used. The generated answers retained their verification warnings. Their content is test output, not a new curated source. Local preview authentication is time-limited and must be explicitly re-enabled after its 24-hour staging window expires; this restriction does not apply to the site's normal production member verifier.

## Correction: research sections inside opened shelves

The first audit checked the all-works shelf cards and their destinations but missed the research/reference sections inside the destination shelf pages. The owner's annotated Latin Fathers comparison exposed this omission.

The shared `faith-room.js` renderer now places visible Study this shelf cards (Scripture, Authors, Topics, The Web), Ask this shelf, and a separate dictionary Reference card above the catalogue. The section is present on the dedicated PL, PG, PO and EEBO pages and on filtered all-works destinations for Medieval, Roman Catholic, Continental Reformed, Lutheran and Humanism and Law. It updates with the active shelf filters and is hidden when no particular shelf is selected.

Browser verification: all nine destination shelves rendered all six local links with their correct research codes. The exact reported `/patrologia-latina/?collection=pld` page was checked; its dictionary card opened the lookup interface, and its Topics card arrived with Latin Fathers selected (87 topics at verification). At 390 × 844, the cards stacked into one 350px column and document scroll width remained 390px. This checks the visible destination content, not merely an HTTP status or the existence of a route.

## Correction: atlas exit and consistent Ask appearance

The atlas now has a persistent “← Library” link outside its hash-mode router; it returns to All Works and remains visible at phone width. The existing Ask page already loaded MereO's skin, but imported overlays loaded the source site's monochrome stylesheet. Every Ask entry point now loads the shared built MereO stylesheet. A build check enforces this across the templates.

Ask uses Source Serif Pro even on readers that redefine the global body font. Its light page/sidebar colors are the existing MereO tokens (#f6f3f2 / #f5efe1), and its existing dark palette is retained. The hidden panel rule and reader-side docking geometry are included in that same skin. Browser checks covered opening/closing on the atlas, light/dark switching, the Library destination, a 390px conversation drawer, and desktop reader docking (435px wide, below the site masthead and reading toolbar).


## One Web, native constellation layouts, and landing copy

The Web at `/the-faith-received/web/` now owns both the chronological citation map and Ian's rings, tradition and Scripture similarity layouts. The Research page no longer mounts a second constellation component. Its Web link and the historical `#constellations` address lead to the canonical Web; old shelf/view/arrangement query parameters are retained. Library links remain available in both workspaces.

The constellation citation renderer consumes the graph already loaded by Web: 2,608 entries and 119,731 recorded connections, including the small pairs and self-citations omitted by the former 37,427-edge export. It does not fetch that former export. Graph node order was checked against the edge roster. Author citation and refutation totals are preserved. Citation connections open the existing Web evidence panel; shelf selections open its Scripture comparison and source list, with a return link that restores the selected author. Reader links retain page queries and fragment anchors. Shelf research cards now open their own constellation scope.

Landing changes: Polanus's *Syntagma* Book I replaces the featured Charnock card; Eastern Fathers and English Divines use the requested labels; Reformed, Roman Catholic and Lutheran have separate cards with actual title-page scans, captions and correct catalogue filters. Live catalogue counts replace fixed totals (18,931 works at verification; English Divines 4,644, Reformed 517, Roman Catholic 632, Lutheran 290). Removed unsupported page/translation/first-publication totals. Rewrote the study, devotional, audience and feature-directory copy in plain language and linked the directory to the specific tools.

Files: `custom-faith-port-web.hbs`, `custom-faith-research.hbs`, `custom-the-faith-received.hbs`, `_constellations-panel.hbs`; `faith-constellations.js`, `web.in02.js`, new `faith-web-graph.js`, `faith-web-redirect.js`, `faith-landing-counts.js`; shelf navigation scripts; native/shared CSS and the built faith stylesheet; three title-page images. Other template edits only refresh asset fingerprints. Image provenance is in `LANDING-IMAGE-SOURCES.md`.

Verified in real browsers at 1280px and 390px, light and dark: citation rings and tradition layouts; Most cited and Most contested; Medieval authors and similarity; accessible map index; Thomas Aquinas -> Scripture evidence -> return with selection; Augustine -> Web author dossier; Scotus -> Augustine -> 14,241 available references in the grouped evidence panel; existing Paths tool; legacy Research redirect; Library navigation; live landing counts, loaded book images, Reformed's 517-work filter, and Polanus Book I reader content. No console errors on the tested Web paths. At 390px the page has no horizontal overflow, the active Web navigation item scrolls into view, and the map uses a bounded scrolling container.

Validation: `npm run build` passed all repository checks; graph adapter checked against downloaded current public graph data; JS syntax and `git diff --check` passed. Changes merged into local `local-all` for Ghost preview and pushed to our existing fork branch. No Vercel deployment, production Worker change, or new PR to Ian. The Eastern Fathers card retains its existing typographic plate; licensed PO scans were not republished. Existing source-text transcription issues are outside this UI change; this is not a claim that every individual corpus work has been certified.


## Author-driven layouts, Migne shelf fallbacks and complete reference controls

Owner correction: Ian's layouts must retain the original interactive author index and dossier. Timeline, Rings and By tradition are now layout controls for one citation network. The author index stays beside the map on wide screens; selecting an author updates both the map and the existing full reception/source panel. Switching layouts preserves that author and a reloadable URL. The focused graph shows the same strongest eight incoming and eight outgoing relationships; its global citation/refuter totals do not shrink to the displayed subset. All 16 selected connections are drawn by default. Mobile has an explicit return from the dossier to the selected author's map.

The research-room rosters omitted 1,082 graph entries. An exact catalogue-name match, or the same complete name words in catalogue order, resolves 1,080 to Latin Fathers, one to Greek Fathers, and one to Roman Catholic. Existing graph/room assignments win. The compact frontend fallback is generated by `scripts/build-web-author-shelves.py` from the public works catalogue and graph; no backend or corpus data was changed. The same fallback is prepared in the Vercel source build.

Both source and port now offer Show all authors in bounded connection lists, Open all works / witnesses, and per-work Show all N records. Reference pages default to 25 with no truncation; all-records mode is explicit. Native constellation lists no longer cap at six connections or 200 index entries, and their buttons have proper padding, separate metadata lines and subtle separators. Detached fold toggle events cannot overwrite the current open-state set; pager handlers bind only pager buttons.

Quenstedt's two known witnesses remain separate: 418 scan-witness records and 305 Wittenberg-1685 witness records. The heading says one work in two witnesses, not 723 distinct citations. This is not cross-witness deduplication; published graph totals remain indexed records and that limitation is stated. Witness grouping uses explicit confirmed identities, never title similarity.

Verified: Ghost displayed all 418 and all 305 records simultaneously in their respective open folds; the rebuilt source preview displayed all 418 and exposes both witnesses. Both source and Ghost allow the second witness to open and page. The original blocked disclosure was not reproduced in a fresh source browser session. On Ghost, Augustine selection survived Rings, Jerome selection survived By tradition and Timeline, the all-connections control rendered all 1,067 available Jerome incoming rows, Ausonius displays Latin Fathers, and the full tradition map has no Unclassified group. Desktop 1280px and mobile 390px were checked, including light/dark label contrast, selected map return and no horizontal overflow. Native focused maps preserve full refuter counts. No Web console errors on tested paths.

Source files changed: `tools/prdl_reader_prototype/connection-evidence.js`, its CSS and tests, `web_shell.html`, new `web-author-shelves.json`, and the asset-copy entry in `tools/build_dist.py`. A portable source patch is included in `SOURCE-REFERENCE-CONTROLS.patch` because Davenant's source directory is not a Git checkout. Source build passes the secrets and page gates; 25 evidence tests pass. Theme build passes including the new directed-network regression checks. Local integration is updated. Vercel production is not deployed: the port handoff requires the owner's literal “deploy to prod”. No production Worker changes or PRs to Ian.


## Production deployment confirmed

Owner explicitly approved “deploy to prod”. Deployed through `bash tools/deploy_site.sh` at 2026-09-20T02:18:46+00:00. The script serialized behind another deployment, then passed the build, secrets, page, drift and page-count gates and its protected-file sanity checks.

Deployment `dpl_Bgw4m3VGZHvSG8mpAzEhXb8akc7g` is READY on `https://thefaithreceived.vercel.app`. The script’s embed marker MD5 matched. Additional SHA-256 verification on the production alias matched the tested build:

- `connection-evidence.js`: `e249e9c2c5f8fbefed7e50bfea2e3e2338f6d54ed14404443fb2660ae7e93fac`
- `connection-evidence.css`: `62ef89e4148c2cdabcbd7cb2eb46db2c8aa57bdfc88ceb468255d6b04aee8542`
- `web-author-shelves.json`: `ef3e2e56c60291d0d7ad09b9ca11fab5145958df9a8801c52b8eb67b9d3c4e78`
- `web.html`: `00ac64d4b8ff86d96f98e77b373d92133cd1209885684410f27861c2b774c6a0`

Browser verification on the production alias opened all 418 records in Quenstedt’s scan witness and all 305 in the Wittenberg-1685 witness. Both folds remained open, the heading identified one work in two witnesses without claiming a unique combined count, and no console errors were reported. This supersedes the earlier pending-production note. Localhost remains updated; this action did not publish the Ghost theme to Mere Orthodoxy.


## Collected-volume contents and catalogue return links

Collected editions now show what their volumes contain on All works and the collection-room listings. `faith-collected-contents.js` reads one compact theme asset generated from the public work metadata. All 213 detected collected volumes have a summary; 212 have expandable main-section lists with reader page links. Published catalogue descriptions take precedence (for example, Suárez vol. 1: God one and triune; predestination). Otherwise the preview uses the first substantive outline headings. Work titles remain unchanged. Contents are included in title search, so Heidelberg finds the relevant Luther volumes. Continue reading now includes the volume label and the same contents preview.

The contents builder is `scripts/build-collected-contents.py`. Its inputs are the published works catalogue and read-only per-work `meta.json` files. Introductory/concluding wrappers, standalone furniture labels and duplicate title/page entries do not become main-section previews. The displayed list is labelled as main sections from the reader's contents, with a link to the full reader. One existing source-outline issue is deliberately not papered over: `luther-wa-schriften-55-ii` assigns every entry to page 1028. It has a description grounded in the published headings, but no fabricated section links. Other links preserve the outline's indexed page, which may be a printed contents page rather than the beginning of the treatise's body; no corpus or TEI was rewritten.

All literal library return links, TFR breadcrumbs, reader returns, Ask's configured brand/home destination and fallback destinations now use `/the-faith-received/all-works/?collection=all`. The public landing route remains accessible. Generated document partials and their generator use the same return address. The shared port URL mapper also normalizes dynamically inserted unfiltered home/library links, while preserving reader and filtered URLs.

Verified in the browser at desktop and 390px: Luther's Schriften 1 shows its contents preview and 25 main sections; Suárez vol. 1 shows its subject description and 10 main sections in a bounded pane. Its page-32 link opens the indexed page containing the named treatise heading; Heidelberg search returns the relevant Luther volumes. The reader's visible Library arrow and Ask's identity link were followed to the exact all-works URL. Continue reading shows Suárez's volume label and subject description. Bookmark controls remain on the volume, not every contents entry. No catalogue console errors were reported. The normal viewport was restored.

The theme build and `check-collected-contents.mjs` pass, including section-link encoding, search text, canonical home routes and the unusable-outline fallback. Impeccable's detector reported only existing rules elsewhere in the native stylesheet; the new component adds no reported finding. Source files: the contents module/data/builder/check, room renderer and openers, native stylesheet and built CSS, return-link templates and their generator, and explicit navigation fallbacks. Most template changes are URL or asset-fingerprint updates. Applied to local Ghost and pushed to our fork; no new Vercel deployment or production Ghost deployment in this change.


## Mobile and GitHub follow-up, 2026-09-20

See `GITHUB-MOBILE-CHECK-2026-09-20.md` for the Greek Fathers / Roman Catholic scrolling walkthrough and repository checks. Fixed narrow parallel Latin/English columns on phones, repeated global shelf navigation on filtered pages, generic Works volume ordering, catalogue count context, touch targets and an encoded author name. Removed the tracked local dependency symlink and verified a fresh locked install. Lint and build checks pass. The fork is updated; an upstream integration still requires maintainer review of shared/protected paths listed in that report. No upstream PR or production Ghost deployment was made.
