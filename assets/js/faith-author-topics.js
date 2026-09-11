/*
 * Author page — the topic index.
 *
 * The same mined topics the Compare desk offers, for the one author
 * whose page this is. Ian, 2026-09-11: "the same topic index that
 * exists on compare should exist for that particular author on their
 * page."
 *
 * ── WHAT THIS PANEL DELIBERATELY DOES NOT SHOW ──────────────────
 *
 * The mined topic files carry two text fields per row and NEITHER IS A
 * QUOTATION. `pos[].q` reads like one and is a machine-written summary
 * of the claim; `pages[].g` is a machine-written summary of the page.
 * Sampled rows were checked against the works' own text and appear
 * nowhere in it, and several carry em dashes, which this publication
 * does not set. Rendering either one inside quotation marks would put
 * words in a father's mouth that he never wrote, under his name, on a
 * page that is otherwise a catalogue of what he really said.
 *
 * So this panel shows COUNTS and LINKS and nothing else. A topic, how
 * many statements were recorded under it, how many pages they sit on,
 * and which of the author's works they come from, each work opening in
 * the reader at the work itself. Every figure here is a count of rows
 * in a file. None of it is a claim about wording.
 *
 * Direct quotations of these passages are being resolved on a separate
 * branch, by matching a row's Migne column against the `cite` field of
 * our own Patrologia JSON. When that lands, this panel is where it
 * belongs. Until it does, the honest version of this feature is the
 * arithmetic, and the arithmetic is genuinely useful: it is what the
 * author spent his pages on.
 *
 * ── WHERE THE DATA COMES FROM ───────────────────────────────────
 *
 *   /v1/bible/<shelf>/rooms/index.json    the roster for one shelf
 *   /v1/bible/<shelf>/rooms/<author>.json one author's room: works,
 *                                         topics, per-topic counts
 *
 * Nine shelves hold rooms and they are the nine traditions: pl, gf,
 * po, ed, md, rc, lu, rf, hl. Of the fourteen thousand names in the
 * library about seventeen hundred have a room, so most author pages
 * draw no panel at all, and that is correct rather than a failure.
 *
 * WHICH SHELF. Asking all nine would be nine fetches on every author
 * page to answer "probably none". The author's own works already say
 * which shelf a room would be on: the collection a work sits in maps
 * to a shelf directly, and the tradition the catalogue gives it maps
 * to the same nine. So the candidates come from the works, usually one
 * shelf, at most a few.
 *
 * COST. The roster for a shelf is about 50KB. A ROOM IS NOT: Ambrose's
 * is 1.4MB and Manton's 1.8MB, because the file carries the sampled
 * statement rows this panel refuses to draw. That is the reason the
 * fold is closed on arrival and the room is not fetched until a reader
 * opens it. A reader who never opens the panel pays for the roster and
 * nothing else.
 *
 * SAFETY. Every string below crossed the network. There is no
 * innerHTML in this file: nodes are built with createElement and
 * textContent, and the only hrefs are ones this file constructs itself
 * out of an id it has matched against a literal pattern, then passes
 * through MOSafeHref anyway. The rows' own `h` field IS a URL and is
 * ignored on purpose — it addresses the corpus owner's own site, and
 * re-pointing a fetched URL is the sink that shipped an XSS in this
 * theme before.
 */
