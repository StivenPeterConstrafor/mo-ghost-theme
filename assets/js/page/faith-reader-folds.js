/*
 * Reader: apparatus sections fold.
 *
 * Ian, 2026-09-21, looking at a column of editorial notes: "I don't care
 * about this. I want to collapse it and move on."
 *
 * The editorial notes are the EDITOR'S apparatus, not the work. On a
 * Migne column they can run longer than the text they annotate, and a
 * reader who came for Anselm meets a page of manuscript collation
 * first. The heading stays, so nothing is hidden from someone who wants
 * it; the body folds.
 *
 * CLOSED BY DEFAULT, and that is the point rather than a default chosen
 * carelessly. A fold that starts open makes the reader do the work
 * every time, on every column, which is the complaint. The heading says
 * what is inside and one press opens it, and once opened it STAYS open
 * for that reader — see the store below.
 *
 * WHAT THIS DOES NOT DO YET. Chapters and books do not fold, because on
 * this reader they are not marked as sections: a chapter head is a
 * `.row.prow` carrying a Latin cell and an English cell, indistinguish-
 * able in the DOM from the paragraph rows under it, and a logical
 * section runs across several `.folio` page shells rather than living
 * inside one. Folding those means grouping rows across folio boundaries
 * and keeping citations, scan-sync and the outline's "show current" all
 * pointing at the right place. That is a real piece of work and it is
 * not this one. Anything that wants folding can opt in meanwhile by
 * carrying `data-fr-fold` with a heading as its first child.
 *
 * Re-run on every render: the reader replaces #reading wholesale on a
 * page turn, so a one-shot pass would fold the first column a reader
 * saw and nothing afterwards.
 *
 * Page-template script: runs BEFORE site.min.js, so it uses no bundle
 * globals. It needs none.
 */
(function () {
  "use strict";

  const SELECTOR = "section.pld-editorial, [data-fr-fold]";
  const KEY = "mo_tfr_apparatus_open";

  /* One switch for the whole reader rather than one per column. A reader
     who opens the notes on column 359 has said what they want; asking
     again on 362, and on every column after it, is the same nuisance in
     a smaller size. */
  function wantsOpen() {
    try { return window.localStorage.getItem(KEY) === "1"; }
    catch (_) { return false; }
  }
  function remember(open) {
    try { window.localStorage.setItem(KEY, open ? "1" : "0"); }
    catch (_) { /* private mode: the fold still works, it just forgets */ }
  }

  function fold(section) {
    if (section.dataset.frFolded === "1") return;
    const head = section.firstElementChild;
    if (!head || !/^H[1-6]$/.test(head.tagName)) return;

    // Everything after the heading becomes one wrapper, so the fold is
    // a single element to hide rather than a list of siblings to track.
    const body = document.createElement("div");
    body.className = "fr-fold-body";
    while (head.nextSibling) body.appendChild(head.nextSibling);
    section.appendChild(body);

    // The heading itself is not the button: a heading is how a screen
    // reader finds this section, and wrapping it in a <button> would
    // take that away. The button goes inside it.
    const label = document.createElement("button");
    label.type = "button";
    label.className = "fr-fold-toggle";
    while (head.firstChild) label.appendChild(head.firstChild);
    const caret = document.createElement("span");
    caret.className = "fr-fold-caret";
    caret.setAttribute("aria-hidden", "true");
    label.appendChild(caret);
    head.appendChild(label);
    head.classList.add("fr-fold-head");

    if (!body.id) {
      body.id = `fr-fold-${Math.random().toString(36).slice(2, 9)}`;
    }
    label.setAttribute("aria-controls", body.id);

    const set = (open) => {
      section.classList.toggle("is-open", open);
      body.hidden = !open;
      label.setAttribute("aria-expanded", open ? "true" : "false");
    };
    set(wantsOpen());

    label.addEventListener("click", () => {
      const open = label.getAttribute("aria-expanded") !== "true";
      set(open);
      remember(open);
    });

    section.classList.add("fr-fold");
    section.dataset.frFolded = "1";
  }

  function sweep(root) {
    (root || document).querySelectorAll(SELECTOR).forEach(fold);
  }

  const reading = document.querySelector("#reading");
  if (!reading) return;
  sweep(reading);

  // The reader rebuilds #reading on every page turn, and the apparatus
  // arrives with it. Observing the container rather than re-running on a
  // timer means a fold appears with the text instead of a moment after.
  try {
    new MutationObserver(() => sweep(reading)).observe(reading, {
      childList: true,
      subtree: true,
    });
  } catch (_) {
    // No MutationObserver is not a reason to leave the first column
    // folded and the rest not: fall back to folding what is there.
    sweep(reading);
  }
}());
