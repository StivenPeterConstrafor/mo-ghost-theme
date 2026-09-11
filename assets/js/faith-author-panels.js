/*
 * Author page — the fold.
 *
 * The research panels on an author page (scripture fingerprint,
 * reception, topic index) arrive closed and open when a reader asks
 * for them. Ian, 2026-09-11: "these should start out collapsed and be
 * expandable."
 *
 * WHY A <details> AND NOT A BUTTON WE WROTE. Three things come free
 * with the element and every one of them has been got wrong by hand in
 * some theme somewhere: Enter and Space both work, the open state is
 * exposed to assistive technology without an aria attribute to keep in
 * sync, and the browser's own find-in-page can open a closed section in
 * engines that support it. The <summary> is already a button, so the
 * heading goes INSIDE it. That is allowed: a summary takes either
 * phrasing content or exactly one heading element, which is what keeps
 * the document outline intact for the SEO pass rather than trading an
 * <h2> for a <span> to get a control.
 *
 * DEEP LINKS. A closed section that a link points at is a broken link.
 * Every fold carries an id, and openFromHash() walks up from whatever
 * the hash names, opens every <details> above it and scrolls it into
 * view. It runs on load, on hashchange, and once more each time a fold
 * is created, because these panels are built by their own fetches and
 * the one being linked to may not exist yet when the page first reads
 * its own address. Chrome and Safari now open a fragment target inside
 * a closed <details> on their own; this does not rely on that.
 *
 * WHAT THIS FILE DOES NOT DO: decide who sees the panels. The beta gate
 * is the {{#if @member}} in custom-faith-author.hbs, which does not
 * load any of these scripts for a signed-out visitor. See
 * partials/faith-received/_beta-gate.hbs for the contract.
 */
(function () {
  "use strict";

  // Set once per fold created, so a second creation does not re-scroll
  // a reader who has already been taken to their section.
  let honoured = false;

  /*
   * Wrap a panel's contents in a fold.
   *
   * `section` is the panel element, already built and already filled.
   * Its first heading becomes the summary and everything else becomes
   * the body, so a caller writes the panel exactly as it wrote it
   * before and hands it over at the end.
   *
   * opts: { id, hint, open }
   *   id    the fragment a link can address. Required in practice: a
   *         fold with no id cannot be linked to and cannot be opened by
   *         openFromHash.
   *   hint  one short line shown beside the heading while the fold is
   *         closed. A closed panel that says only "Reception" tells a
   *         reader nothing about whether it is worth opening.
   *   open  true to start open. Defaults to closed, which is the whole
   *         point of the file.
   */
  function fold(section, opts) {
    const o = opts || {};
    if (!section) return null;

    // The panel's own spacing was set for a panel that is always open,
    // and three of those closed in a row read as three headings adrift
    // in white. This class hands the vertical rhythm to the fold: the
    // summary row keeps the hairline above it and the body carries the
    // air below, so closed rows sit close and an open one still
    // breathes. See "The fold" in assets/css/faith-received.css.
    section.classList.add("fa-panel--folded");

    const details = document.createElement("details");
    details.className = "fa-fold";
    if (o.id) details.id = o.id;
    if (o.open) details.open = true;

    const summary = document.createElement("summary");
    summary.className = "fa-fold-summary";

    // Taken out of the section BEFORE the rest is moved, so it lands in
    // the summary and not in the body under it.
    const head = o.head || section.querySelector("h2");
    if (head) {
      head.classList.add("fa-fold-head");
      summary.appendChild(head);
    }
    if (o.hint) {
      const hint = document.createElement("span");
      hint.className = "fa-fold-hint";
      hint.textContent = o.hint;
      summary.appendChild(hint);
    }

    const body = document.createElement("div");
    body.className = "fa-fold-body";
    while (section.firstChild) body.appendChild(section.firstChild);

    details.appendChild(summary);
    details.appendChild(body);
    section.appendChild(details);

    // The panel this fold belongs to may be the one the reader followed
    // a link to, and it has only just come into existence.
    openFromHash();
    return details;
  }

  // Open every fold above `node`, so a link into the middle of a closed
  // panel lands on something a reader can actually see.
  function reveal(node) {
    let el = node;
    while (el && el !== document.body) {
      if (el.tagName === "DETAILS") el.open = true;
      el = el.parentElement;
    }
  }

  function openFromHash(force) {
    let id = "";
    try {
      id = decodeURIComponent(String(window.location.hash || "").replace(/^#/, ""));
    } catch (_) {
      // A hash that is not valid percent-encoding addresses nothing.
      return;
    }
    if (!id) return;
    let target = null;
    try {
      target = document.getElementById(id);
    } catch (_) { /* not a usable id */ }
    if (!target) return;
    reveal(target);
    // Scrolled once. A fold created later re-runs this to OPEN a
    // section the reader asked for, but moving the page under them a
    // second time would be the panel taking the scroll off them.
    if (honoured && !force) return;
    honoured = true;
    target.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto" : "smooth",
    });
  }

  // A reader who follows a second link to the same page gets the same
  // treatment as the first, so the scroll is allowed again here.
  window.addEventListener("hashchange", () => { openFromHash(true); });

  window.MOAuthorPanels = { fold, reveal, openFromHash };
}());
