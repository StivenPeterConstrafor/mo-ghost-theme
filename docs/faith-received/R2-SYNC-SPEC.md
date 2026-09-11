# The Faith Received — how the library reaches R2, and how MereO updates from it

Two stores hold the same library. **Vercel Blob** (`https://0ss8v4l06kodnhp0.public.blob.vercel-storage.com`) is the Vercel site's store. **Cloudflare R2 bucket `mo-tfr`** (the worker binding `NEW_LIBRARY`) is MereO's store; the library worker `mo-tfr-library.mo-podcast-feed.workers.dev` serves it under `/v1/*` (and the ask-dev worker adds a CORS-open `GET /v1/*` fallback on the same bucket). The older bucket `mo-tfr-library` (binding `LIBRARY`) is Ian's lighter store whose catalogue is the 21 August state: never read freshness from it. Standing laws: **three-store rule** (every artifact goes to Blob + R2 `mo-tfr` + Upstash and is proven by read-back, 09-10) and **R2 always follows live** (08-20).

---

## 1. Layout on both stores (identical paths under `/v1`)

| Path | Content |
|---|---|
| `v1/works-index.json` | the catalogue (see LANDING-PAGE-SPEC §1.1). On R2 this is the PUBLIC variant: identical rows except the `westminster-assembly-minutes-vol-1` row is absent (19,447 vs 19,448). |
| `v1/works/<slug>/meta.json` | per-work metadata (READER-SPEC §2) |
| `v1/works/<slug>/tei.la.xml`, `tei.en.xml` | the two lanes of an in-slug TEI work |
| `v1/works/<slug>/work.json`, `pages/NNNN.json` | shard path for non-TEI works |
| `v1/works/<slug>/p/<pb>.webp` | facsimile leaves (`img_base` + page number) |
| `v1/tei/<ns>/<id>.xml` (R2) = `tei/<ns>/<id>.xml` (Blob, NOT under v1) | canon TEI of the Migne/PO corpora (pld, pg, po); TOCs at `v1/<ns>toc/<id>.json` on both |
| `v1/titles_en.json`, `blurbs.json`, `langs.json`, `workgroups.json`, `editions.json`, `author_aliases.json`, `confessions-index.json` | landing sidecars |
| `v1/mine/**` (units, work shards, shelf, topic rooms, constellations, `pld_topics`, `pld_topic/`, `pld_subjects/`, `pg_subject/`), `v1/reception/**`, `v1/graph/**`, `v1/topics.json`, `v1/bible/**`, `v1/glossary2/**`, `v1/works-dir/**`, `v1/dtc/**` | the derived research layer |
| `v1/search/pagefind/**` | the Pagefind index (`manifest.json` lists buckets; fragments are binary) |
| `archive/works/<slug>/<YYYYMMDD-HHMMSS>/` (R2 only) | the previous copy of every work that was re-synced — nothing on R2 is overwritten without a kept copy |

Westminster minutes are the one deliberate divergence: R2 carries the **public variant** (OUP notes, italic summaries, cross-references and calendar fields stripped; vol-1 absent). Every other object is byte-identical on both stores.

---

## 2. How things get from the local stage to Blob and to R2

The local stage is `Davenant/out/blob_stage/v1/…` (a working copy). Publishing a work runs, in this order, with a proof at each step:

1. **Facsimile leaves first** — `node tools/blob_upload/upload_v2.mjs out/blob_stage --prefix v1/works/<slug>/p` (one `--prefix` per call; uploaded + skipped must equal the leaf count). A `meta.json` with `img_base` must never go live before its leaves (launch gate).
2. **Lanes, meta, shards** — `python3 runs/lonecue/publish_parallel.py <slugs.json> <tag> <label>`: uploads `tei.*.xml`, `meta.json`, `pages/*.json`, rebuilds the reader shards (`bontempi_shards.py` bumps `tei_v`), and proves every file by md5 of the live object against the local file (`PUBLISHED <slug>` / `FAIL`).
3. **Works-index** — only after a drift gate: the live index is downloaded and diffed against the local one; the diff set must be a subset of the rows this job changed, otherwise STOP (an external full export once replaced the index with a 19,380-row snapshot). Then `upload_v2 --prefix v1/works-index.json` and an md5 read-back.
4. **R2 works** — `python3 tools/r2_works_sync.py --apply --slugs a,b,c`: for each slug whose `tei_v` differs from the ledger `runs/r2_works_sync.json`, server-side copies the current R2 copy to `archive/works/<slug>/<stamp>/`, then syncs the local work directory to `mo-tfr/v1/works/<slug>/` (excludes `*.bak`, `*.pre-*`; follows the shard symlinks). Read-back proof: `rclone cat` md5 of `meta.json`, `tei.en.xml`, `tei.la.xml` against local.
5. **R2 works-index** — the PUBLIC variant is written from the local index with the vol-1 row removed, read back and md5-compared. Ledger line in `runs/r2_sync.jsonl`.
6. **Derived layer** (after a re-mine/re-embed): every changed directory is copied **local → R2 with `rclone copy --checksum`** and a random md5 read-back; then `rclone lsl` of the binary-bearing prefixes (`v1/reception`, `v1/graph`, `v1/search/pagefind`) must show **no zero-byte objects**. Never mirror binaries through rclone's HTTP backend (`srchttp:` → Blob): it wrote empty bodies for `.pf_fragment`/`.pf_index` and `.json.gz` once (09-10). Text mirrored that way was fine; still prefer local → R2.
7. **Canon TEI** — `python3 tools/ingest_v2/r2_sync.py tei`: enumerates the pld/pg/po ids from the sister sites' `data/nav.json`, stages `tei/<ns>/<id>.xml` and `v1/<ns>toc/<id>.json` from Blob into a temp tree laid out as `v1/tei/<ns>/…`, then ONE local → R2 copy (rclone `--files-from` cannot shift path prefixes — a silent no-op).
8. **Search** — `tools/build_search_corpus.py` writes buckets into `out/blob_stage/v1/search/pagefind/<dir>`; push per directory to Blob, then `rclone sync <dir> mo-tfr/v1/search/pagefind/<dir>` per directory, and read-back of the manifest and a fragment.