(function () {
  "use strict";

  const BASE = (document.querySelector('meta[name="tfr-library-base"]') || {}).content
    || "https://mo-tfr-library.mo-podcast-feed.workers.dev";

  // Byte-identical to SHELVES in assets/js/page/faith-compare.js and to
  // the nine traditions the Research desk's scope control offers. A key
  // that is not one of these has no room index and the fetch would 404.
  const SHELVES = {
    pl: "Latin Fathers",
    gf: "Greek Fathers",
    po: "Eastern Fathers",
    ed: "English Divines",
    md: "Medieval",
    rc: "Roman Catholic",
    lu: "Lutheran",
    rf: "Reformed",
    hl: "Humanism and Law",
  };

  // The collection a work sits in, against the shelf a room for its
  // author would be filed under. This is the reliable half: four in
  // five Early English Books works carry no tradition at all, so the
  // collection is often the only thing that says where to look.
  // Augustine keeps his own collection and his room is on the Latin
  // shelf with the rest of Migne.
  const SHELF_FOR_CORPUS = {
    pld: "pl",
    augustine: "pl",
    pg: "gf",
    po: "po",
    eebo: "ed",
  };

  // And the tradition, where the catalogue wrote one. Folded, so
  // "Latin Fathers" and "latin fathers" are one key. The last three are
  // aliases: they are what the catalogues actually write, against the
  // nine shelves the rooms are really filed under.
  const SHELF_FOR_TRADITION = {
    "latin fathers": "pl",
    "greek fathers": "gf",
    "eastern fathers": "po",
    "english divines": "ed",
    medieval: "md",
    "roman catholic": "rc",
    lutheran: "lu",
    reformed: "rf",
    "humanism and law": "hl",
    patristic: "pl",
    puritan: "ed",
    anglican: "ed",
  };

  const SLUG = /^[a-z0-9][a-z0-9-]*$/;
  const isSlug = (s) => typeof s === "string" && SLUG.test(s);

  const n = (x) => Number(x || 0).toLocaleString();

  /*
   * Two names for the same person, decided on their word SET.
   *
   * The rooms call him "Thomas Manton" and Early English Books calls
   * him "Manton, Thomas, 1620-1677", so a folded string comparison —
   * which is what the rest of this page matches on — says they are
   * different men. Comparing the set of words instead survives the
   * inversion, the dates and the punctuation, and costs nothing that a
   * folded compare was giving us: two authors who share every word of
   * their name in some order are the same author in practice.
   *
   * "of", "the" and the rest are dropped so "Ambrose of Milan" and
   * "ambrose-of-milan" agree. Numbers go with them, because a date
   * inside a name is a fact about the catalogue and not part of it.
   */
  const NOISE = new Set(["of", "the", "de", "la", "le", "von", "van", "den", "der", "and", "st", "saint"]);

  function nameKey(raw) {
    const words = String(raw || "")
      .normalize("NFD").replace(/\p{M}/gu, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !/^\d+$/.test(w) && w.length > 1 && !NOISE.has(w));
    return words.sort().join(" ");
  }

  const tslugOf = (label) => String(label || "")
    .normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
    .replace(/ /g, "-") || "topic";

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function link(href, text, cls) {
    const a = el("a", cls, text);
    if (window.MOSafeHref && window.MOSafeHref.set) window.MOSafeHref.set(a, href, "#");
    else a.setAttribute("href", href || "#");
    return a;
  }

  function getJSON(url) {
    return fetch(url, { signal: AbortSignal.timeout(30000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }

  /*
   * A work id out of a room file, against a link into our reader.
   *
   * Mirrors readerHref() in assets/js/page/faith-compare.js: the
   * collection goes in `c=` and the work's own id in `w=`, so `pld-370`
   * is corpus pld and work 370. The page is appended only for the
   * collections that have real printed pages; Patrologia Latina and our
   * own editions are stored as sections, where a `p=` would be a number
   * the reader could not find on the page it landed them on.
   *
   * The English Divines shelf carries a second kind of id — the corpus
   * owner's own slugs, "manton-second-volume-sermons-preached-late-
   * reverend", which address his site and not ours. Those get NO LINK
   * rather than a guessed one. Compare's copy of this function falls
   * through and builds `?w=manton-…`, which loads nothing at all; a
   * work named in plain type is better than a link that dead-ends.
   */
  const PREFIXES = [
    [/^pld-/, "pld", 4, false],
    [/^mo-/, "mo", 3, false],
    [/^eebo-/, "eebo", 5, true],
    [/^pg-/, "pg", 3, false],
    [/^po-/, "po", 3, false],
  ];

  function readerHref(work, page) {
    const w = String(work || "");
    if (!w) return "";
    let corpus = "";
    let id = "";
    let hasPages = false;
    for (let i = 0; i < PREFIXES.length; i += 1) {
      const [pattern, code, cut, paged] = PREFIXES[i];
      if (pattern.test(w)) {
        corpus = code;
        id = w.slice(cut);
        hasPages = paged;
        break;
      }
    }
    if (!corpus || !id) return "";
    const params = [`c=${encodeURIComponent(corpus)}`, `w=${encodeURIComponent(id)}`];
    if (hasPages && page != null && page !== "") params.push(`p=${encodeURIComponent(page)}`);
    return `/the-faith-received/reader/?${params.join("&")}`;
  }

  /* ── Finding the room ──────────────────────────────────────────── */

  function shelvesFor(works) {
    const out = [];
    const add = (sh) => { if (sh && SHELVES[sh] && out.indexOf(sh) < 0) out.push(sh); };
    (works || []).forEach((w) => {
      add(SHELF_FOR_CORPUS[w.corpus]);
      add(SHELF_FOR_TRADITION[String(w.tradition || "").trim().toLowerCase()]);
    });
    return out;
  }

  function findRoom(shelves, name, key) {
    const wantName = nameKey(name);
    return Promise.all(shelves.map((sh) => getJSON(`${BASE}/v1/bible/${sh}/rooms/index.json`)
      .then((d) => ({ sh, rows: (d && Array.isArray(d.authors)) ? d.authors : [] }))))
      .then((parts) => {
        const hits = [];
        parts.forEach((p) => {
          p.rows.forEach((r) => {
            if (!isSlug(r.s)) return;
            // The slug matches the address a Compare column links with,
            // the name matches the page's own heading. Either will do,
            // and the two disagree often enough to be worth both.
            if (nameKey(r.s) !== wantName && nameKey(r.a) !== wantName && r.s !== key) return;
            hits.push({ sh: p.sh, s: r.s, a: String(r.a || r.s), w: r.w || 0, nt: r.nt || 0, y: r.y });
          });
        });
        // The same person can keep a room on more than one shelf. The
        // heaviest is the one with the works in it.
        hits.sort((x, y) => (y.w - x.w) || (y.nt - x.nt));
        return hits[0] || null;
      });
  }

  /* ── Drawing ───────────────────────────────────────────────────── */

  function topicsOf(room) {
    return (room && Array.isArray(room.topics) ? room.topics : [])
      .map((t) => ({
        label: String(t.t || "").trim(),
        statements: Number(t.npos || 0),
        pages: Number(t.np || 0),
        mentions: Number(t.n || 0),
        byWork: (Array.isArray(t.byw) ? t.byw : [])
          .filter((row) => Array.isArray(row) && row.length >= 3)
          .map((row) => ({ w: String(row[0] || ""), title: String(row[1] || ""), count: Number(row[2] || 0) })),
      }))
      .filter((t) => t.label && t.statements > 0)
      // Heaviest first. What a writer spent his pages on is the thing
      // this panel is for, and alphabetical order buries it.
      .sort((a, b) => b.statements - a.statements || a.label.localeCompare(b.label));
  }

  function workList(topic, hit) {
    const ol = el("ol", "fa-tp-works");
    // Twelve, then a count. A heavy topic runs to forty works and the
    // tail is ones and twos; the figure below says what was left out
    // rather than the list quietly stopping.
    const shown = topic.byWork.slice(0, 12);
    shown.forEach((row) => {
      const li = el("li", "fa-tp-work");
      const href = readerHref(row.w, null);
      const label = row.title || row.w;
      if (href) li.appendChild(link(href, label, "fa-tp-work-link"));
      else li.appendChild(el("span", "fa-tp-work-link fa-tp-work-flat", label));
      li.appendChild(el("span", "fa-tp-work-n", n(row.count)));
      ol.appendChild(li);
    });
    const rest = topic.byWork.length - shown.length;
    const wrap = el("div", "fa-tp-detail");
    wrap.appendChild(el("p", "fa-tp-detail-note",
      rest > 0
        ? `Recorded statements by work. These are the twelve heaviest of ${n(topic.byWork.length)} works.`
        : "Recorded statements by work. Every work carrying one is listed."));
    wrap.appendChild(ol);
    // The statements themselves live on the Compare desk, which is
    // built to read them. This page shows the arithmetic and hands the
    // reader over rather than printing a second, thinner copy.
    wrap.appendChild(link(
      `/the-faith-received/research/#compare&a=${encodeURIComponent(hit.s)}&sel=${encodeURIComponent(tslugOf(topic.label))}`,
      `Read ${hit.a} on ${topic.label}`,
      "fa-tp-open"));
    return wrap;
  }

  function drawTopics(list, hit, into) {
    into.textContent = "";
    if (!list.length) {
      into.appendChild(el("p", "fa-fp-note", "No topics are recorded for this author yet."));
      return;
    }
    const grid = el("div", "fa-tp-grid");
    list.forEach((topic, i) => {
      const card = el("section", "fa-tp-card");

      const head = el("h3", "fa-tp-topic", topic.label);
      card.appendChild(head);

      const figures = el("p", "fa-tp-figures");
      figures.appendChild(el("b", null, n(topic.statements)));
      figures.appendChild(el("span", null,
        ` recorded statement${topic.statements === 1 ? "" : "s"}${
          topic.pages ? ` on ${n(topic.pages)} page${topic.pages === 1 ? "" : "s"}` : ""}`));
      card.appendChild(figures);

      const regionId = `fa-tp-detail-${i}`;
      const toggle = el("button", "fa-tp-toggle", "Which works");
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", regionId);
      card.appendChild(toggle);

      const region = el("div", "fa-tp-region");
      region.id = regionId;
      region.hidden = true;
      card.appendChild(region);

      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", open ? "false" : "true");
        region.hidden = open;
        // Built once. Everything it needs came down with the room.
        if (!open && !region.firstChild) region.appendChild(workList(topic, hit));
      });

      grid.appendChild(card);
    });
    into.appendChild(grid);
  }

  /* ── Mount ─────────────────────────────────────────────────────── */

  /*
   * name  the heading the page resolved, which is what the rooms are
   *       most likely to agree with.
   * key   the folded ?a= value, kept as a second way in for a page
   *       reached by the slug a Compare column links with.
   * works every work on the shelf, for the collections and traditions
   *       that say which shelves are worth asking.
   * root  [data-faith-author].
   */
  function mount(name, key, works, root) {
    if (!root || !name) return;
    const shelves = shelvesFor(works);
    if (!shelves.length) return;

    findRoom(shelves, name, key).then((hit) => {
      if (!hit || !hit.nt) return;

      const panel = el("section", "fa-tp");
      panel.setAttribute("aria-labelledby", "fa-tp-head");
      const h2 = el("h2", "fa-tp-head", "Topic index");
      h2.id = "fa-tp-head";
      panel.appendChild(h2);
      panel.appendChild(el("p", "fa-tp-lede",
        `The mined index of the ${SHELVES[hit.sh]} shelf records what ${
          hit.a} writes about most. Every figure here is a count of recorded `
        + "statements rather than a summary of the argument. Open a topic to see "
        + "which works carry it."));

      const body = el("div", "fa-tp-body");
      body.appendChild(el("p", "fa-fp-note", "Loading…"));
      panel.appendChild(body);

      // Under reception where there is one, otherwise where reception
      // would have been: how he read, who he read among, what he wrote
      // about, then the shelf itself.
      const rc = root.querySelector(".fa-rc");
      const fp = root.querySelector(".fa-fp");
      const search = root.querySelector(".fa-search");
      const shelf = root.querySelector(".fa-shelf");
      if (rc) rc.insertAdjacentElement("afterend", panel);
      else if (fp) fp.insertAdjacentElement("afterend", panel);
      else if (search) root.insertBefore(panel, search);
      else if (shelf) root.insertBefore(panel, shelf);
      else root.appendChild(panel);

      // No count in the opening hint, on purpose. The roster's `nt`
      // counts every topic the miner touched and this panel draws the
      // ones that ended with a statement in them, which for Ambrose is
      // 47 against 75. Printing 75 and replacing it with 47 a second
      // later is a number that changed under the reader for no reason
      // they can see. The figure arrives once, correct, on open.
      const fold = window.MOAuthorPanels
        ? window.MOAuthorPanels.fold(panel, {
          id: "topic-index",
          hint: "Loaded when you open it",
        })
        : null;

      // The room is megabytes and most readers will not open this. The
      // fetch waits for the fold, which is the same reasoning the
      // Compare panel gives for waiting on its tab.
      let asked = false;
      function load() {
        if (asked) return;
        asked = true;
        getJSON(`${BASE}/v1/bible/${hit.sh}/rooms/${hit.s}.json`).then((room) => {
          if (!room) {
            body.textContent = "";
            body.appendChild(el("p", "fa-fp-note",
              "The topic index could not be loaded just now. It is a large file and the request may simply have timed out."));
            // Left askable. A reader who opens it again gets a second
            // attempt rather than a sentence that never changes.
            asked = false;
            return;
          }
          const list = topicsOf(room);
          drawTopics(list, hit, body);
          // The count the hint was holding a place for.
          const hint = panel.querySelector(".fa-fold-hint");
          if (hint) hint.textContent = `${n(list.length)} topic${list.length === 1 ? "" : "s"}`;
        });
      }

      if (fold) fold.addEventListener("toggle", () => { if (fold.open) load(); });
      else load();
      // openFromHash may have opened it already, before the listener
      // above existed, if the reader arrived at #topic-index.
      if (fold && fold.open) load();
    });
  }

  window.MOAuthorTopics = { mount };
}());
