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

Do not describe this as complete end-to-end feature certification yet.

- A signed-in localhost member session is still needed for Search's six legacy modes, Compare, Notebooks, Desk and Ask. The owner was asked to finish local sign-in.
- The checked-in Ask-worker deployment configuration sets GHOST_URL to https://mereorthodoxy.com. Its verifier fetches that site's JWKS. Local Ghost issues different identity tokens; end-to-end local paid-service calls need an approved local-auth arrangement, not a removed gate. No worker authentication was weakened or changed in this task.
- The browser viewport override did not change the measured width (it remained 1280); mobile verification is not claimed.
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
