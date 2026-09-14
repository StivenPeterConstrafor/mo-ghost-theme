/*
 * Open the Ask workspace on /the-faith-received/ask-workspace/.
 *
 * WHY THIS IS A FILE AND NOT AN INLINE SCRIPT. It has to be. This
 * theme's CSP is `script-src 'self' …` with no 'unsafe-inline', so an
 * inline <script> in a template is refused by the browser and never
 * runs. Three fixes for this page shipped inline and none of them ever
 * executed; each looked correct in the served HTML, which is exactly
 * how it went unnoticed. Anything this page needs to do at load goes in
 * a file under assets/ and is loaded with a src.
 *
 * WHY IT OPENS AT ALL. The engine (assets/js/port/ask-workspace.js)
 * opens itself only when the path matches /ask or the URL carries
 * ?ask= / ?m=ask. Ours is /the-faith-received/ask-workspace/, which
 * matches none of them, so it is asked directly.
 *
 * WHY IT RETRIES. The engine publishes window.FRAsk while it parses but
 * finishes setting up asynchronously, so an open() before it is ready
 * can be accepted and then undone, leaving the launcher and nothing
 * else. Rather than model someone else's boot sequence, this opens and
 * then checks: if the workspace is not up a beat later, it asks again.
 * That is right whenever the engine becomes ready. It gives up after
 * about four seconds so a broken engine cannot spin, and the launcher
 * still opens it by hand.
 *
 * Loaded as a page script, so per this theme's script-order rule it
 * runs before site.min.js and must not depend on any site-bundle
 * global. It depends only on window.FRAsk, published by the engine
 * loaded immediately above it.
 */
(function () {
  "use strict";

  let tries = 0;
  const MAX = 20;
  const GAP = 200;

  function options() {
    const o = {};
    try {
      const p = new URLSearchParams(window.location.search);
      const q = (p.get("q") || p.get("ask") || "").slice(0, 2000);
      // `q` lets a link ask outright, which is how a prompt elsewhere on
      // the site or a shared answer arrives already asking.
      if (q) { o.q = q; o.autoSend = true; }
      if (p.get("chat")) o.id = p.get("chat");
      if (p.get("trad")) o.tradition = p.get("trad");
    } catch (e) { /* no query string to read; open empty */ }
    return o;
  }

  function isOpen() {
    return !!(window.FRAsk && window.FRAsk.isOpen && window.FRAsk.isOpen());
  }

  function attempt() {
    if (isOpen()) return;
    if (tries++ >= MAX) return;
    if (window.FRAsk && typeof window.FRAsk.open === "function") {
      try {
        Promise.resolve(window.FRAsk.open(options())).catch(() => {});
      } catch (e) { /* not ready yet; the retry below covers it */ }
    }
    window.setTimeout(attempt, GAP);
  }

  attempt();
})();
