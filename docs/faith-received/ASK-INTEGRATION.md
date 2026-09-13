# ASK-INTEGRATION — one file, any page, any site (2026-09-13)

Owner (09-13): *"make integration of ask easy, and cohere with the site."* This sheet is the
whole integration contract. The Ask workspace is **one set of files that runs unchanged on
the Vercel site and on MereO**; a page tells it where things live through one object. No fork,
no path edits inside the script.

## 1. The files (all under `docs/faith-received-specs/ask/`, byte-identical to Vercel's `tools/ask_workspace/`)

| File | Role | Load |
|---|---|---|
| `ask-workspace.css` | the workspace, launcher and notices; palette and faces resolve from the host page's tokens (§4) | `<link rel="stylesheet">` |
| `ask-store.js` | `FRChatStore`: IndexedDB conversations + meta (`all/get/put/remove/update/meta/setMeta/id`) | `<script defer>` before the workspace |
| `ask-workspace.js` | the workspace: rail, folders, thread, scope, ⋯ menu, source pane, `window.FRAsk` | `<script defer>` |
| `ask-worker.js` | SharedWorker/Worker that owns the answer stream so a tab change never kills a turn | fetched by the workspace at `assetBase + 'ask-worker.js'` |
| `ask-stream.js` | NDJSON parser for the `/ask` contract | imported by the worker |
| `ask-jobs.js` | Deep research client (`/investigations` op protocol) | imported by the workspace at `assetBase + 'ask-jobs.js'` |
| `ask.html` | the standalone page shell (Vercel's; MereO uses `custom-faith-port-ask.hbs`) | — |

## 2. Configure the host — `window.FRAskConfig`

Set **before** `ask-workspace.js` loads. Every key is optional; defaults are the Vercel site.

```html
<script>
window.FRAskConfig = {
  apiBase:     'https://mo-tfr-ask-dev.mo-podcast-feed.workers.dev/v1', // serves POST {apiBase}/ask and {apiBase}/investigations
  dataBase:    'https://mo-tfr-library.mo-podcast-feed.workers.dev',    // serves /v1/works-index.json, /v1/schools.json, /data/embcat.json
  readPath:    '/the-faith-received/read/',                             // reader page; the workspace appends ?w=&#b<page>-0
  askPath:     '/the-faith-received/ask/',                              // the standalone page (rail + site sections, role=main, not a modal)
  libraryPath: '/the-faith-received/library/',                          // the brand link and "Return to the library"
  assetBase:   '/assets/js/port/',                                      // where ask-worker.js and ask-jobs.js are served
  launcher:    false,                                                   // no floating "Ask" button; the theme mounts its own door
  nav: [['/the-faith-received/library/','Library'],['/the-faith-received/authors/','Authors'],
        ['/the-faith-received/bible/','Scripture'],['/the-faith-received/topics/','Topics'],
        ['/the-faith-received/search/','Search']]                       // shown in the rail on the standalone page; false → none
};
</script>
<link rel="stylesheet" href="/assets/css/port/ask-workspace.css">
<script defer src="/assets/js/port/ask-store.js"></script>
<script defer src="/assets/js/port/ask-workspace.js"></script>
```

Vercel's own values, for reference: `apiBase:'/api'`, `dataBase:'https://0ss8v4l06kodnhp0.public.blob.vercel-storage.com'`, `readPath:'/read'`, `askPath:'/ask'`, `libraryPath:'/'`, `assetBase:'/'`, `launcher:true`.

## 3. Three doors, pick per page

1. **Standalone page** — any page whose path matches `askPath` boots the workspace inline on load (`role="main"`, no `aria-modal`, site sections in the rail). URL state: `?chat=<id>` (resume), `?ask=<q>` / `?q=` (prefill + send), `?view=history` (rail open), `?trad=<shelf>`.
2. **Launcher on any page** — with `launcher:true` a floating **Ask** button opens the workspace as an overlay; ⌘⇧A / Ctrl⇧A does the same. Links to `askPath`, `?m=ask` or `?ask=` are intercepted and open the overlay instead of navigating.
3. **Your own control** — call the door:

```js
FRAsk.open({ q:'Where does Calvin call the mass a sacrilege?', autoSend:true,
             tradition:'Reformed', folder:'Sacraments' });
FRAsk.open({ id:savedId });          // resume
FRAsk.open({ view:'history' });      // the rail
FRAsk.close();  FRAsk.isOpen();
```

`open(opts)`: `id, fresh, q, autoSend, mode('ask'|'deep'), tradition, shelves[], authors[], groups[], works[], passage{text,cite,url,slug,page,row}, contextWork, folder, view`. Events: `window` dispatches `fr-conversations-updated` after every save; the `fr_chats` mirror in `localStorage` (v2, now with `folder`) stays readable by the Desk.

The public **embed widget** (`/embed/ask.js`, an article-page chat card with its own key and origin-pinned CORS) is a fourth, separate surface; it is documented in `runs/ghost_ask_embed.md` and is not changed by this sheet.

## 4. Cohere with the site — tokens the workspace reads

The stylesheet no longer carries its own palette. It resolves, with the Academic Monochrome values as fallbacks:

| Workspace token | reads the host's | fallback light / dark |
|---|---|---|
| `--fra-bg` | `--bg` | `#F0F0ED` / `#1A1A18` |
| `--fra-card` | `--card-bg` | `#FFFFFF` / `#232320` |
| `--fra-fg` | `--fg` | `#1C1C1A` / `#E9E9E5` |
| `--fra-muted` | `--muted` | `#5A5A56` / `#A2A29C` |
| `--fra-border` | `--border` | `#D8D8D3` / `#383836` |
| `--fra-hl` | `--highlight` | `#E7E7E2` / `#2E2E2B` |
| `--fra-ease` | `--ease` | `cubic-bezier(.22,1,.36,1)` |
| body face | `--font-ui` | `'Source Serif Pro', Georgia, serif` |
| brand face (`.fra-brand a`) | `--font-display` | `'EB Garamond', Georgia, serif` |

Define those on `:root` (and under `[data-theme="dark"]`) and the workspace takes the site's look; define none and it looks as it does on Vercel. Theme: `localStorage fr_theme` ∈ light/dark/sepia (sepia renders as light inside the workspace), mirrored to `html[data-theme]`.

## 5. Conversations: archive, delete, folders (what the user can do)

- **Archive / Restore** (⋯ menu). Archived conversations live under the rail's *Archived* toggle.
- **Delete** (⋯ menu → inline confirm, never a browser dialog). A running Deep job is cancelled first. The id is tombstoned in meta `deleted-conversations`, so no legacy import or cross-tab mirror brings it back.
- **Folders** (⋯ menu → *Move to folder…*, existing names offered, free name allowed; *No folder* removes). The rail shows loose conversations, then one collapsible section per folder with a count and a rename pencil (renaming re-files every conversation in it). Collapsed state persists (meta `folders-closed`). Search matches folder names. `FRAsk.open({folder})` files a new conversation directly.
- **Delete all archived** at the foot of the archived view (two clicks; the first arms it with the count).

## 6. Verify (recreate)

```sh
node --test tools/ask_workspace/*.test.cjs                         # 93 pass
python3 tools/build_dist.py && python3 runs/preview_server.py 8917  # local dist
node docs/faith-received-specs/ask/ask-folders.browser.cjs http://127.0.0.1:8917 /tmp/shots
```
Expected log (measured 2026-09-13): folder move → 2 rows under *Grace debate*; header `Grace debate · Whole library`; rename + collapse survive reload; search "freedom" finds the folder's rows; archive → the row leaves the list and appears under *Archived*; delete → gone after reload, tombstone present, legacy `fr_chats` re-import does **not** resurrect it; phone (390 px, dark) rail visible with the site sections.
