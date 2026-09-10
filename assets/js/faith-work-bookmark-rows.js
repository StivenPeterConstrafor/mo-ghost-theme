/*
 * The Faith Received — a bookmark on the row.
 *
 * Until now a work could only be bookmarked from inside the reader:
 * assets/js/faith-bookmark.js binds to [data-faith-controls], which
 * exists on the reader page and nowhere else. So the moment a reader is
 * most likely to think "I want to come back to that", scanning a shelf
 * or an author's works, was the one moment they could not act on it.
 *
 * WHAT IT BOOKMARKS. The work, and nothing finer, because a list row
 * knows nothing finer. That is the same record the reader's Save button
 * writes and the same one a section bookmark writes: the mo-kit KV id
 * "tfr:<corpus>:<work>", through assets/js/lib/faith-work-bookmarks.js.
 * A work bookmark and a section bookmark differ only in precision, one
 * with a place under it and one without, so bookmarking here and then
 * bookmarking a section inside the same work cannot produce two
 * competing records. Nothing in this file touches the place store.
 *
 * ONE COMPONENT, FOUR PAGES. They turned out to share a row: browse
 * (static <ul class="blist"> in custom-faith-browse.hbs), the reading
 * rooms and the centuries page (the same <ul class="blist"> built by
 * assets/js/faith-room.js, which both templates load), and the author
 * page (<ol class="fa-works"> in assets/js/faith-author.js). All four
 * are <li> with one <a> in them, so all four are decorated by the same
 * rule and none of their render functions had to be touched.
 *
 * HOW IT FINDS A ROW. Any <a> inside an opted-in root whose href is a
 * reader URL carrying ?w=. Opt-in is [data-fr-bookmark-rows] on the
 * container, never the whole document: the same markup is used for
 * navigation elsewhere, and a bookmark pennant on a table of contents
 * inside the reader would be a second, quieter way to do what the
 * button at the foot of the section already does.
 *
 * HOW IT SURVIVES A RE-RENDER. A MutationObserver on each root. Three
 * of these four pages rebuild their whole list on a filter keystroke, a
 * page change, a letter, or a scope switch, by assigning innerHTML; a
 * one-shot pass would have decorated the first page of results and
 * nothing after it. Decorating is idempotent (a row is marked
 * data-frb) and cheap, so the observer simply re-runs the pass.
 *
 * DENSITY. These lists run to fifty rows a page in three columns. The
 * pennant is invisible until the row is hovered or the button focused,
 * and always visible once the work is bookmarked, so the only ink added
 * to a list at rest is on the works the reader has actually saved.
 * Where there is no hover to wait for (touch) it is always shown, quiet.
 */