Other `r2_sync.py` modes: `works` (mirror the LIVE site → R2 wholesale, `--dry` first), `scans` (stream WebPs Blob → R2, per-work resumable, skipped when the R2 leaf count already equals `n_pages`), `new` (push only works whose `tei_v`/mtime moved since `runs/r2_sync_state.json`), `status`.

Credentials: `Davenant/.env` (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET`), rclone remotes `mor2:` (mo-tfr) and `motfr:` (mo-tfr-library; no ListBuckets permission — always name the bucket). Keys never leave the machine and never appear in logs.

---

## 3. How MereO updates from R2 (what Ian's side does)

MereO reads R2 live; nothing needs to be "pulled". To pick up a change:
1. **Catalogue**: the worker serves `v1/works-index.json` straight from `mo-tfr`. Browsers cache it up to a day (max-age 86400), so pages request it with the build buster `?v=<FR_VER>`; a theme deploy (new `FR_VER`) or a hard reload shows the new rows. If the worker itself caches, purge `v1/works-index.json` after a catalogue push.
2. **A work**: `v1/works/<slug>/meta.json` (`tei_v`) + the lanes; the reader requests lanes with `?v=<tei_v>` so a republished work is fetched fresh once its meta is seen.
3. **Titles and volume lines**: `v1/titles_en.json` and the row's `volume` (daily buster on titles/blurbs).
4. **Derived layer**: `v1/mine/**`, `v1/reception/**`, `v1/graph/**`, `v1/topics.json` are read on demand; no build step on Ian's side.
5. **Search**: the Pagefind manifest is read at load; new buckets appear when `manifest.json` lists them.
6. **Canon TEI for previews and the Migne index**: `v1/tei/<ns>/<id>.xml` on the worker (Blob keeps it at `tei/<ns>/…` — the porter and the index code use the `/v1/tei/` form on MereO).


### 3.1 Corpus data changes you pick up automatically (log)

- **2026-09-11 — English-lane untranslated Latin heads fixed corpus-wide.** 4,337 heading lines in 472 works whose English lane still carried the Latin head (e.g. Voetius, *Politica ecclesiastica* vol. 2 p. 16 "III. Quæst. An Conjugium…") were translated (deterministic formulaic substitutions, a small model for content heads; gates include Greek byte-preservation; note numbers, page pointers and parentheticals re-attached). `tei.en.xml` changed for those works and each work's `tei_v` was bumped, so the reader refetches the lane on next open; pushed to Blob and both R2 buckets with md5 read-backs. Tool `tools/headfix_en.py`, ledger `runs/headfix_ledger.jsonl` (one line per fixed head), snapshots `tei.en.xml.pre-headfix.bak.gz` per work. Nothing to do on MereO beyond §3 (2). A residue of 504 lines belongs to other defect classes (lowercase fragments, English in both lanes, hyphen shards, citation apparatus) and was left as is.

What Ian must NOT do: derive anything from `mo-tfr-library`; write to `mo-tfr` (it is written only by the Davenant publish chain); remove the archive prefix; expect the Westminster vol-1 work or its full-text minutes on R2.

---

## 4. Verifying identity (Blob vs R2)

- In-slug TEI works (every `has_tei` work that is not pld/pg/po): download `tei.la.xml` and `tei.en.xml` from BOTH stores and compare md5; expect identical except the five Westminster volumes (public variant) — see `TEI-IDENTITY-REPORT-2026-09-11.md`.
- Canon TEI (pld/pg/po): inventory R2 `v1/tei/<ns>` with `rclone lsl`, HEAD every Blob `tei/<ns>/<id>.xml` and compare `Content-Length`, and md5-compare a random sample by full download.
- Works-index: md5 of Blob vs local must match; R2's public variant equals local minus the vol-1 row.
- Any layer directory: `rclone check --one-way --checksum <local> mor2:mo-tfr/<prefix>` (use `--files-from` with `--no-traverse` for large prefixes — listing `v1/mine/work` (19k objects) takes more than 20 minutes).
