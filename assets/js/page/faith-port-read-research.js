/* The Research rail's Work tab: name the work, and make its shortcuts work.
 *
 * The panel restored on 2026-09-17 is the corpus site's own read.html markup
 * and read-tools.js is its wiring, but the wiring stops short of this block.
 * Grepping every script the page loads, nothing ever wrote #nbWorkTitle or
 * #nbWorkAuthor and nothing bound #nbFindInWork, #nbWorkAsk or #nbWorkAbout.
 * So the tab opened with a 60px hole where the work's name should be and four
 * buttons that did nothing at all when pressed.
 *
 * Every one of them is a shortcut to something this page already does, so this
 * routes rather than implements: the tab strip's own buttons, the Passage tab's
 * "Ask about this book", and the toolbar's ⓘ About. Routing through the real
 * controls rather than reaching into read-tools.js keeps one implementation of
 * each action — his — and leaves nothing here to drift out of step with it.
 *
 * "Find related works" is NOT wired, because there is nothing to wire it to:
 * the feature does not exist anywhere on this page. It is hidden in the
 * template with its Search-tab twin instead of being given a plausible-looking
 * destination.
 *
 * The title is read from the toolbar rather than from the work record, because
 * the record is not ours to reach: read-tools.js keeps DATA in its own closure.
 * The toolbar is the same text, it is already on screen, and it is observed
 * rather than read once because the reader hydrates the work after this runs.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  if (!$("notebook") || !$("nbWorkPanel")) return;

  // ── The rail names its subject ──────────────────────────────────────────
  const title = $("nbWorkTitle");
  const byline = $("nbWorkAuthor");
  const head = $("h1");
  const author = $("reader-author");

  function nameTheWork() {
    const t = (head ? head.textContent : "").trim();
    // The toolbar's placeholder is not a title. An empty node collapses;
    // "Loading…" sitting in the display face does not.
    if (title) title.textContent = t === "Loading…" ? "" : t;
    if (byline) byline.textContent = (author ? author.textContent : "").trim();
    // "About [work title]", not "Edition details" (Ian, 2026-09-23).
    const about = $("nbWorkAbout");
    if (about) about.textContent = t && t !== "Loading…" ? `About ${t}` : "About this work";
  }

  if (title || byline) {
    nameTheWork();
    for (const node of [head, author]) {
      if (!node) continue;
      new MutationObserver(nameTheWork).observe(node, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
  }

  // ── The shortcuts ───────────────────────────────────────────────────────
  // .click() and not .dispatchEvent: the port binds these as onclick handlers,
  // and a hidden tabpanel's button still fires one.
  const press = (id) => {
    const el = $(id);
    if (el) el.click();
  };

  const wire = (id, run) => {
    const el = $(id);
    if (el) el.addEventListener("click", run);
  };

  wire("nbFindInWork", () => {
    press("nbWorkSearchTab");
    const box = $("nbWorkSearchQuery");
    if (box) box.focus();
  });

  wire("nbWorkAsk", () => press("nbAskBook"));

  // About is a modal over the reading pane, and the rail is a full screen
  // below 1100px, so the rail has to leave first or the dialog opens behind
  // it. This is what the port's own `about:` callback does.
  wire("nbWorkAbout", () => {
    press("nbClose");
    press("rdAbout");
  });
})();
