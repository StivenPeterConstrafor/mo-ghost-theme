/*
 * "Show all 508 authors": a way out of a shelf that only ever showed 160
 * of them.
 *
 * Ian, 2026-09-25, looking at the Authors directory: "make a Show All
 * button that takes you to the page with all of them."
 *
 * WHAT WAS WRONG. A shelf's authors are drawn by the port's paneList in
 * chunks of 80, and the next chunk is asked for by an IntersectionObserver
 * whose ROOT IS THE LIST BOX ITSELF. That works when the box is its own
 * scroller, which is how the port has it. It is not how we have it: our
 * house rule is that in-page content never scrolls in its own box, so the
 * override at the end of faith-received.css takes the scrolling off
 * `.rx-pane`. With nothing to scroll, the sentinel is revealed twice and
 * then never again, and Latin Fathers stopped at 160 of its 508 with no
 * control of any kind to reach the rest. The port even ships a "Show all"
 * button for this, but paint() hides it in both branches, so it has never
 * been seen.
 *
 * WHAT THIS DOES. Two things, and it leaves the port's own button alone
 * rather than fighting paint() over an attribute it owns every redraw:
 *
 *   1. In the directory, an open shelf that is showing fewer authors than
 *      it has gets a link reading "Show all 508 authors", pointing at that
 *      shelf's own address.
 *   2. At that address (?sh=<code>&all=1) the page becomes that one shelf:
 *      the other eight are hidden, the shelf is open, and paneList is
 *      handed a chunk big enough to draw every author at once, so nothing
 *      depends on an observer that cannot fire.
 *
 * WHY THE FILTERS GO AWAY ON THE SHELF PAGE. The port's search and era
 * filters run across all nine shelves and open the ones that match. Here
 * eight of them are hidden by CSS, which the port cannot see, so a search
 * would look like it had found nothing. A complete list on one page is
 * findable with the browser's own Find, and "All shelves" goes back to
 * where searching works.
 *
 * WHY A QUERY STRING AND NOT A ROUTE. routes.yaml can only be uploaded by
 * a staff account, so a new address is not something this can rely on.
 * ?sh= already existed: the port reads it to open a shelf.
 */
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const SHELF = params.get("sh") || "";
  const WHOLE = Boolean(SHELF) && params.get("all") === "1";

  const fmt = (n) => Number(n).toLocaleString("en-US");
  const shelfHref = (sh) => `${window.location.pathname}?sh=${encodeURIComponent(sh)}&all=1`;

  /* paneList is a global the port looks up at call time, which is how
     faith-author-order.js already reaches it. Two jobs here: remember how
     many rows a box was ASKED to draw, because the DOM only shows how many
     it got, and on the shelf page draw them all in one chunk. */
  const portPaneList = window.paneList;
  if (typeof portPaneList === "function") {
    window.paneList = function (box, items, render, chunk) {
      const isShelf = box && box.closest && box.closest(".rx-author-fold") && Array.isArray(items);
      if (isShelf) {
        try { box.dataset.moPaneTotal = String(items.length); } catch (e) { /* not fatal */ }
        if (WHOLE && items.length) chunk = items.length;
      }
      return portPaneList.call(this, box, items, render, chunk);
    };
  }

  const dir = () => document.getElementById("dir");

  /* THE LINK. Rebuilt from the current state on every mutation rather than
     held onto, because paint() replaces the list wholesale. Nothing is
     touched unless it differs, so this cannot chase its own changes. */
  function sync() {
    const folds = document.querySelectorAll(".rx-author-fold");
    if (!folds.length) return;

    folds.forEach((fold) => {
      const sh = fold.dataset.sh || "";
      const body = fold.querySelector(".rx-fold-body");
      const list = fold.querySelector(".rx-directory");
      if (!body || !list) return;

      const total = Number(list.dataset.moPaneTotal || 0);
      const shown = list.querySelectorAll(".rx-author-row").length;
      const want = !WHOLE && fold.open && total > 0 && shown < total;
      let link = body.querySelector(".mo-shelf-all");

      if (!want) {
        if (link) link.remove();
        return;
      }
      if (!link) {
        link = document.createElement("a");
        link.className = "fr-btn mo-shelf-all";
        body.appendChild(link);
      }
      const label = `Show all ${fmt(total)} authors`;
      if (link.textContent !== label) link.textContent = label;
      const href = shelfHref(sh);
      if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    });
  }

  /* THE SHELF PAGE. The marker goes on #dir and the class on the one fold;
     the hiding is done in CSS, because paint() assigns `hidden` on every
     shelf every redraw and would undo anything set here. */
  function scope() {
    const host = dir();
    if (!host || !WHOLE) return;
    const fold = host.querySelector(`.rx-author-fold[data-sh="${SHELF}"]`);
    if (!fold) return;

    if (host.dataset.moShelf !== SHELF) host.dataset.moShelf = SHELF;
    if (!fold.classList.contains("mo-shelf-on")) fold.classList.add("mo-shelf-on");
    if (!fold.open) fold.open = true;
    document.body.classList.add("mo-shelf-page");

    if (!document.querySelector(".mo-shelf-head")) {
      const name = fold.querySelector("summary strong");
      const head = document.createElement("div");
      head.className = "mo-shelf-head";
      const h = document.createElement("h2");
      h.textContent = name ? name.textContent : "This shelf";
      const back = document.createElement("a");
      back.className = "rx-text-link mo-shelf-back";
      back.href = window.location.pathname;
      back.textContent = "All shelves";
      head.appendChild(h);
      head.appendChild(back);
      host.parentNode.insertBefore(head, host);
    }
  }

  function run() {
    scope();
    sync();
  }

  const page = document.getElementById("page") || document.body;
  new MutationObserver(run).observe(page, { childList: true, subtree: true });
  document.addEventListener("toggle", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("rx-author-fold")) run();
  }, true);
  run();
})();