(function () {
  "use strict";

  const roots = document.querySelectorAll("[data-fr-bookmark-rows]");
  if (!roots.length) return;

  const BM = window.MOFaithBookmarks;
  if (!BM) return;

  const READER_PATH = "/the-faith-received/reader/";

  // The pennant, the same shape the section Bookmark button wears in
  // the reader (iconBookmark in assets/js/faith-received.js).
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true" focusable="false">' +
    '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-5-7 5V4a1 1 0 0 1 1-1z"/></svg>';

  // The work a row points at, or null. Read from the href rather than
  // from a data attribute, because the href is the one thing every one
  // of these four pages already gets right: it comes from MOCorpora's
  // normalize(), which builds it by the same rule as readerUrlFor() in
  // the library worker.
  function workOf(a) {
    const raw = a.getAttribute("href") || "";
    // Through the sanitizer first. These hrefs are built from fetched
    // catalogue data, and a row is the one place on these pages where
    // stored data becomes a link.
    const safe = window.MOSafeHref ? window.MOSafeHref.sanitize(raw) : raw;
    if (!safe) return null;
    let u = null;
    try { u = new URL(safe, window.location.origin); } catch (_) { return null; }
    if (u.pathname !== READER_PATH) return null;
    const work = u.searchParams.get("w");
    if (!work) return null;
    return { corpus: u.searchParams.get("c") || "tfr", work };
  }

  const buttons = new Map();

  function paint(btn, on) {
    // Three states. `null` is "not read back yet", and it must not look
    // like "not bookmarked": a pennant that starts empty and fills a
    // second later reads as a bookmark that nearly got lost.
    const known = on !== null && on !== undefined;
    btn.setAttribute("aria-pressed", on === true ? "true" : "false");
    btn.classList.toggle("is-on", on === true);
    btn.classList.toggle("is-unknown", !known);
    const title = btn.getAttribute("data-frb-title") || "this work";
    btn.setAttribute(
      "aria-label",
      on === true ? `Remove ${title} from your bookmarks` : `Bookmark ${title}`
    );
  }

  function decorate(a) {
    const li = a.parentElement;
    if (!li || li.tagName !== "LI") return;
    if (li.getAttribute("data-frb") === "1") return;
    const where = workOf(a);
    if (!where) return;
    const id = BM.idFor(where.corpus, where.work);
    if (!id) return;
    li.setAttribute("data-frb", "1");
    li.classList.add("frb-row");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "frb-mark";
    // Fixed markup, no interpolation. The work's title is the row's own
    // text and goes in through an attribute, not into the SVG string.
    btn.innerHTML = ICON;
    // The row's TITLE, not the row's text. All four pages put the title
    // in its own span with the author and date in siblings beside it,
    // and the whole textContent runs them together with no separator
    // ("The Apostles' CreedThe whole church"), which is what a screen
    // reader would then read out as the name of the work.
    const titleEl = a.querySelector(".brow-t, .fa-work-t");
    const name = ((titleEl || a).textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (name) btn.setAttribute("data-frb-title", name);
    btn.setAttribute("data-frb-id", id);
    paint(btn, BM.has(id));

    if (!buttons.has(id)) buttons.set(id, []);
    buttons.get(id).push(btn);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!BM.available()) {
        // eslint-disable-next-line no-restricted-syntax -- same-origin path literal
        window.location.href = "/membership/";
        return;
      }
      if (btn.disabled) return;
      btn.disabled = true;
      // Optimistic inside the store, which also puts it back on a
      // failure and tells every button holding the same id.
      BM.toggle(id)
        .catch(() => { /* the store already reverted and repainted */ })
        .then(() => { btn.disabled = false; });
    });

    li.appendChild(btn);
  }

  function pass() {
    roots.forEach((root) => {
      root.querySelectorAll("li > a[href]").forEach(decorate);
    });
  }

  // One button per id is the common case; a work can legitimately
  // appear twice on the browse page (the same classic under two
  // headings), and both have to agree.
  BM.subscribe((id, on) => {
    (buttons.get(id) || []).forEach((btn) => paint(btn, on));
  });

  function repaintAll() {
    buttons.forEach((list, id) => {
      const on = BM.has(id);
      list.forEach((btn) => paint(btn, on));
    });
  }

  // A pennant hidden until hover is unreachable on a device with no
  // hover, and `@media (hover: none)` in the stylesheet covers the
  // phones and tablets that say so. It does not cover a hybrid laptop,
  // which answers `hover: hover` correctly and whose owner still
  // reaches for the screen. So the first touch the list actually
  // receives says it again, from behaviour rather than from a
  // declaration. Once: this is a fact about the device, not about the
  // gesture.
  function touched() {
    roots.forEach((root) => root.classList.add("frb-rows-touch"));
  }
  document.addEventListener("touchstart", touched, { passive: true, once: true });

  pass();
  BM.ready().then(repaintAll).catch(() => {
    // The list could not be read. Every pennant stays in its "not
    // known" state rather than claiming nothing is bookmarked.
  });

  // Re-decorate after any re-render. Rows are removed wholesale by
  // innerHTML, so the stale entries in `buttons` are dropped here too;
  // without that, a reader who filtered a room forty times would leave
  // forty detached buttons behind for the store to repaint.
  const observer = new MutationObserver(() => {
    buttons.forEach((list, id) => {
      const live = list.filter((btn) => btn.isConnected);
      if (live.length) buttons.set(id, live); else buttons.delete(id);
    });
    pass();
    repaintAll();
  });
  roots.forEach((root) => observer.observe(root, { childList: true, subtree: true }));
})();
