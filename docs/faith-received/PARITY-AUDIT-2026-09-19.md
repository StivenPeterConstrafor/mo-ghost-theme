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
