# The Faith Received — local preview & contribution runbook

How to see theme changes live against a real Ghost before opening a PR. Written so any
agent or person can pick this up cold. Machine layout is speter's Mac; adjust paths.

## The pieces (already set up)

| What | Where |
|---|---|
| Local Ghost 6.63 (dev mode, SQLite) | `~/tfr_ghost/tfr` — serves **http://localhost:2368** |
| Theme working copy | `~/mo-ghost-theme` — `origin` = fork `StivenPeterConstrafor/mo-ghost-theme`, `upstream` = canonical `cvs4bz49sb-oss/mo-ghost-theme` |
| Theme → Ghost link | symlink `~/tfr_ghost/tfr/content/themes/mere-orthodoxy → ~/mo-ghost-theme` |
| Routes | `routes.yaml` copied to `~/tfr_ghost/tfr/content/settings/routes.yaml` (local Ghost reads it at boot) |
| Backend working copy | `~/mo-workers` — `origin` = fork `StivenPeterConstrafor/mo-workers`, `upstream` = `cvs4bz49sb-oss/mo-workers` (private) |

The TFR pages fetch **live data** in the browser — the Vercel Blob store and the deployed
Cloudflare Workers (`mo-tfr-library.…workers.dev`) — so local preview shows real content
with zero local data setup.

### What data works on localhost (and why)

The library worker's CORS allowlist (`mo-workers/tfr-library/worker.js`,
`ALLOWED_ORIGINS`) includes `http://localhost:2368`, so a local Ghost on that exact
origin reads everything the production site reads — reader, browse, English Editions,
scripture indexes, reception. If TFR pages render empty locally, check that first:
`curl -s -D - -o /dev/null -H "Origin: http://localhost:2368"
https://mo-tfr-library.mo-podcast-feed.workers.dev/v1/works-index.json` must return an
`access-control-allow-origin` header. No header means the deployed worker predates the
allowlist entry (or Ghost is serving on a different port — the origin match is exact).

Two routes stay dark locally by design: `/v1/ask` and `/v1/vsearch` require a signed-in
paid member's bearer token, and a localhost Ghost has its own member system whose tokens
don't verify against production. Everything else needs no auth.

## One-time (human only — agents cannot do these)

1. Open http://localhost:2368/ghost and create the local admin account.
2. Settings → Design → Change theme → **mere-orthodoxy** → activate.
   Until this is done, `/the-faith-received/` returns 400 (routes point at templates the
   default theme lacks).

## The daily loop

```bash
cd ~/mo-ghost-theme
git fetch upstream && git merge --ff-only upstream/main   # start current
git checkout -b my-change
# …edit…
```

- **`.hbs` / partials**: refresh the browser — dev-mode Ghost re-reads templates.
  If a change stubbornly doesn't show: `cd ~/tfr_ghost/tfr && ghost restart`.
- **Any CSS or bundled JS** (`assets/css/faith-received.css`, `assets/js/faith-*.js`):
  run **`npm run build`** and refresh — and **commit the built files**. The deploy does
  not compile; CI fails the PR if built files are missing.
- **`routes.yaml` change**: `cp routes.yaml ~/tfr_ghost/tfr/content/settings/ && (cd ~/tfr_ghost/tfr && ghost restart)`.
  (On prod, routes go up via Ghost Admin → Labs → Routes upload — routes are site config,
  not part of theme deploys.)

## What you may touch (CI-enforced)

`custom-faith-*.hbs`, `partials/faith-received/`, `assets/js/faith-*.js`,
`assets/data/faith-received/`, `assets/css/faith-received.css` + its built file,
the TFR build scripts, `docs/faith-received/`.
**Never `assets/js/faith-corpora.js`.** Anything else fails the automated check.

## Submitting

```bash
git push origin my-change
gh pr create -R cvs4bz49sb-oss/mo-ghost-theme --head StivenPeterConstrafor:my-change \
  --title "…" --body "…"
```

Merging the **theme** auto-deploys (GitHub Action on the canonical repo).

## Backend (mo-workers)

Same fork/branch/PR flow from `~/mo-workers`. Editable: anything under `tfr-library/`
**except** `wrangler.toml`, `worker.js`, `lib/budget.js` (bindings, member gate, spend
caps). Merging the backend does **not** deploy — Ian deploys after merge; say so in the
PR if something needs to go out quickly.

## Ghost service management

```bash
cd ~/tfr_ghost/tfr
ghost start | stop | restart | log
```

Known trap: `DatabaseError … ERR_DLOPEN_FAILED … NODE_MODULE_VERSION` on start means
better-sqlite3 was compiled under a different Node than ghost-cli runs. Fix:

```bash
cd ~/tfr_ghost/tfr/versions/<ver>/node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run install    # rebuilds the native module for the running Node
```
