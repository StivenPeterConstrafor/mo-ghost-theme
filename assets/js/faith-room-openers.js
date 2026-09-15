/* The two ways into the library, above the table of contents.
 *
 * "Continue reading" is the reader's own history: the reader writes
 * fr_lastread on every page turn, so this is the same record the ported
 * library landing read. "Browse the shelves" is the catalogue grouped by
 * tradition, which is the same facet the room's Tradition filter cuts on,
 * so a shelf is a link into the table of contents below rather than a
 * separate page.
 *
 * Both sections remove themselves when they have nothing to say. A reader
 * with no history sees the shelves alone, and neither leaves a heading
 * standing over an empty row.
 */
(function () {
  "use strict";

  const root = document.querySelector("[data-faith-openers]");
  if (!root || !window.MOCorpora) return;

  // The same seven the room reads on the all-works page. Kept in step
  // deliberately: a shelf count that disagrees with the table of
  // contents under it is worse than no shelf count at all.
  const ALL = ["pg", "pld", "po", "tfr", "eebo", "confessions", "augustine"];

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const num = (n) => Number(n).toLocaleString();

  /* ---- Continue reading ------------------------------------------- */

  function continueReading() {
    let lr;
    try {
      lr = JSON.parse(localStorage.getItem("fr_lastread") || "{}");
    } catch (e) { return ""; }
    if (!lr || typeof lr !== "object") return "";

    const items = Object.keys(lr)
      .map((k) => [k, lr[k]])
      .filter(([, e]) => e && e.page !== null && e.page !== undefined &&
        e.page !== "" && (e.slug || e.title))
      .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0))
      .slice(0, 4);
    if (!items.length) return "";

    const cards = items.map(([ws, e]) => {
      const slug = e.slug || ws;
      const title = e.title || String(ws).split("/").pop();
      // The reader anchors a page as #b<page>-0, so the link reopens on
      // the page last read rather than at the title page.
      const href = "/the-faith-received/read/?w=" + encodeURIComponent(slug) +
        "#b" + encodeURIComponent(e.page) + "-0";
      const meta = [e.author, "fol. " + e.page].filter(Boolean).join(" · ");
      return '<a class="fro-card" href="' + esc(href) + '">' +
        '<span class="fro-card-t">' + esc(title) + "</span>" +
        '<span class="fro-card-m">' + esc(meta) + "</span></a>";
    }).join("");

    return '<div class="fro-block fro-continue">' +
      '<h2 class="fro-h">Continue reading</h2>' +
      '<div class="fro-cards">' + cards + "</div></div>";
  }

  /* ---- Browse the shelves ------------------------------------------ */

  // A catalogue's stand-in for a name it does not have. Naming these
  // under a shelf tells a reader nothing, and "Unknown author · Editors ·
  // Various authors" under the Latin Fathers is worse than no line at
  // all, so they are skipped and the next real name takes the place.
  const PLACEHOLDER = /^(unknown|anonymous|anon|various|editors?|unknown author|various authors|no author|s\.n\.)\b/i;

  // Early English Books files a name inverted, with dates: "Prynne,
  // William, 1600-1669". That is a sort key, not a name, and printing it
  // under a shelf reads as a database leak. Turned back into a name for
  // display only; the room still sorts on its own surname key.
  function displayName(raw) {
    const s = String(raw || "").trim().replace(/^\[+/, "").replace(/\]+$/, "").trim();
    if (!s) return "";
    const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return s;
    // A trailing part that is only dates is the catalogue's, not the
    // name's. What is left is surname, forename.
    const named = parts.filter((p) => !/^(?:b\.|d\.|ca\.|fl\.|active\s)?\s*\d{3,4}\??(?:\s*[-–]\s*\d{0,4}\??)?$/i.test(p));
    if (named.length < 2) return named[0] || s;
    // Not every comma is an inversion. "Jacques d'Édesse, traductions
    // syriaques" is a name followed by a descriptor, and swapping those
    // produces "traductions syriaques Jacques d'Édesse". A forename opens
    // with a capital and is a word or two; anything else is left alone.
    const fore = named[1];
    if (!/^\p{Lu}/u.test(fore) || fore.split(/\s+/).length > 2) return named[0];
    return fore + " " + named[0];
  }

  // A shelf is a tradition as the catalogue declares it. Where that
  // tradition sits under a parent the shelf keeps its own name and the
  // parent becomes the group it prints under, so "English Divines" reads
  // as itself rather than disappearing into "Protestant".
  function shelves(works) {
    const by = new Map();

    works.forEach((w) => {
      const t = String(w.tradition || "").trim();
      if (!t) return;
      let s = by.get(t);
      if (!s) {
        const parent = (window.MOCorpora.traditionParent
          ? window.MOCorpora.traditionParent(t, w.corpus) : "") || "";
        s = { name: t, parent, n: 0, authors: new Map() };
        by.set(t, s);
      }
      s.n++;
      const a = String(w.author || "").trim();
      if (a && !PLACEHOLDER.test(a)) s.authors.set(a, (s.authors.get(a) || 0) + 1);
    });

    const all = Array.from(by.values()).sort((a, b) => b.n - a.n);
    if (!all.length) return "";

    // The long tail here is the confessions, which run from twelve works
    // down to one and have a browse page of their own. A shelf list that
    // ends in "Arminian · 1 work" reads as an index, not an invitation,
    // so the small ones stay in the Tradition filter below and this
    // block says how many are down there.
    const MIN = 25;
    const list = all.filter((s) => s.n >= MIN);
    const rest = all.length - list.length;
    if (!list.length) return "";

    const rows = list.map((s) => {
      // The filter contract the room reads: a tradition with a parent is
      // reached as a denomination under it, one without is a tradition
      // in its own right.
      const q = new URLSearchParams({ collection: "all" });
      if (s.parent) { q.set("tradition", s.parent); q.set("denomination", s.name); }
      else { q.set("tradition", s.name); }

      // The three names a reader is most likely to recognise, which is
      // the three most published, not the first three alphabetically.
      const names = Array.from(s.authors.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([a]) => displayName(a)).filter(Boolean);
      const under = names.length
        ? '<span class="fro-shelf-who">' + esc(names.join(" · ")) +
          (s.authors.size > names.length ? " · …" : "") + "</span>"
        : "";

      return '<li class="fro-shelf"><a href="?' + esc(q.toString()) + '">' +
        '<span class="fro-shelf-row">' +
        '<span class="fro-shelf-name">' + esc(s.name) + "</span>" +
        '<span class="fro-shelf-n"><b>' + num(s.n) + "</b> " +
        (s.n === 1 ? "work" : "works") + "</span></span>" +
        under + "</a></li>";
    }).join("");

    // No aggregate work count in the heading. Only a work with a declared
    // tradition can sit on a shelf, so that total is always smaller than
    // the catalogue's own, and printing it a few inches above "30,682
    // works in the whole library" reads as one of the two being wrong.
    const foot = rest
      ? '<p class="fro-foot">' + num(rest) + " smaller " +
        (rest === 1 ? "tradition holds" : "traditions hold") +
        " fewer than " + num(MIN) +
        " works each. They are in the Tradition filter below.</p>"
      : "";

    return '<div class="fro-block fro-shelves">' +
      '<h2 class="fro-h">Browse the shelves' +
      '<span class="fro-tally">' + num(list.length) + " shelves</span></h2>" +
      '<ul class="fro-shelf-list">' + rows + "</ul>" + foot + "</div>";
  }

  /* ---- Render ------------------------------------------------------ */

  // Continue reading is local and instant, so it paints before the
  // catalogue is in rather than waiting on a fetch it does not need.
  const first = continueReading();
  if (first) root.innerHTML = first;

  Promise.all(ALL.map((id) => window.MOCorpora.load(id).catch(() => [])))
    .then((sets) => {
      const html = first + shelves(sets.flat());
      if (html) root.innerHTML = html;
      else root.remove();
    })
    .catch(() => { if (!first) root.remove(); });
})();
