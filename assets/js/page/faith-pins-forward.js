/*
 * /the-faith-received/pins/ — decide between forwarding and the old view.
 *
 * There were two notebooks. The Research desk has the one that is
 * skinned like the rest of the site and the one the account's own
 * bookmarks are in; this page had the ported one, whose collections
 * live in this browser's localStorage under "fr_collections_v1" and
 * nowhere else. The rail now points Bookmarks at the Research desk, and
 * this URL forwards there.
 *
 * WHY THIS IS NOT A ROUTES RULE. A server cannot read localStorage, and
 * what this file has to decide is exactly whether localStorage is
 * holding something. A 301 would forward the reader with their own
 * saved work still sitting in the browser behind them and nothing on
 * screen saying where it went, which is the one outcome worth writing
 * code to avoid. routes.yaml is also a hand upload in Ghost Admin and
 * is not free.
 *
 * THREE OUTCOMES, and the markup carries all three so that none of them
 * needs a fetch or a repaint:
 *
 *   forward      nothing saved here  -> location.replace into #bookmarks
 *   stranded     collections saved   -> stay, show where they are
 *   collections  ?collections=1      -> the ported notebook, unhidden
 *
 * UNREADABLE COUNTS AS SAVED. If the key is there but will not parse,
 * something of the reader's is in it and this file is not the thing
 * that gets to decide it was worthless. Storage that throws on read is
 * a different case: a browser with storage switched off has nothing to
 * strand, so that forwards.
 *
 * THE SHELL STARTS HIDDEN, in the markup, with the `hidden` attribute
 * rather than a stylesheet, so the ported page never flashes for the
 * reader who is only passing through. It stays in the document either
 * way: pins.in02.js binds half a dozen ids at its top level with no
 * null checks, and an element that is merely hidden still answers
 * querySelector.
 *
 * LOADED BEFORE THE SHELL rather than deferred, so the forward has
 * already fired before pins.in02.js is parsed and the ported engine
 * never starts fetching a work index for a page nobody is going to see.
 * It touches no bundle globals; it does not need any.
 */
(function () {
  "use strict";

  const TARGET = "/the-faith-received/research/#bookmarks";
  const STORE = "fr_collections_v1";

  const wantsLegacy =
    new URLSearchParams(window.location.search || "").get("collections") === "1";

  function holdsCollections() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORE);
    } catch (_) {
      return false; // storage blocked: nothing here to strand
    }
    if (!raw) return false;
    try {
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) return true;
      return saved.some((c) => c && Array.isArray(c.items) && c.items.length > 0);
    } catch (_) {
      return true; // unreadable is not empty
    }
  }

  const view = wantsLegacy ? "collections" : holdsCollections() ? "stranded" : "forward";

  // Published on <html> so a stylesheet or a later script can see which
  // of the three this page turned out to be without repeating the test.
  document.documentElement.setAttribute("data-pins-view", view);

  if (view === "forward") {
    // eslint-disable-next-line no-restricted-syntax -- a literal same-origin path, not a URL from a worker
    window.location.replace(TARGET);
    return;
  }

  function show(selector, on) {
    const nodes = document.querySelectorAll(selector);
    for (let i = 0; i < nodes.length; i++) nodes[i].hidden = !on;
  }

  function reveal() {
    if (view === "collections") {
      show("[data-pins-forward]", false);
      show("[data-pins-legacy-hero]", true);
      show("[data-pins-shell]", true);
      return;
    }
    show("[data-pins-stranded]", true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal);
  } else {
    reveal();
  }
})();
