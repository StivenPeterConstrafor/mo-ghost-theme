/*
 * The author pages' lists, in alphabetical order.
 *
 * Ian, 2026-09-23: "there are all these lists (works, authors, etc),
 * they all need to be in alphabetical order." Three lists here were in
 * the port's editorial or catalogue order:
 *
 *   1. The Authors directory opened in "Library selection" order. It now
 *      opens A-Z, filed the library's way (MOTitleOrder.fileAs, in boot):
 *      before 1500 by the name a writer is known by (Augustine at A,
 *      John Chrysostom at J), after by surname (Calvin at C). The port's
 *      own A-Z compared the display name, which put John Calvin at J; its
 *      rows are drawn in batches as the reader scrolls, so they cannot be
 *      re-sorted after drawing. They are sorted as they are handed to the
 *      port's paneList, which is a global function the port looks up at
 *      call time. The other orders (Most works, Most citations, Library
 *      selection) are left exactly as the port made them.
 *
 *   2. An author's works (the room's Works tab) went by kind of work and
 *      then catalogue order. They are by title now, a leading "The" or
 *      "A" ignored, with a numbered set kept in its volume order.
 *
 *   3. The Works directory's works within an author or a volume, the
 *      same way. Volumes themselves (PG 5 before PG 6) stay in number
 *      order: that is where a Migne reader looks.
 *
 * 2 and 3 replace FRResearch.orderedWorks and FRResearch.workOrder, which
 * the port reads off the object each time it sorts. The originals are
 * kept and used for the one thing alphabetical order must not decide:
 * the order of the volumes of one set, and of one series' volumes.
 *
 * Loaded straight after authors.in03.js.
 */
(function () {
  "use strict";

  const T = window.MOTitleOrder;
  const R = window.FRResearch;
  if (!T || !T.compareTitlesAlpha) return;

  // ── 2 and 3: works by title ──────────────────────────────────────
  if (R && typeof R.workOrder === "function" && typeof R.orderWork === "function") {
    const originalOrder = R.workOrder;
    const series = typeof R.seriesRef === "function" ? R.seriesRef : () => null;
    const titleOf = (w) => w.t || w.title || w.originalTitle || w.w || "";

    // The title a multi-volume set files under: its title without the
    // "Vol. 3" tail, so its volumes stay together and in order.
    const setTitle = (w) => String(titleOf(w))
      .replace(/(?:[,.·:;\s]+)?\b(?:vol(?:ume)?s?|tome?|tomus|band|bd|part|pars)\.?\s+(?:\d+|[ivxlcdm]+)\b.*$/i, "")
      .trim();

    // By the set's title; two volumes of one set (the same title once
    // "Vol. 3" is taken off) keep the set's own order. A catalogue group
    // is not enough to go on: Bellarmine's group holds both his
    // Disputations and his Complete Works, which are two titles.
    const alphaOrder = (a, b) => {
      const x = R.orderWork(a);
      const y = R.orderWork(b);
      return T.compareTitlesAlpha(setTitle(x), setTitle(y)) || originalOrder(a, b);
    };

    // Different volumes of a series (PG 5, PG 6) keep number order, so the
    // "by volume" directory reads PG 1 onward; inside one volume, and
    // everywhere else, works are alphabetical.
    R.workOrder = function (a, b) {
      const xr = series(R.orderWork(a).volume);
      const yr = series(R.orderWork(b).volume);
      if (xr && yr && (xr.series !== yr.series || xr.volume !== yr.volume)) return originalOrder(a, b);
      return alphaOrder(a, b);
    };

    // An author's own list: purely alphabetical, one run of titles.
    R.orderedWorks = function (rows, getWork) {
      const get = typeof getWork === "function" ? getWork : (x) => x;
      return rows.slice().sort((p, q) => alphaOrder(get(p), get(q)));
    };
  }

  // ── 1: the Authors directory ─────────────────────────────────────
  const EARLY = { E: 1, L: 1, C: 1, H: 1 }; // patristic to high medieval
  const shownName = (r) => {
    try {
      // The port's display names (a top-level const in authors.in03.js).
      return typeof aName === "function" ? aName(r.a) : r.a;
    } catch (e) {
      return r.a;
    }
  };
  // A volume anthology ("PG 10 (anthology)") is not an author: it files
  // after Z, in volume order, rather than opening the Greek shelf.
  const isAnthology = (r) => /-anthology$/.test(String(r.s || "")) || /\banthology\b/i.test(String(r.a || ""));
  const sortKey = (r) => (isAnthology(r)
    ? `\uffff${T.normalise ? T.normalise(shownName(r)) : shownName(r)}`
    : T.fileAs(shownName(r), Boolean(EARLY[r.e])));

  const portPaneList = window.paneList;
  if (typeof portPaneList === "function") {
    window.paneList = function (box, items, ...rest) {
      const sortSel = document.getElementById("sort");
      const isAuthors = box && box.closest && box.closest(".rx-author-fold") && Array.isArray(items);
      if (isAuthors && sortSel && sortSel.value === "a") {
        const keyed = items.map((r) => [sortKey(r), r]);
        const byKey = typeof Intl !== "undefined" && Intl.Collator
          ? new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare
          : (p, q) => (p < q ? -1 : p > q ? 1 : 0);
        keyed.sort((p, q) => byKey(p[0], q[0]));
        items = keyed.map((k) => k[1]);
      }
      return portPaneList.call(this, box, items, ...rest);
    };
  }

  // Open on A-Z. Once per directory render, and only while the reader has
  // not chosen: the port redraws the directory on each visit to it.
  function defaultToAlpha() {
    const sel = document.getElementById("sort");
    if (!sel || sel.dataset.moAlpha) return;
    sel.dataset.moAlpha = "1";
    const alpha = sel.querySelector("option[value='a']");
    if (alpha) alpha.textContent = "A–Z";
    if (sel.value === "imp") {
      sel.value = "a";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  const page = document.getElementById("page") || document.body;
  new MutationObserver(defaultToAlpha).observe(page, { childList: true, subtree: true });
  defaultToAlpha();
})();
