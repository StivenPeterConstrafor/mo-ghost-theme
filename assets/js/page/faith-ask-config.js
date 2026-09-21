/* Mere Orthodoxy's settings for the corpus owner's Ask engine.
 *
 * WHY THIS IS A FILE AND NOT AN INLINE SCRIPT. It has to be. This theme's
 * CSP is `script-src 'self'` with NO 'unsafe-inline', so an inline <script>
 * in a template is refused by the browser and never runs, silently. Three
 * fixes for the Ask page shipped inline and not one of them executed; each
 * looked correct in the served HTML, which is exactly how it went unnoticed
 * for a week. Anything a page must set before another script loads goes in
 * a file under assets/ and is loaded with a src.
 *
 * WHY IT EXISTS AT ALL. The owner's 2026-09-13 ask-workspace.js added an
 * integration layer: one file that runs on any host, reading window.FRAskConfig
 * for the handful of things it cannot work out for itself. Before that we
 * patched his file in eleven places to point it at our origins and paths, and
 * every one of those patches had to be re-applied by hand on every re-vendor.
 * Four of them are now config instead, which is four fewer things to lose.
 *
 * ORDER IS LOAD-BEARING. This must be loaded BEFORE ask-workspace.js in every
 * template that loads ask-workspace.js. The engine reads window.FRAskConfig
 * once, at parse time, into a `const CFG`. A config that arrives afterwards is
 * not late, it is ignored: the engine falls back to its Vercel defaults and
 * the whole surface points at someone else's site. There are six such
 * templates; see the list at the bottom of this comment.
 *
 * IT IS PLAIN DATA. No behaviour here. If something needs logic, it belongs in
 * ask-workspace.js behind a `MereO delta` comment, not in this file.
 *
 * Templates that must load this first:
 *   custom-faith-ask-workspace.hbs   (/the-faith-received/ask/ and /ask-workspace/)
 *   custom-faith-port-read.hbs       (/the-faith-received/read/)
 *   custom-faith-port-bible.hbs      (/the-faith-received/bible/)
 *   custom-faith-port-index.hbs
 *   custom-faith-port-desk.hbs       (/the-faith-received/desk/)
 *   custom-faith-port-web.hbs        (/the-faith-received/connections/)
 */
(function () {
  "use strict";

  window.FRAskConfig = {
    /* The Ask worker. CFG.apiBase + '/ask' and + '/investigations' are the two
     * spending routes, and both require a verified Ghost member: the bearer is
     * minted on the page by window.MOAuth and attached in ask-workspace.js
     * (the ASK-SPEC §7 delta), because the SharedWorker that owns the stream
     * has its own global scope and cannot reach MOAuth. The '/v1' belongs here
     * rather than in the engine, which appends only the route name. */
    apiBase: "https://mo-tfr-ask-dev.mo-podcast-feed.workers.dev/v1",

    /* The library worker, as a BARE ORIGIN with no path. The engine appends
     * '/v1/works-index.json' and '/v1/schools.json' itself, so a '/v1' here
     * would double it. */
    dataBase: "https://mo-tfr-library.mo-podcast-feed.workers.dev",

    /* The reader. Trailing slash required: the engine appends '?w=' directly.
     * Our readURL delta also appends '&hl=' so a citation opens the work at
     * the sentence the answer quoted, not merely on the right page. */
    readPath: "/the-faith-received/read/",

    /* The standalone Ask page. The engine turns this into a path test and uses
     * it for three things: whether to render as a full page rather than a
     * dialog, whether to keep ?chat= in the address bar, and whether a link
     * elsewhere on the site should open Ask in place instead of navigating.
     * /the-faith-received/ask-workspace/ is a legacy alias for the same
     * template; it deliberately does NOT match, and faith-ask-open.js opens
     * the workspace by hand there. */
    askPath: "/the-faith-received/ask/",

    /* The brand link in the sidebar, and where the engine goes when it is
     * clicked. The Library is the site root on the owner's domain and lives
     * under /the-faith-received/ on ours, so his default of '/' sent readers
     * to the Mere Orthodoxy homepage. */
    libraryPath: "/the-faith-received/all-works/?collection=all",

    /* Where ask-worker.js and ask-jobs.js are fetched from at runtime. Trailing
     * slash required: the engine appends the bare filename. Neither file is
     * loaded by a script tag, so both must exist at exactly this path and must
     * not be renamed or bundled. */
    assetBase: "/assets/js/port/",

    /* KEEP THE FLOATING ASK BUTTON. We mount our own door on the Ask page
     * itself (faith-ask-open.js opens the workspace there), which is the case
     * his `launcher: false` is written for, but the launcher is the ONLY way
     * into Ask on the five other pages that load this engine: the reader, the
     * Bible, the desk, the atlas and the index. It is also already skinned and
     * positioned by us, in assets/css/faith-ask-workspace.css (.fra-launcher,
     * .fra-in-toolbar) and assets/css/faith-port-reader-skin.css, which parks
     * it in the reader toolbar and hides it on mobile where the thumb bar
     * carries Ask instead. Setting this false would delete that door and strand
     * Ask behind a URL people would have to know. */
    launcher: true,

    /* NO SECOND NAV BAR. The engine can render its own Library/Authors/
     * Scripture/Topics/Search row down the sidebar of the standalone page.
     * Mere Orthodoxy's masthead already does that job, and his bar links to
     * paths that are his, not ours. This is the same reason site-navigation.js
     * is deliberately not loaded in the reader. Skin and bones: his engine,
     * our chrome. */
    nav: false
  };
})();
