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
  // Read once the work is known: this file now runs before reader-core
  // (see the template), when DATA does not exist yet, and a forwarded
  // work's slug is not the one in the address.
  let loaded = false;
  function loadCollapsed() {
    if (loaded || !dataOf()) return;
    loaded = true;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(storeKey()) || "[]");
      if (Array.isArray(saved)) saved.map(Number).filter((n) => n >= 0).forEach((n) => collapsed.add(n));
    } catch (_) { /* nothing saved */ }
  }
  function saveCollapsed() {
    try { window.sessionStorage.setItem(storeKey(), JSON.stringify([...collapsed])); }
    catch (_) { /* private mode: folds still work, they just do not persist */ }
  }

  /* The outline as the reader drew it. Depth comes from the nd1..nd5
     class renderOutline writes after harmonising sibling ranks. The title
     is the engine's own: faith-port-read-toc-titles.js rewrites what the
     entry shows ("Chap. VIII. The Second general Rule proposed") and
     keeps the engine's text on data-fr-title-original, which is what the
     heading resolvers below were written against. */
  /* SECTIONS FROM THE TEXT'S OWN LABELS, when the outline gives none.
     Ian, 2026-09-24: "Collapse/Expand isn't working on Jerome". Jerome
     on Matthew (pld-5644) has a contents by Migne column and no heading
     rows; its chapters open inside paragraphs ("[ Cap. I. I, 3.] Liber
     generationis ..."), which faith-port-read-headings.js marks as
     inline divisions (p.fr-il) or short label headings. With no outline
     entry, or none that resolves once every entry's page has been
     tried, those labels become the sections: a book or part at 1, a
     chapter, homily or letter at 2, a section or question at 3. Each is
     keyed on its row's id, which the engine gives every row
     (b<page>-<n>), so a fold survives a re-render. The label row stays
     on screen when folded; the fold starts at the next row, so text in
     the label's own row is never hidden. */
  let labelMode = false;
  const LAB_DEPTH = [
    [/^(?:book|booke|lib(?:er)?|part|pars|tom(?:e|us)|vol(?:ume)?)\b/i, 1],
    [/^(?:§|sect|sectio|q\.|q\b|question|quaestio)/i, 3],
  ];
  const LAB_P = ":is(.en, .la, .gr) > :is(p.fr-il, p.fr-hd[data-fr-il=\"head\"])";
  function keyOf(id) {
    let h = 7;
    for (let k = 0; k < id.length; k += 1) h = (h * 31 + id.charCodeAt(k)) | 0;
    return 1000000 + (Math.abs(h) % 1000000000);
  }
  function labelEntries() {
    const out = [];
    const reading = document.querySelector("#reading");
    if (!reading) return out;
    reading.querySelectorAll(".folio > .row[id]").forEach((row) => {
      const p = row.querySelector(`:scope > ${LAB_P}, :scope > :is(p.fr-il, p.fr-hd[data-fr-il="head"])`);
      if (!p || p.closest(".pld-editorial")) return;
      const eye = p.querySelector(".fr-il-eye, .fr-hd-eye");
      const label = String((eye || p).textContent || "").replace(/^[\s[(]+/, "").replace(/\s+/g, " ").trim();
      let depth = 2;
      for (const [re, d] of LAB_DEPTH) if (re.test(label)) { depth = d; break; }
      out.push({ i: keyOf(row.id), page: String(row.parentElement.dataset.page || ""), depth, title: label.slice(0, 80), row, anchor: "" });
    });
    return out;
  }
  /* THE RULE, decided from the text as rendered, so a work added later
     qualifies on its own (Ian, 2026-09-24: "that needs to be a rule
     across all works that are like this"):
     - at least 3 labels that parse as a division and number (Cap. I,
       Caput II, ...), with the numbers rising at least twice in order,
       so a stray "Liber I" in a preface never re-sections a work;
     - and an outline that is missing, or of whose entries tried so far
       (their page loaded) no more than 60% resolved to a heading. */
  function labelsQualify(labs) {
    if (labs.length < 3) return false;
    const keys = labs.map((e) => labelKey(e.title)).filter(Boolean);
    if (keys.length < 3) return false;
    let rises = 0;
    const last = new Map();
    keys.forEach((k) => {
      const m = /([a-z]+)(\d+)$/.exec(k);
      if (!m) return;
      const prev = last.get(m[1]);
      if (prev != null && Number(m[2]) > prev) rises += 1;
      last.set(m[1], Number(m[2]));
    });
    return rises >= 2;
  }
  function outlineIsPoor(list) {
    // Any outline at all keeps its own sections. A label-only work gets
    // its outline from the labels (faith-port-read-contents-overlay.js),
    // and the folds follow that outline, so contents and folds agree.
    // Switching the folds alone under a partial outline (the Stromata,
    // eebo-21686) made the two disagree.
    if (list.length) return false;
    // Decided only once the reader has drawn its sidebar: this file runs
    // before the outline exists, and an empty list then means "not yet".
    return !!window.__readerBuilt && !(nav && nav.querySelector(".nav-node"));
  }
  function stampLabels(list) {
    let n = 0;
    list.forEach((e) => {
      const { row } = e;
      if (!row || row.dataset.frSec) return;
      row.dataset.frSec = String(e.i);
      row.dataset.frDepth = String(e.depth);
      row.dataset.frLab = "1";
      row.classList.add("fr-sec-head");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fr-sec-toggle";
      btn.dataset.frSecToggle = String(e.i);
      btn.setAttribute("aria-label", `Fold ${e.title}`);
      btn.setAttribute("aria-expanded", "true");
      row.appendChild(btn);
      n += 1;
    });
    return n;
  }

  function entries() {
    return labelMode ? labelEntries() : navEntries();
  }

  function navEntries() {
    if (!nav) return [];
    return [...nav.querySelectorAll(".nav-node")].map((n) => {
      const t = n.querySelector(".nn-t") || n;
      const own = t.dataset ? t.dataset.frTitleOriginal : null;
      const a = n.querySelector("a.nn-t");
      let anchor = "";
      try { anchor = a ? decodeURIComponent(new URL(a.href, window.location.href).hash.slice(1)) : ""; }
      catch (_) { anchor = ""; }
      return {
        anchor,
        i: Number(n.dataset.idx),
        page: String(n.dataset.page || ""),
        depth: Number(((n.className.match(/\bnd(\d)\b/) || [])[1]) || 1),
        title: String(own != null ? own : (t.textContent || "")).trim(),
      };
    }).filter((e) => Number.isFinite(e.i) && e.page);
  }

  /* jump()'s own fallback, kept word for word in its thresholds: when
     neither resolver claims a title, score heading subtitles and then
     row openings by shared words, and accept only a strong match. */
  const norm = (t) => String(t || "").toLowerCase().replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  function fuzzy(folio, title, claimed) {
    const taken = (el) => !!(claimed && claimed.has(el.closest(".row") || el));
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
      if (!h.getClientRects().length || taken(h)) return;
      const sc = score(h.textContent);
      if (sc > bs) { bs = sc; best = h; }
    });
    if (bs < 0.6) {
      folio.querySelectorAll(".row:not(.rhead)").forEach((r) => {
        if (!r.getClientRects().length || taken(r)) return;
        const sc = score((r.textContent || "").slice(0, 260));
        if (sc > bs) { bs = sc; best = r; }
      });
    }
    return best && bs >= 0.6 ? best : null;
  }

  /* The same title printed as a heading on this page, by exact text
     (§, apostrophes and punctuation aside), the nth time it appears for
     the nth entry of that title. exactHeading answers only for works
     with a reviewed outline, and fuzzy() takes the FIRST best match, so
     on the Heidelberg every "Lord's Day n" after the first on a page
     scored "Lord's Day 1" (the words lord and day), found it already
     claimed, and got no fold: Lord's Day 2, 3, 4, 6, 7, 9... */
  const HEADS = ".rhead .csub, .rhead .cmain, .rhead .hen, .row.rhead";
  function exactText(folio, title, nth) {
    const want = norm(title);
    if (!want) return null;
    const seen = new Set();
    let n = 0;
    for (const h of folio.querySelectorAll(HEADS)) {
      const row = h.closest(".row") || h;
      if (seen.has(row) || !h.getClientRects().length) continue;
      if (norm(h.textContent) !== want) continue;
      seen.add(row);
      if (n === nth) return h;
      n += 1;
    }
    return null;
  }

  /* The entry's own link, when it names one element. The contents
     overlay points every catechism question at its row (b<page>-<n>),
     which is exact where fuzzy() is not: the Larger's "7. What is God?"
     scored the answer to Q.5 (it has "what" and "God"), a row ABOVE the
     part heading, so collapsing it hid the part heading. Trusted only
     when the row opens with the title's own words, because the Migne
     works point every entry on a column at that column's first block. */
  function anchored(folio, e) {
    if (!e.anchor) return null;
    let el = null;
    try { el = folio.querySelector(`#${CSS.escape(e.anchor)}`); }
    catch (_) { el = null; }
    if (!el || !el.getClientRects().length) return null;
    if (/^h\d/.test(e.anchor)) return el;
    const want = norm(e.title).slice(0, 40);
    return want.length >= 6 && norm(el.textContent).slice(0, want.length + 8).includes(want) ? el : null;
  }

  /* The same division by its LABEL, when the outline and the page print
     it in different languages: Polanus's outline reads "Book I -
     Chapter XIII - On the Theology of Wayfarers", the page "Liber I -
     Caput XIII - De Theologia viatorum", and neither text nor fuzzy
     words match. Both reduce to book 1, chapter 13. Only a row that
     OPENS on its label counts, and only one whose whole label agrees. */
  const KIND = [
    [/^(?:chap(?:ter)?|cap(?:ut|itulum)?|κεφ(?:άλαιον|αλαιον)?)$/i, "ch"],
    [/^(?:book|booke|lib(?:er)?)$/i, "bk"],
    [/^(?:part|pars)$/i, "pt"],
    [/^(?:homil(?:y|ia)|ὁμιλία|ομιλια)$/i, "hom"],
    [/^(?:sermon|sermo)$/i, "serm"],
    [/^(?:question|quaestio|q)$/i, "q"],
    [/^(?:article|articulus|art)$/i, "art"],
    [/^(?:letter|epist(?:le|ola)|ep)$/i, "ep"],
    [/^(?:dissertatio|discourse|tract(?:atus|ate)?|lectio|distinctio|dist|λόγος|λογος|oratio)$/i, "div"],
  ];
  const WORDNUM = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split(" ");
  function numOf(t) {
    const w = String(t).toLowerCase().replace(/[.ʹ΄']+$/, "");
    if (/^\d+$/.test(w)) return Number(w);
    if (/^[ivxlcdm]+$/.test(w)) {
      const v = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
      let n = 0;
      for (let k = 0; k < w.length; k += 1) {
        const a = v[w[k]];
        const b = v[w[k + 1]] || 0;
        n += a < b ? -a : a;
      }
      return n;
    }
    const wn = WORDNUM.indexOf(w);
    return wn >= 0 ? wn + 1 : null;
  }
  const GROUP_RE = /^[\s[(]*([A-Za-zΑ-Ωα-ωά-ώ]+)\.?\s+([ivxlcdm]+|\d+|[a-z]+)\b\.?[\s\-–—.,:;]*/i;
  function labelKey(text) {
    let t = String(text || "").replace(/^§\s*/, "");
    const parts = [];
    for (let g = 0; g < 3; g += 1) {
      const m = GROUP_RE.exec(t);
      if (!m) break;
      const kind = (KIND.find(([re]) => re.test(m[1])) || [])[1];
      const n = kind ? numOf(m[2]) : null;
      if (!kind || !n) break;
      parts.push(kind + n);
      t = t.slice(m[0].length);
    }
    return parts.join(".");
  }
  function labelMatch(folio, title, nth, claimed) {
    const want = labelKey(title);
    if (!want) return null;
    let n = 0;
    for (const row of folio.querySelectorAll(":scope > .row")) {
      if (claimed && claimed.has(row)) continue;
      // Any paragraph of the row may carry the label: a homily can begin
      // in the middle of a row that opens on the last lines of the one
      // before (po-327, Homily V). The fold then starts at that row and
      // hides only what follows it, so nothing before the label is hidden.
      const lanes = [...row.querySelectorAll(":scope > :is(.en, .la, .gr), :scope > :is(.en, .la, .gr) > :is(h3, p), :scope > p")];
      const texts = (lanes.length ? lanes : [row]).map((el) => (el.textContent || "").slice(0, 120));
      if (!texts.some((t) => labelKey(t) === want)) continue;
      if (!row.getClientRects().length) continue;
      if (n === (nth || 0)) return row;
      n += 1;
    }
    return null;
  }

  function resolve(folio, title, nth, claimed, e) {
    const d = dataOf();
    let h = e ? anchored(folio, e) : null;
    if (h) return h.closest(".row") && h.closest(".row").parentElement === folio ? h.closest(".row") : null;
    try { h = window.FRReaderNavigation && window.FRReaderNavigation.exactHeading(d, folio, title); }
    catch (_) { h = null; }
    if (h && claimed && claimed.has(h.closest ? (h.closest(".row") || h) : h)) h = null;
    if (!h && /^pld-/.test((d && d.slug) || "")) {
      try { h = window.FRPldReading && window.FRPldReading.renderedHeading(folio, title); }
      catch (_) { h = null; }
    }
    if (!h) h = exactText(folio, title, nth || 0);
    if (!h) h = labelMatch(folio, title, 0, claimed);
    if (!h) h = fuzzy(folio, title, claimed);
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

  /* Is this resolved row a heading, and how long a one? Measured per
     LANE, not on the row: a two-language row carries the heading twice
     (Latin and English), so the old whole-row count put nearly every
     chapter head of the Latin Fathers over the line and the section
     styling never showed on them (Ian, 2026-09-24: "I don't see any
     differences"). A short lane is a heading; a longer one that opens
     with a division word (CHAPTER V.--, LIBER PRIMUS.) is a heading
     with its argument, styled lighter; anything else is prose the
     outline happens to point at, and is left alone. */
  const DIVISION = /^[\s§*]*(?:chap(?:ter)?|cap(?:ut|itulum)?|book|lib(?:er)?|part|pars|sect(?:ion|io)?|article|art|quaestio|question|q|sermon|homil(?:y|ia)|psalm|epist(?:le|ola)|tract(?:ate|atus)?|distinctio|lectio|lecture|disputatio|disputation|oratio|oration|canon|dialogue|dialogus)\b\.?/i;
  function headKind(row) {
    if (row.querySelector("h1, h2, h3, h4, .csub")) return "";
    const lanes = [...row.querySelectorAll(".en, .la, .gr, .lane")];
    const texts = (lanes.length ? lanes : [row]).map((el) => (el.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!texts.length) return "";
    const len = Math.max(...texts.map((t) => t.length));
    if (len < 200) return "short";
    if (len < 420 && texts.some((t) => DIVISION.test(t))) return "long";
    return "";
  }

  // Reads first, writes after. resolve() measures (getClientRects), and
  // every button a write adds invalidates layout, so interleaving them
  // relaid the whole page once per entry: the 1928 BCP's 440 entries
  // froze the browser for about five seconds on load (Ian, 2026-09-24).
  function stamp(list, folioByPage) {
    const found = [];
    const claimed = new Set();
    // Rows already stamped on an earlier pass are claimed too.
    folioByPage.forEach((f) => f.querySelectorAll(":scope > [data-fr-sec]").forEach((r) => claimed.add(r)));
    const nthOf = new Map();
    list.forEach((e) => {
      const folio = folioByPage.get(e.page);
      if (!folio) return;
      const key = `${e.page}\u0000${norm(e.title)}`;
      const nth = nthOf.get(key) || 0;
      nthOf.set(key, nth + 1);
      if (folio.querySelector(`[data-fr-sec="${e.i}"]`)) return;
      let t = tried.get(folio);
      if (!t) { t = new Set(); tried.set(folio, t); }
      if (t.has(e.i)) return;
      t.add(e.i);
      const row = resolve(folio, e.title, nth, claimed, e);
      if (!row || row.dataset.frSec || claimed.has(row)) return;
      claimed.add(row);
      found.push([e, row]);
    });
    found.forEach(([e, row]) => {
      row.dataset.frSec = String(e.i);
      row.dataset.frDepth = String(e.depth);
      row.classList.add("fr-sec-head");
      // A row that IS the heading (the Latin Fathers carry no heading
      // element: the head is a short row of its own) is styled as one
      // (faith-port-reader-skin.css, "Section headings"). A row that
      // merely holds a heading element among prose is left to that
      // element's own style.
      const kind = headKind(row);
      if (kind) row.classList.add("fr-sec-headrow");
      if (kind === "long") row.classList.add("fr-sec-headrow--long");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fr-sec-toggle";
      btn.dataset.frSecToggle = String(e.i);
      btn.setAttribute("aria-label", `Fold ${e.title}`);
      btn.setAttribute("aria-expanded", "true");
      row.appendChild(btn);
    });
    return found.length;
  }

  // During a pass, hide() records what should be hidden; the pass then
  // changes only the elements whose state differs (see apply()).
  let sink = null;
  function hide(el) { if (sink) sink.add(el); else el.classList.add("fr-sec-hid"); }

  /* Where a fold starts hiding: after the head row, and after the line
     its heading box continues onto (faith-port-read-headings.js joins a
     card to the subtitle or title in the row below). Hiding that row
     left the folded card with an open bottom and no bottom rule (Ian,
     2026-09-24: "When these are collapsed, the bottom line disappears").
     The heading's own lines are part of the heading and stay. */
  function firstHidden(head) {
    const n = head.nextElementSibling;
    return n && head.classList.contains("fr-hd-joinrow") && n.classList.contains("fr-hd-controw")
      // Never past the row where this section ends (a label and its
      // title at one rank: "First Part:" / "Of Man's Misery" on the old
      // flat outline).
      && (n.dataset.frSec == null || Number(n.dataset.frDepth || 0) > Number(head.dataset.frDepth || 0))
      ? n.nextElementSibling : n;
  }

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
    for (let s = firstHidden(head); s; s = s.nextElementSibling) {
      if (endRow && (s === endRow || s.contains(endRow))) return;
      hide(s);
    }
    if (endFolio === folio) return;
    for (let u = folio.nextElementSibling; u && u.parentElement === reading; u = u.nextElementSibling) {
      if (u.classList.contains("fmark")) {
        const n = u.nextElementSibling;
        // The page marker that heads the next section's page stays, and
        // that page's rows before the next heading still fold: returning
        // here left the Heidelberg's Lord's Day 31 (page 10, above Third
        // Part) open under a collapsed Second Part.
        if (n && (n === endFolio || (endRow && n.contains(endRow)))) continue;
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

  // Position in the work of a page, and of an element in #reading: a
  // rendered folio by its page, an unloaded placeholder (.fph) by its index.
  let pageOrder = null;
  function pageIdx(page) {
    if (!pageOrder) {
      const d = dataOf();
      if (!d || !Array.isArray(d.pages)) return null;
      pageOrder = new Map(d.pages.map((p, i) => [String(p.n), i]));
    }
    const k = pageOrder.get(String(page));
    return k === undefined ? null : k;
  }
  function idxOf(el) {
    if (!el || !el.classList) return null;
    if (el.classList.contains("fph")) return Number(el.dataset.i);
    if (el.classList.contains("folio")) return pageIdx(el.dataset.page);
    return null;
  }

  let observer = null;
  let applying = false;

  function apply() {
    const reading = document.querySelector("#reading");
    if (!reading || !nav || applying) return;
    loadCollapsed();
    applying = true;
    if (observer) observer.disconnect();
    let stamped = 0;
    try {
      let list = entries();
      const folioByPage = new Map();
      reading.querySelectorAll(".folio").forEach((f) => {
        const pg = String(f.dataset.page || "");
        if (pg && !folioByPage.has(pg)) folioByPage.set(pg, f);
      });

      /* THE FOLDS COME OFF ONLY WHEN A HEADING STILL HAS TO BE FOUND.
         The resolvers read layout, so they need every heading visible.
         This used to unhide the whole work and re-lay it out on EVERY
         pass, and a pass runs on every change the reader makes to the
         text. On a 956-page work with everything folded that was a full
         layout of 1.6 million pixels per pass while pages streamed in,
         and the page stopped answering (2026-09-23: "Expand didn't"). */
      const needsStamp = !labelMode && list.some((e) => {
        const f = folioByPage.get(e.page);
        if (!f || f.querySelector(`[data-fr-sec="${e.i}"]`)) return false;
        const t = tried.get(f);
        return !(t && t.has(e.i));
      });
      if (needsStamp) {
        reading.querySelectorAll(".fr-sec-hid").forEach((el) => el.classList.remove("fr-sec-hid"));
        stamped = stamp(list, folioByPage);
      }
      // No outline, or an outline none of whose entries resolved on any
      // page it names: fold by the labels printed in the text.
      if (!labelMode) {
        const labs = labelEntries();
        const allTried = list.every((e) => {
          const f = folioByPage.get(e.page);
          const t = f && tried.get(f);
          return !!(t && t.has(e.i));
        });
        if (labelsQualify(labs) && outlineIsPoor(list)) {
          labelMode = true;
          // Outline entries that did resolve give way: one set of
          // sections, never two interleaved.
          reading.querySelectorAll("[data-fr-sec]").forEach((r) => {
            delete r.dataset.frSec;
            delete r.dataset.frDepth;
            r.classList.remove("fr-sec-head", "is-collapsed", "fr-sec-empty");
            const bt = r.querySelector(":scope > .fr-sec-toggle");
            if (bt) bt.remove();
          });
          reading.querySelectorAll(".fr-sec-hid").forEach((el) => el.classList.remove("fr-sec-hid"));
          loaded = true;
          collapsed = new Set();
          try {
            const saved = JSON.parse(window.sessionStorage.getItem(storeKey()) || "[]");
            if (Array.isArray(saved)) saved.map(Number).filter((n) => n >= 1000000).forEach((n) => collapsed.add(n));
          } catch (_) { /* nothing saved */ }
        }
      }
      if (labelMode) {
        list = labelEntries();
        stamped += stampLabels(list);
      }
      // Collapse all holds for entries drawn after it was pressed (long
      // works add outline entries, and label rows, as the reader moves).
      if (allShut) list.forEach((e) => collapsed.add(e.i));
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
        let next = null;
        for (let j = k + 1; j < list.length; j += 1) {
          if (list[j].depth <= e.depth) { next = list[j]; break; }
        }
        // A section with nothing of its own before the next one (the
        // Heidelberg's "Of Man's Misery", the title line of a Part, with
        // Lord's Day 2 right under it) shows no caret: it would fold
        // nothing.
        const nextRow = next ? rowOf.get(next.i) : null;
        head.classList.toggle("fr-sec-empty", !!nextRow && head.nextElementSibling === nextRow);
        if (open) return;
        let endRow = next ? (rowOf.get(next.i) || null) : null;
        const endFolio = next
          ? (endRow ? endRow.parentElement : (folioByPage.get(next.page) || null))
          : null;
        // The next section starts on this page but its heading was not
        // found. Fold at least as far as the last heading that WAS found
        // inside this section: everything before it is this section's
        // own text, so nothing is hidden wrongly, and the section no
        // longer stays wide open (the Heidelberg's Q.5 answer).
        if (next && !endRow && endFolio === head.parentElement) {
          for (let j = list.indexOf(next) - 1; j > k; j -= 1) {
            const r = rowOf.get(list[j].i);
            if (r && r.parentElement === endFolio) { endRow = r; break; }
          }
        }
        // A later section whose page has not streamed in yet: fold only
        // what is here now; the next pass extends it when the page lands.
        if (next && !endFolio) {
          for (let s = firstHidden(head); s; s = s.nextElementSibling) hide(s);
          // ...AND every page after it up to the next section's page, loaded
          // or not. Folding only the head's own page left the rest of a long
          // work's section on screen as unloaded placeholders; the reader
          // loaded each one as it came into view, this pass folded it, the
          // next came into view, and with Collapse all on a 956-page work
          // the page stopped answering while every page loaded in turn.
          const stop = pageIdx(next.page);
          for (let u = head.parentElement.nextElementSibling; u && u.parentElement === reading; u = u.nextElementSibling) {
            const k = idxOf(u);
            if (k !== null && stop !== null && k >= stop) break;
            hide(u);
          }
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
    // New heading rows: the heading design sets them now, in this same
    // frame, so a row never paints plain and then grows into a card.
    if (stamped) {
      try { document.dispatchEvent(new CustomEvent("fr-folds-stamped")); } catch (_) { /* old engine */ }
    }
  }

  /* Before the next paint, not 120ms after it. The text paints first
     and the folds stamp its heading rows, which the heading design then
     boxes; a timer let the plain rows paint and then jump into cards
     (Ian, 2026-09-24: "there's a jump on load when it loads the new
     header cards"). A frame callback still coalesces a burst of
     mutations into one pass. The timer stays as the fallback for a
     background tab, where frames do not run. */
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    const run = () => { if (!pending) return; pending = false; apply(); };
    try { window.requestAnimationFrame(run); } catch (_) { /* no frames */ }
    window.setTimeout(run, 120);
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
      // The page where the next section starts counts too: the place may
      // sit above that section's heading, and opening one fold too many
      // is harmless where one too few lands on nothing (the Heidelberg's
      // Lord's Days share pages).
      if (to === undefined || at <= to) { collapsed.delete(e.i); allShut = false; changed = true; }
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
    // The confessions' contents (reader-core renderConfessionContents)
    // go by the restorer, not jump(): a catechism question inside a
    // folded Part landed on nothing until this was wrapped too.
    const c = wrap("__frRestoreReaderPosition", (o) => (o && o.page != null ? String(o.page) : ""));
    if ((!a || !b || !c) && tries > 0) window.setTimeout(() => hook(tries - 1), 250);
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
      loaded = true;
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
