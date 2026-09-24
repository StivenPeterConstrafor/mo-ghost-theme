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
 * CHAPTERS AND BOOKS FOLD TOO — the second half of this file. Ian,
 * 2026-09-21: "Do it all. Chapters and books." See SECTIONS below for
 * how a section is found, which is the part that had to be got right.
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

  /* ══════════════════════════════════════════════════════════════════
     SECTIONS: every book and chapter folds
     ══════════════════════════════════════════════════════════════════

     HOW A SECTION IS FOUND. Not from the text. The heading markup is not
     consistent across works: Pastoral Rule marks its chapter heads
     `.row.rhead`, while Cur Deus homo -- the same collection, the same
     reader -- has none, and every one of its 153 rows carries the same
     data-caps attribute, heads and prose alike. Any rule written against
     the DOM was right on one work and wrong on the next.

     The reader's own OUTLINE already knows. Each entry in the sidebar is
     a .nav-node with the page it starts on, its title, and a depth that
     the reader has already harmonised (Book at 1, Chapter at 2, and so
     on). Clicking one lands on the exact heading row through
     FRReaderNavigation.exactHeading, and for Migne works
     FRPldReading.renderedHeading. This uses the same two resolvers with
     the same inputs, so a fold starts exactly where a click on the
     outline lands. Checked on Cur Deus homo: 48 of 48 entries resolve,
     with Preface and Book One at depth 1 and the chapters at 2.

     A SECTION ENDS AT THE NEXT OUTLINE ENTRY OF EQUAL OR HIGHER RANK, so
     folding a book folds its chapters and folding a chapter folds only
     itself. The end is located by that entry's PAGE as well as its
     heading row, because on a long work the reader renders placeholder
     folios that it only hydrates near the viewport -- and a hidden folio
     is never near the viewport. A range that ran to "the next heading
     found in the DOM" would, on a placeholder, swallow the next chapter
     and never give it back.

     RESOLVED WHILE VISIBLE, THEN STAMPED. exactHeading only matches a
     heading that has client rects, so a chapter inside a folded book
     would stop resolving the moment the book closed. Each pass unhides
     everything, stamps any heading not yet found, and re-applies the
     folds -- one synchronous task, so nothing paints in between.

     GOING TO A PLACE OPENS WHAT IS OVER IT. The reader navigates by
     scrollIntoView on a folio or a row, which is a silent no-op on a
     display:none node -- the same failure that once left every outline
     click dead on the confessions. So jump() and the anchor navigator
     are wrapped: before they run, any fold covering the destination
     opens. A reader never lands on nothing.

     Open by default. This is the text itself, not the apparatus; a
     reader folds what they are done with. Remembered for the session,
     per work, so a page turn or a reload does not undo it, and forgotten
     after, so nobody returns next week to a work with its middle
     missing and no memory of why. */

  const nav = document.querySelector("#nav");
  const dataOf = () => {
    try { return typeof DATA !== "undefined" ? DATA : null; }
    catch (_) { return null; }
  };
  const slug = () => {
    const d = dataOf();
    if (d && d.slug) return String(d.slug);
    try { return new URLSearchParams(window.location.search).get("w") || ""; }
    catch (_) { return ""; }
  };
  const storeKey = () => `mo_tfr_folds:${slug()}`;

  let collapsed = new Set();
  let allShut = false;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(storeKey()) || "[]");
    if (Array.isArray(saved)) collapsed = new Set(saved.map(Number).filter((n) => n >= 0));
  } catch (_) { collapsed = new Set(); }
  function saveCollapsed() {
    try { window.sessionStorage.setItem(storeKey(), JSON.stringify([...collapsed])); }
    catch (_) { /* private mode: folds still work, they just do not persist */ }
  }

  /* The outline as the reader drew it. Depth comes from the nd1..nd5
     class renderOutline writes after harmonising sibling ranks. */
  function entries() {
    if (!nav) return [];
    return [...nav.querySelectorAll(".nav-node")].map((n) => ({
      i: Number(n.dataset.idx),
      page: String(n.dataset.page || ""),
      depth: Number(((n.className.match(/\bnd(\d)\b/) || [])[1]) || 1),
      title: ((n.querySelector(".nn-t") || n).textContent || "").trim(),
    })).filter((e) => Number.isFinite(e.i) && e.page);
  }

  /* jump()'s own fallback, kept word for word in its thresholds: when
     neither resolver claims a title, score heading subtitles and then
     row openings by shared words, and accept only a strong match. */
  const norm = (t) => String(t || "").toLowerCase().replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  function fuzzy(folio, title) {
    const nt = norm(String(title).replace(/^[^—]{0,16}—\s*/, ""));
    if (nt.length < 6) return null;
    const words = nt.split(" ").filter((w) => w.length > 2);
    const score = (txt) => {
      const ht = norm(txt);
      if (!ht) return 0;
      const hit = words.length ? words.filter((w) => ht.includes(w)).length / words.length : 0;
      const pref = (ht.startsWith(nt.slice(0, 18)) || nt.startsWith(ht.slice(0, 18))) ? 1 : 0;
      return Math.max(hit, pref);
    };
    let best = null;
    let bs = 0;
    folio.querySelectorAll(".row.rhead .csub").forEach((h) => {
      if (!h.getClientRects().length) return;
      const sc = score(h.textContent);
      if (sc > bs) { bs = sc; best = h; }
    });
    if (bs < 0.6) {
      folio.querySelectorAll(".row:not(.rhead)").forEach((r) => {
        if (!r.getClientRects().length) return;
        const sc = score((r.textContent || "").slice(0, 260));
        if (sc > bs) { bs = sc; best = r; }
      });
    }
    return best && bs >= 0.6 ? best : null;
  }

  function resolve(folio, title) {
    const d = dataOf();
    let h = null;
    try { h = window.FRReaderNavigation && window.FRReaderNavigation.exactHeading(d, folio, title); }
    catch (_) { h = null; }
    if (!h && /^pld-/.test((d && d.slug) || "")) {
      try { h = window.FRPldReading && window.FRPldReading.renderedHeading(folio, title); }
      catch (_) { h = null; }
    }
    if (!h) h = fuzzy(folio, title);
    if (!h || h === folio) return null;
    const row = h.closest ? (h.closest(".row") || h) : null;
    // Only a direct child of the folio can bound a range; anything
    // deeper is a heading nested in something the fold cannot split.
    return row && row.parentElement === folio ? row : null;
  }

  // Folios a resolution has already been tried on, per entry. Keyed on
  // the folio ELEMENT, so a re-render (a new element) is tried again and
  // a failure is not retried a thousand times on every pass.
  const tried = new WeakMap();

  function stamp(list, folioByPage) {
    list.forEach((e) => {
      const folio = folioByPage.get(e.page);
      if (!folio) return;
      if (folio.querySelector(`[data-fr-sec="${e.i}"]`)) return;
      let t = tried.get(folio);
      if (!t) { t = new Set(); tried.set(folio, t); }
      if (t.has(e.i)) return;
      t.add(e.i);
      const row = resolve(folio, e.title);
      if (!row || row.dataset.frSec) return;
      row.dataset.frSec = String(e.i);
      row.classList.add("fr-sec-head");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fr-sec-toggle";
      btn.dataset.frSecToggle = String(e.i);
      btn.setAttribute("aria-label", `Fold ${e.title}`);
      btn.setAttribute("aria-expanded", "true");
      row.appendChild(btn);
    });
  }

  // During a pass, hide() records what should be hidden; the pass then
  // changes only the elements whose state differs (see apply()).
  let sink = null;
  function hide(el) { if (sink) sink.add(el); else el.classList.add("fr-sec-hid"); }

  /* Everything after `head`, in document order, up to where the next
     section of equal or higher rank begins. */
  function hideRange(head, endRow, endFolio) {
    const reading = head.closest("#reading");
    const folio = head.parentElement;
    // The next section starts on this same page and its heading could
    // not be found, so where this one ends is unknowable. Fold nothing
    // rather than guess: hiding too little leaves a section open, while
    // hiding too much takes away the start of the NEXT section, which is
    // text the reader did not ask to fold. Seen on pg-3860, where the
    // second entry's title ("Proems") matches nothing printed on the page.
    if (!endRow && endFolio === folio) return;
    for (let s = head.nextElementSibling; s; s = s.nextElementSibling) {
      if (endRow && (s === endRow || s.contains(endRow))) return;
      hide(s);
    }
    if (endFolio === folio) return;
    for (let u = folio.nextElementSibling; u && u.parentElement === reading; u = u.nextElementSibling) {
      if (u.classList.contains("fmark")) {
        const n = u.nextElementSibling;
        // The page marker that heads the next section's page stays.
        if (n && (n === endFolio || (endRow && n.contains(endRow)))) return;
        hide(u);
        continue;
      }
      if (u === endFolio || (endRow && u.contains(endRow))) {
        if (endRow && u.contains(endRow)) {
          for (const c of u.children) {
            if (c === endRow || c.contains(endRow)) break;
            hide(c);
          }
        }
        return;
      }
      hide(u);
    }
  }

  let observer = null;
  let applying = false;

  function apply() {
    const reading = document.querySelector("#reading");
    if (!reading || !nav || applying) return;
    applying = true;
    if (observer) observer.disconnect();
    try {
      const list = entries();
      const folioByPage = new Map();
      reading.querySelectorAll(".folio").forEach((f) => {
        const pg = String(f.dataset.page || "");
        if (pg && !folioByPage.has(pg)) folioByPage.set(pg, f);
      });
      // Collapse all holds for outline entries drawn after it was pressed
      // (long works add entries as the reader moves).
      if (allShut) list.forEach((e) => collapsed.add(e.i));

      /* THE FOLDS COME OFF ONLY WHEN A HEADING STILL HAS TO BE FOUND.
         The resolvers read layout, so they need every heading visible.
         This used to unhide the whole work and re-lay it out on EVERY
         pass, and a pass runs on every change the reader makes to the
         text. On a 956-page work with everything folded that was a full
         layout of 1.6 million pixels per pass while pages streamed in,
         and the page stopped answering (2026-09-23: "Expand didn't"). */
      const needsStamp = list.some((e) => {
        const f = folioByPage.get(e.page);
        if (!f || f.querySelector(`[data-fr-sec="${e.i}"]`)) return false;
        const t = tried.get(f);
        return !(t && t.has(e.i));
      });
      if (needsStamp) {
        reading.querySelectorAll(".fr-sec-hid").forEach((el) => el.classList.remove("fr-sec-hid"));
        stamp(list, folioByPage);
      }
      const target = new Set();
      sink = target;

      const rowOf = new Map();
      reading.querySelectorAll("[data-fr-sec]").forEach((r) => rowOf.set(Number(r.dataset.frSec), r));

      list.forEach((e, k) => {
        const head = rowOf.get(e.i);
        if (!head) return;
        const open = !collapsed.has(e.i);
        head.classList.toggle("is-collapsed", !open);
        const btn = head.querySelector(":scope > .fr-sec-toggle");
        if (btn) {
          btn.setAttribute("aria-expanded", open ? "true" : "false");
          btn.setAttribute("aria-label", `${open ? "Fold" : "Unfold"} ${e.title}`);
        }
        if (open) return;
        let next = null;
        for (let j = k + 1; j < list.length; j += 1) {
          if (list[j].depth <= e.depth) { next = list[j]; break; }
        }
        const endRow = next ? (rowOf.get(next.i) || null) : null;
        const endFolio = next
          ? (endRow ? endRow.parentElement : (folioByPage.get(next.page) || null))
          : null;
        // A later section whose page has not streamed in yet: fold only
        // what is here now; the next pass extends it when the page lands.
        if (next && !endFolio) {
          for (let s = head.nextElementSibling; s; s = s.nextElementSibling) hide(s);
          return;
        }
        hideRange(head, endRow, endFolio);
      });

      // Change only what differs: no churn, and no layout read above.
      sink = null;
      reading.querySelectorAll(".fr-sec-hid").forEach((el) => {
        if (!target.has(el)) el.classList.remove("fr-sec-hid");
      });
      target.forEach((el) => { if (!el.classList.contains("fr-sec-hid")) el.classList.add("fr-sec-hid"); });
    } finally {
      sink = null;
      applying = false;
      if (observer) observer.observe(reading, { childList: true, subtree: true });
    }
  }

  let pending = 0;
  function schedule() {
    if (pending) return;
    pending = window.setTimeout(() => { pending = 0; apply(); }, 120);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".fr-sec-toggle");
    if (!btn) return;
    // The reader listens for clicks on rows (selection, citations). A
    // fold is not a reading action; keep it from reaching them.
    e.preventDefault();
    e.stopPropagation();
    const i = Number(btn.dataset.frSecToggle);
    if (collapsed.has(i)) { collapsed.delete(i); allShut = false; } else collapsed.add(i);
    saveCollapsed();
    apply();
    btn.focus({ preventScroll: true });
  }, true);

  /* Opening the folds over a destination before the reader goes there. */
  function openOver(page) {
    if (!collapsed.size || !page) return;
    const reading = document.querySelector("#reading");
    if (!reading) return;
    const folios = [...reading.querySelectorAll(".folio")];
    const order = new Map();
    folios.forEach((f, n) => { if (!order.has(String(f.dataset.page))) order.set(String(f.dataset.page), n); });
    const at = order.get(String(page));
    if (at === undefined) return;
    const list = entries();
    let changed = false;
    list.forEach((e, k) => {
      if (!collapsed.has(e.i)) return;
      const from = order.get(e.page);
      // Same page counts: a book and its first chapter usually share
      // one, and landing on a folded chapter head would be a dead click.
      if (from === undefined || at < from) return;
      let next = null;
      for (let j = k + 1; j < list.length; j += 1) {
        if (list[j].depth <= e.depth) { next = list[j]; break; }
      }
      const to = next ? order.get(next.page) : undefined;
      if (to === undefined || at < to) { collapsed.delete(e.i); allShut = false; changed = true; }
    });
    if (changed) { saveCollapsed(); apply(); }
  }

  function wrap(name, pageFrom) {
    const orig = window[name];
    if (typeof orig !== "function" || orig.__frFoldWrapped) return !!(orig && orig.__frFoldWrapped);
    const wrapped = function (...args) {
      try { openOver(pageFrom(...args)); } catch (_) { /* never block navigation */ }
      return orig.apply(this, args);
    };
    wrapped.__frFoldWrapped = true;
    window[name] = wrapped;
    return true;
  }
  const pageFromHref = (href) => {
    try {
      const u = new URL(String(href), window.location.href);
      const m = u.hash.match(/^#b(\d+)-/);
      return (m && m[1]) || u.searchParams.get("p") || "";
    } catch (_) { return ""; }
  };
  (function hook(tries) {
    const a = wrap("jump", (p) => p);
    const b = wrap("__frNavigateReaderAnchor", pageFromHref);
    if ((!a || !b) && tries > 0) window.setTimeout(() => hook(tries - 1), 250);
  }(40));

  /* Expand all / Collapse all, for the toolbar (Ian, 2026-09-23).
     faith-port-read-chrome.js owns the button; this owns the state.
     Collapse all folds every book and chapter and closes the editorial
     notes. Expand all opens every book and chapter and leaves the notes
     as they are: closed is their default by Ian's call (see the top of
     this file), and each has its own toggle. The section the reader is
     in stays on screen, or its nearest visible parent does. */
  const changed = () => {
    try { document.dispatchEvent(new CustomEvent("fr-folds-change")); } catch (_) { /* old engine */ }
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest(".fr-sec-toggle")) window.setTimeout(changed, 0);
  });
  function sectionHere() {
    const sc = document.getElementById("scroll");
    const line = (sc ? sc.getBoundingClientRect().top : 0) + 120;
    let here = null;
    document.querySelectorAll("#reading [data-fr-sec]").forEach((h) => {
      const r = h.getBoundingClientRect();
      if (r.height && r.top <= line) here = h;
    });
    return here ? Number(here.dataset.frSec) : null;
  }
  window.FRReaderFolds = {
    // Asked of the state the reader chose, not re-derived from the
    // outline: the outline gains entries as the reader moves, and a new
    // entry is not a fold the reader opened.
    anyOpen() {
      if (allShut) return false;
      const list = entries();
      return !list.length || list.some((e) => !collapsed.has(e.i));
    },
    setAll(open) {
      const here = sectionHere();
      const list = entries();
      allShut = !open;
      collapsed = open ? new Set() : new Set(list.map((e) => e.i));
      saveCollapsed();
      if (!open) {
        document.querySelectorAll('#reading .fr-fold-toggle[aria-expanded="true"]').forEach((b) => b.click());
      }
      apply();
      if (here !== null) {
        let target = null;
        document.querySelectorAll("#reading [data-fr-sec]").forEach((h) => {
          if (Number(h.dataset.frSec) <= here && h.getClientRects().length) target = h;
        });
        if (target) target.scrollIntoView({ block: "start" });
      }
      changed();
    },
  };

  const readingEl = document.querySelector("#reading");
  if (readingEl && nav) {
    try {
      observer = new MutationObserver(schedule);
      observer.observe(readingEl, { childList: true, subtree: true });
      // The outline is drawn after the text starts streaming; redraws of
      // it (its own carets) change which entries exist.
      new MutationObserver(schedule).observe(nav, { childList: true, subtree: true });
    } catch (_) { /* no MutationObserver: fold what is there now */ }
    schedule();
  }
}());
