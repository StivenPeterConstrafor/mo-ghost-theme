/*
 * The Faith Received — a collection's page
 *
 * The whole table of contents for one collection: every work, in the
 * row treatment the browse page uses. English title, the work's own
 * title beneath it where the catalogue carries one, then the author.
 *
 * Sorted by author, then by title within an author, so an author's
 * works sit together without a heading interrupting the list. Fifty to
 * a page, an A-Z rail keyed on the author's surname, and a box that
 * searches authors and titles at once.
 *
 * This replaced the author-card view, which showed a count and the
 * first five titles and repeated itself wherever an author had a
 * multi-volume set. A reader opening a table of contents wants the
 * works.
 *
 * Migne's three collections carry a second view beside that one. The
 * Patrologia is cited by volume and column, "PL 139 / 473a", and that
 * address is how every footnote in the discipline reaches it, so a
 * scholar who arrives at Patrologia Latina holding a citation and finds
 * only an A-Z of authors cannot get to what they came for. Those three
 * rooms therefore offer By volume beside By author. It is a second door
 * into the same shelf, not a replacement: By author stays the default,
 * because most readers have never seen a Migne citation. See SHELVES.
 *
 * The address lives in the query string, `?view=volume&vol=139` on the
 * two Latin and Greek series and `?view=tome&tome=2` on Patrologia
 * Orientalis, which is cited by tome and fascicle rather than by
 * volume. Same grammar as the rest of this page: short lowercase keys,
 * defaults omitted, written with replaceState.
 */

(function () {
  "use strict";

  const root = document.querySelector("[data-faith-room]");
  if (!root || !window.MOCorpora) return;

  const PAGE_SIZE = 50;
  const params = new URLSearchParams(window.location.search);
  // The page says which collection it is; ?collection= is only a
  // fallback for the shared /room/ route.
  const meta = document.querySelector('meta[name="tfr-room-collection"]');
  const collectionId = ((meta && meta.getAttribute("content")) ||
    params.get("collection") || "tfr").replace(/[^a-z0-9_-]/gi, "");

  let works = [];
  let tradition = params.get("tradition") || "";
  let denomination = params.get("denomination") || "";
  let century = parseInt(params.get("century"), 10) || 0;
  // Only meaningful on the all-works page, where more than one
  // collection is in the room at once.
  let collection = params.get("in") || "";
  let filter = params.get("q") || "";
  let letter = params.get("letter") || "";
  // What the box searches. "All" is the old behaviour and stays the
  // default; the others exist because a search for a name that is also
  // a common word — Baxter, whose name is in the title of everything
  // written against him — buries the man under the argument.
  const SCOPES = { all: "All", author: "Author", title: "Title", keyword: "Keyword" };
  let scope = SCOPES[params.get("scope")] ? params.get("scope") : "all";
  let page = Math.max(1, parseInt(params.get("page"), 10) || 1);

  // ── The shelf a collection is cited by ───────────────────────────
  //
  // Only Migne's three. The other collections are cited by title and
  // author like any other book, so a volume view there would be a door
  // onto nothing and they get no toggle at all.
  //
  //   of      the record's shelf mark, set in faith-corpora.js
  //   face    the catalogue's own name for a bucket, where it has one
  //   name    what the bucket is called in a heading
  //   cite    the address a footnote would print
  //   mark    what a row shows once the reader is inside the bucket
  //
  // `mark` returns nothing on the two Latin and Greek series: inside PL
  // 139 the volume number on every row is the one fact the reader
  // already has. Patrologia Orientalis is addressed one level finer, so
  // there the row carries its fascicle instead.
  const SHELVES = {
    pld: {
      view: "volume", param: "vol", tab: "By volume", one: "volume", many: "volumes",
      of: (w) => w.volume,
      face: () => "",
      name: (s) => (s.num ? `Patrologia Latina ${s.num}` : s.label || s.v),
      cite: (s) => (s.num ? `PL ${s.num}` : s.label || s.v),
      mark: () => "",
      lead: "Migne is cited by volume and column, as PL 139 / 473a. Choose a volume to see what it holds.",
    },
    pg: {
      view: "volume", param: "vol", tab: "By volume", one: "volume", many: "volumes",
      of: (w) => w.volume,
      face: () => "",
      name: (s) => (s.num ? `Patrologia Graeca ${s.num}` : s.label || s.v),
      cite: (s) => (s.num ? `PG ${s.num}` : s.label || s.v),
      mark: () => "",
      lead: "Migne is cited by volume and column, as PG 44 / 125a. Choose a volume to see what it holds.",
    },
    po: {
      view: "tome", param: "tome", tab: "By tome", one: "tome", many: "tomes",
      of: (w) => w.tome,
      // "Tome 2" for a numbered one, "Patrologia Syriaca" for the one
      // that is a series of its own. Both come from the catalogue.
      face: (w) => w.tomeLabel,
      name: (s) => s.label || s.v,
      cite: (s) => (s.num ? `PO ${s.num}` : s.label || s.v),
      mark: (w) => (w.fasc ? `fasc. ${w.fasc}` : ""),
      lead: "Patrologia Orientalis is cited by tome and page, as PO 2, 421. Choose a tome to see what it holds.",
    },
  };
  const shelf = collectionId === "all" ? null : SHELVES[collectionId] || null;
  // A hand-typed address is accepted on the shelf mark alone, so
  // `?vol=139` opens volume 139 without also being told which view that
  // is. Letters are kept because one bucket is named PS rather than
  // numbered; everything else is dropped, and the value is escaped on
  // output as well.
  let vol = shelf ? String(params.get(shelf.param) || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12) : "";
  let view = shelf && (vol || params.get("view") === shelf.view) ? shelf.view : "author";
  // Filled once the catalogue is in: shelf mark -> { v, num, label },
  // in the order the buckets are printed in.
  let shelfOrder = [];

  // "all" is every collection at once, which is what the century page
  // reads: one table of contents cut by date rather than by shelf.
  const ALL = ["pg", "pld", "po", "tfr", "eebo", "confessions", "augustine"];
  const isAll = collectionId === "all";
  const corpus = isAll ? null : window.MOCorpora.get(collectionId);
  root.innerHTML = '<p class="faith-room-status">Loading the collection&hellip;</p>';

  const source = isAll
    ? Promise.all(ALL.map((id) => window.MOCorpora.load(id).catch(() => [])))
        .then((sets) => sets.flat())
    : window.MOCorpora.load(collectionId);

  source.then((list) => {
    // Sort by the name the reader is scanning for, then by title so a
    // multi-volume set reads in order rather than in catalogue order.
    works = list.slice().sort((a, b) => {
      if (isAll) {
        const ac = cent(a) || 9999, bc = cent(b) || 9999;
        if (ac !== bc) return ac - bc;
      }
      const an = surname(a.author), bn = surname(b.author);
      return an.localeCompare(bn) || (a.title || "").localeCompare(b.title || "");
    });
    shelfOrder = indexShelves(works);
    render();
  });

  // Every shelf mark in the collection, once each, in the order the
  // set was printed. Built from the catalogue the room has already
  // loaded, so the grid of volumes costs no second request.
  //
  // Numbered buckets come first and in numeric order; anything else
  // follows, sorted by name. That is what puts the Patrologia Syriaca
  // at the end of Patrologia Orientalis rather than between tomes 1
  // and 2, where a string sort would have left it.
  function indexShelves(list) {
    if (!shelf) return [];
    const seen = new Map();
    list.forEach((w) => {
      const v = String(shelf.of(w) || "");
      if (!v || seen.has(v)) return;
      seen.set(v, {
        v,
        num: /^\d+$/.test(v) ? parseInt(v, 10) : 0,
        label: String(shelf.face(w) || ""),
      });
    });
    return [...seen.values()].sort((a, b) =>
      (a.num ? 0 : 1) - (b.num ? 0 : 1)
      || a.num - b.num
      || a.label.localeCompare(b.label)
      || a.v.localeCompare(b.v));
  }

  // The name a work files under. Two catalogue conventions collide
  // here, so the comma decides which one we are looking at.
  //
  //   Inverted, "Little, Richard, fl. 1645-1646". EEBO catalogues this
  //   way and it is 87% of that collection: 12,240 of 14,033 authors.
  //   The filing name is everything before the first comma. Reading
  //   the last word instead took a death date, which is why 7,521 EEBO
  //   authors sat under "#" and the rest filed under a forename.
  //
  //   Direct, "Johann Heinrich Alsted". The Latin corpora give names
  //   this way round, so the last word is the one to file under.
  //   Sorting the raw string here files every Johann together.
  //
  // Two things are never part of a direct name:
  //
  //   A trailing parenthetical is an editorial role or a byname, so
  //   "Heinrich Finke (ed.)" filed under "(" and the rail sent it to
  //   "#". Stripped, it lands under F, and "Council of Pisa (acta)"
  //   under P.
  //
  //   A second author after "&" is not who the work is filed under,
  //   but only where the first side is a whole name. "August Franzen &
  //   Wolfgang Müller" belongs at Franzen, the way a library shelves
  //   it. "Adrian & Peter Walenburg" is two brothers sharing one
  //   surname, so the "&" there joins forenames and the name to file
  //   under is still Walenburg. One word before the "&" means the
  //   surname is on the far side; two or more means it is not.
  //
  // Both fall back to the raw string rather than to nothing, so a name
  // that is only a parenthetical still sorts somewhere.
  const PARTICLE = /^(?:le|la|les|du|de|del|della|delle|di|da|dos|van|von|der|den|ten|ter)$/i;

  function surname(name) {
    // Square brackets around a name are the cataloguer saying the
    // attribution is conjectural, not part of it: "[Brothyel,
    // Mathias]" files at Brothyel like any other.
    const raw = String(name || "")
      .trim()
      .replace(/^\[+/, "")
      .replace(/\]+$/, "")
      .trim();
    if (!raw) return "￿";
    const comma = raw.indexOf(",");
    if (comma > 0) return raw.slice(0, comma).trim().toLowerCase();
    let n = raw.replace(/\s*\([^()]*\)\s*$/, "").trim() || raw;
    const amp = n.split(/\s+(?:&|and)\s+/i);
    if (amp.length > 1 && amp[0].trim().split(/\s+/).length > 1) n = amp[0].trim();
    const parts = n.split(/\s+/);
    // A capitalised particle opens the surname and is part of it, so
    // "Louis Le Blanc de Beaulieu" files at Le Blanc rather than at
    // Beaulieu. Jake went looking for Louis Le Blanc under L and found
    // nothing, because the last word of his name is a place.
    //
    // The particle must be followed by a capitalised word, or EEBO's
    // author field, which sometimes holds a Latin title, files
    // "Plutarch. De capienda ex inimicis utilitate" under D.
    for (let i = 1; i < parts.length - 1; i++) {
      if (PARTICLE.test(parts[i]) && /^[A-ZÀ-Þ]/.test(parts[i])
        && /^[A-ZÀ-Þ]/.test(parts[i + 1])) {
        return parts.slice(i).join(" ").toLowerCase();
      }
    }
    return parts[parts.length - 1].toLowerCase();
  }

  // The rail is A-Z, so a name opening on a diacritic needs folding
  // rather than a "#": Marcin Śmiglecki belongs under S. NFD splits
  // most accents off their letter; the handful below carry the stroke
  // inside the glyph and do not decompose, so they are mapped by hand.
  const STRUCK = { Ł: "L", Ø: "O", Đ: "D", Ð: "D", Þ: "T", Æ: "A", Œ: "O", ẞ: "S" };
  function initial(name) {
    const c = surname(name)
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .charAt(0)
      .toUpperCase();
    return /[A-Z]/.test(c) ? c : STRUCK[c] || "#";
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Only a declared tradition counts. The eyebrow is whatever a corpus
  // chooses to print under a title, and in Early English Books that is
  // the year of printing, so falling back to it turned every year from
  // 1641 to 1700 into its own filter. A corpus that says it has no
  // traditions gets no chips.
  function trad(w) {
    return String(w.tradition || "").trim();
  }

  // The tradition a work files under at the top level. A value with a
  // declared parent shows under that parent, so "Reformed" sits inside
  // "Protestant" rather than beside "Roman Catholic" as a peer. A value
  // with no parent is its own top level and does not move.
  function topTrad(w) {
    const t = trad(w);
    if (!t) return "";
    if (w._tp === undefined) {
      w._tp = (window.MOCorpora && window.MOCorpora.traditionParent
        ? window.MOCorpora.traditionParent(t, w.corpus) : "") || "";
    }
    return w._tp || t;
  }

  // What the second level is called depends on what it holds. Under
  // Protestant it is a denomination; under The Fathers it is one of
  // Migne's series and calling those a denomination is nonsense.
  const CHILD_LABEL = {
    Protestant: ["Denomination", "All denominations"],
    "The Fathers": ["Series", "All series"],
  };
  function childLabel(parent) {
    return CHILD_LABEL[parent] || ["Within", "All"];
  }

  // Children of the selected parent that are actually present, so a
  // collection only ever offers denominations it holds.
  function denomsUnder(list, parent) {
    const seen = new Map();
    list.forEach((w) => {
      if (topTrad(w) !== parent) return;
      const t = trad(w);
      // A work sitting on the parent itself (a pan-Protestant union
      // document) has no denomination and adds no option.
      if (!t || t === parent) return;
      seen.set(t, (seen.get(t) || 0) + 1);
    });
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }

  // Derived once per work on load, not per keystroke.
  function cent(w) {
    return w._c === undefined ? (w._c = window.MOCentury ? window.MOCentury.of(w) : 0) : w._c;
  }

  function matches(w) {
    if (tradition && topTrad(w) !== tradition) return false;
    if (denomination && trad(w) !== denomination) return false;
    if (century && cent(w) !== century) return false;
    if (collection && w.corpus !== collection) return false;
    if (!filter) return true;
    // Folded on both sides, so a reader who types the name the way it
    // is usually written finds it however the catalogue spells it:
    // "leblanc" reaches "Louis Le Blanc de Beaulieu", "sanchez" reaches
    // "Sánchez", "a lasco" reaches "à Lasco". Jake searched LeBlanc,
    // got nothing, and reasonably concluded the man was missing.
    const q = fold(filter);
    if (!q) return true;
    if (scope === "author") {
      if (w._qa === undefined) w._qa = fold(w.author || "");
      return w._qa.includes(q);
    }
    if (scope === "title") {
      if (w._qt === undefined) w._qt = fold(`${w.title || ""} ${w.titleLatin || ""}`);
      return w._qt.includes(q);
    }
    // Keyword reaches past the catalogue line into what the work is
    // about: the subject and the shelf it sits on, which is the only
    // description the library holds for most of these.
    if (scope === "keyword") {
      if (w._qk === undefined) {
        w._qk = fold([w.title, w.titleLatin, w.subject, w.topic, w.tradition,
          w.school, w.eyebrow, w.volume].filter(Boolean).join(" "));
      }
      return w._qk.includes(q);
    }
    if (w._q === undefined) {
      w._q = fold(`${w.title || ""} ${w.author || ""} ${w.titleLatin || ""}`);
    }
    return w._q.includes(q);
  }

  // Lowercase, strip accents, drop everything that is not a letter or a
  // number. Spaces go too, which is the point.
  function fold(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function pushState() {
    const q = new URLSearchParams();
    q.set("collection", collectionId);
    if (filter) q.set("q", filter);
    if (scope !== "all") q.set("scope", scope);
    if (tradition) q.set("tradition", tradition);
    if (denomination) q.set("denomination", denomination);
    if (century) q.set("century", String(century));
    if (collection) q.set("in", collection);
    if (letter) q.set("letter", letter);
    // By author is the default and, like the others here, is left out
    // rather than written down. The shelf mark is what makes a volume
    // linkable, so it is the half that matters.
    if (shelf && view !== "author") {
      q.set("view", shelf.view);
      if (vol) q.set(shelf.param, vol);
    }
    if (page > 1) q.set("page", String(page));
    window.history.replaceState(null, "", `?${q.toString()}`);
  }

  // A work, under its author's name. The author is the block heading,
  // so the row carries the title and the work's own title only.
  //
  // `mark` is the small line at the end of the row, and defaults to the
  // work's volume, which is what tells two printings of one title
  // apart. A caller that has already said which volume this is passes
  // its own, or an empty string for none.
  function row(w, mark) {
    const second = w.titleLatin && w.titleLatin !== w.title ? w.titleLatin : "";
    const second2 = second ? `<span class="brow-la">${escapeHtml(second)}</span>` : "";
    const m = mark === undefined ? w.volume : mark;
    const vol = m ? `<span class="brow-m">${escapeHtml(m)}</span>` : "";
    const inner = `<span class="brow-t">${escapeHtml(w.title || w.id)}</span>${second2}${vol}`;
    if (w.readable !== false && w.url) {
      return `<li><a href="${escapeHtml(w.url)}">${inner}</a></li>`;
    }
    return `<li class="faith-room-pending"><span class="faith-room-row">${inner}</span></li>`;
  }

  // One block per author, laid out two across, exactly as the traditions
  // are on the browse page.
  // An author with a long shelf spans the full width and runs their works
  // in two columns. A block cannot break across a column, so leaving
  // Aquinas in one would hold the left column for pages together and
  // leave the right one empty.
  const WIDE_AT = 10;

  function block(name, list, markOf) {
    const wide = list.length >= WIDE_AT ? " btrad--wide" : "";
    // The author heading goes to their page. "Unattributed" is a bucket
    // rather than a person, so it stays plain text.
    const key = fold(name);
    const head = key && name !== "Unattributed"
      ? `<a class="brow-author" href="/the-faith-received/author/?a=${encodeURIComponent(key)}">${escapeHtml(name)}</a>`
      : escapeHtml(name);
    const rows = list.map((w) => row(w, markOf ? markOf(w) : undefined)).join("");
    return `<div class="btrad${wide}">
  <h3>${head}</h3>
  <ul class="blist">${rows}</ul>
</div>`;
  }

  // ── The volume grid ──────────────────────────────────────────────
  //
  // One tile per volume, carrying its number and how many works it
  // holds. The counts are taken off the same filtered list the author
  // view is drawing, so a search narrows the grid the way it narrows
  // the A-Z rail, and a volume that holds nothing under the current
  // filters is not drawn at all. That is also the whole answer to dead
  // tiles: a tile exists because works were counted into it.
  //
  // A bucket with no number takes the full width of the grid and prints
  // its name. There is exactly one today, the Patrologia Syriaca, whose
  // 38 works are shelved under "PS" in the catalogue. "PS" alone means
  // nothing on a page, and dropping the bucket would lose the works.
  function volTile(s, n) {
    const held = `${n.toLocaleString()} work${n === 1 ? "" : "s"}`;
    const wide = s.num ? "" : " faith-room-vol--wide";
    const face = s.num ? String(s.num) : escapeHtml(s.label || s.v);
    return `<button type="button" class="faith-room-vol${wide}${s.v === vol ? " is-active" : ""}"`
      + ` data-room-vol="${escapeHtml(s.v)}"`
      + ` aria-label="${escapeHtml(shelf.name(s))}, ${held}">`
      + `<span class="faith-room-vol-n">${face}</span>`
      + `<span class="faith-room-vol-c">${held}</span></button>`;
  }

  function volGrid(list) {
    const counts = new Map();
    let unshelved = 0;
    list.forEach((w) => {
      const v = String(shelf.of(w) || "");
      if (v) counts.set(v, (counts.get(v) || 0) + 1); else unshelved += 1;
    });
    const tiles = shelfOrder.filter((s) => counts.get(s.v));
    if (!tiles.length) {
      return `<p class="faith-room-status">Nothing matches that. Try another name or title.</p>`;
    }
    // Said plainly rather than left to be noticed. Every work in all
    // three collections carries a shelf mark today, so this line does
    // not print; it is here so that a catalogue that stops carrying one
    // does not quietly shrink the library instead.
    const rest = unshelved
      ? `<p class="faith-room-undated">${unshelved.toLocaleString()} work${unshelved === 1 ? " names" : "s name"} no ${shelf.one}</p>`
      : "";
    return `<p class="faith-room-shelf-note">${escapeHtml(shelf.lead)}</p>`
      + `<div class="faith-room-vols">${tiles.map((s) => volTile(s, counts.get(s.v))).join("")}</div>${rest}`;
  }

  // The heading over one volume's works, with the address a footnote
  // would print and the way back to the grid. The address is dropped
  // where it only repeats the heading, which is the Patrologia Syriaca:
  // that bucket is named rather than numbered, so the two lines were
  // the same line twice.
  function volHead(s) {
    const cite = shelf.cite(s);
    const line = cite && cite !== shelf.name(s)
      ? `<p class="faith-room-vol-cite">Cited as ${escapeHtml(cite)}</p>` : "";
    return `<div class="faith-room-vol-head">`
      + `<h2>${escapeHtml(shelf.name(s))}</h2>${line}`
      + `<button type="button" class="faith-room-vol-back" data-room-vol="">`
      + `&larr; All ${escapeHtml(shelf.many)}</button></div>`;
  }

  function render() {
    const filtered = works.filter(matches);
    // Three states, not two. By author is the page as it has always
    // been; the volume view is either the grid of volumes or one volume
    // opened, and on the grid there is no list of works to page
    // through.
    const onShelf = Boolean(shelf) && view !== "author";
    const onGrid = onShelf && !vol;
    const chosen = onShelf && vol ? shelfOrder.find((s) => s.v === vol) : null;
    const scoped = onShelf
      ? (vol ? filtered.filter((w) => String(shelf.of(w) || "") === vol) : [])
      : (letter ? filtered.filter((w) => initial(w.author) === letter) : filtered);
    const pages = Math.max(1, Math.ceil(scoped.length / PAGE_SIZE));
    if (page > pages) page = pages;
    const slice = scoped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Group the page's works under their author, in the order they were
    // sorted, so an author is never split across two headings.
    const groups = [];
    slice.forEach((w) => {
      const name = (w.author || "").trim() || "Unattributed";
      const last = groups[groups.length - 1];
      if (last && last.name === name) {
        const key = `${(w.title || "").toLowerCase()}|${w.volume || ""}`;
        if (!last.seen.has(key)) { last.seen.add(key); last.works.push(w); }
      } else {
        groups.push({ name, works: [w], seen: new Set([`${(w.title || "").toLowerCase()}|${w.volume || ""}`]) });
      }
    });

    const inCounts = new Map();
    if (isAll) works.forEach((w) => inCounts.set(w.corpus, (inCounts.get(w.corpus) || 0) + 1));
    const ins = [...inCounts.entries()].sort((a, b) => b[1] - a[1]);

    const cs = new Map();
    let undated = 0;
    works.forEach((w) => {
      const c = cent(w);
      if (c) cs.set(c, (cs.get(c) || 0) + 1); else undated += 1;
    });
    const cents = [...cs.entries()].sort((a, b) => a[0] - b[0]);

    // Counted at the top level, so "Protestant" reports the whole of
    // its denominations rather than only the works sitting on it.
    const tCounts = new Map();
    works.forEach((w) => {
      const t = topTrad(w);
      if (t) tCounts.set(t, (tCounts.get(t) || 0) + 1);
    });
    const trads = [...tCounts.entries()].sort((a, b) => b[1] - a[1]);

    // Denominations are offered only once their parent is chosen, and
    // only where that parent actually has children here.
    const denoms = tradition ? denomsUnder(works, tradition) : [];

    function select(name, label, all, options, current) {
      if (options.length < 2) return "";
      const opts = options.map(([value, text, n]) =>
        `<option value="${escapeHtml(value)}"${String(current) === String(value) ? " selected" : ""}>`
        + `${escapeHtml(text)} (${n.toLocaleString()})</option>`).join("");
      return `<label class="faith-room-select"><span>${escapeHtml(label)}</span>`
        + `<select data-room-${name}><option value="">${escapeHtml(all)}</option>${opts}</select></label>`;
    }

    const cLabel = (c) => (window.MOCentury ? window.MOCentury.label(c) : `${c}`);
    const controls = [
      isAll ? select("in", "Collection", "All collections",
        ins.map(([id, n]) => {
          const c = window.MOCorpora.get(id);
          return [id, c ? c.label : id, n];
        }), collection) : "",
      select("cent", "Century", "All centuries",
        cents.map(([c, n]) => [c, cLabel(c), n]), century || ""),
      select("trad", "Tradition", "All traditions",
        trads.map(([t, n]) => [t, t, n]), tradition),
      // Always in the shell, shown only when it has something to offer.
      // Built here rather than injected on change, because the shell is
      // written once and rewriting it mid-gesture is what tore the
      // dropdowns out from under the reader before.
      `<label class="faith-room-select" data-room-denom-wrap hidden><span data-room-denom-label>Denomination</span><select data-room-denom></select></label>`,
    ].filter(Boolean).join("");
    const filters = controls
      ? `<div class="faith-room-filters">${controls}${undated ? `<p class="faith-room-undated">${undated.toLocaleString()} works carry no date</p>` : ""}</div>`
      : "";

    const letters = [...new Set(filtered.map((w) => initial(w.author)))]
      .sort((a, b) => (a === "#") - (b === "#") || a.localeCompare(b));

    const label = isAll ? "the whole library" : (corpus ? corpus.label : "the collection");
    // The rail files by the author's surname, which is the other view's
    // question. Inside a volume it would be a second index over at most
    // a few dozen works.
    const rail = letters.length > 1 && !onShelf
      ? `<nav class="faith-room-letters" aria-label="Jump to a letter"><button type="button" data-room-letter="" class="${letter ? "" : "is-active"}">All</button>${
          letters.map((l) => `<button type="button" data-room-letter="${l}" class="${letter === l ? "is-active" : ""}">${l}</button>`).join("")}</nav>`
      : "";
    const list = groups.length
      ? `<div class="btrads faith-room-blocks">${groups.map((g) => block(g.name, g.works, onShelf ? shelf.mark : null)).join("")}</div>`
      : `<p class="faith-room-status">Nothing matches that. Try another name or title.</p>`;
    // An address that names no volume in this collection is the one
    // case where a reader can arrive holding something we cannot open,
    // so it says so and puts the grid back within reach.
    let body = list;
    if (onGrid) {
      body = volGrid(filtered);
    } else if (onShelf && chosen) {
      body = volHead(chosen) + list;
    } else if (onShelf) {
      body = `<p class="faith-room-status">There is no ${escapeHtml(shelf.one)} ${escapeHtml(vol)} in ${escapeHtml(label)}.</p>`
        + `<p><button type="button" class="faith-room-vol-back" data-room-vol="">&larr; All ${escapeHtml(shelf.many)}</button></p>`;
    }

    // Two doors into the same shelf, and only where the collection has
    // a second one. By author is written first and is the default, so a
    // reader who has never heard of a Migne citation is not asked to
    // choose before they can read anything.
    const views = shelf
      ? `<nav class="faith-view-toggle faith-room-views" role="tablist" aria-label="How to browse this collection">`
        + `<button type="button" class="faith-view-toggle-tab" data-room-view="author" role="tab">By author</button>`
        + `<button type="button" class="faith-view-toggle-tab" data-room-view="${shelf.view}" role="tab">${escapeHtml(shelf.tab)}</button>`
        + `</nav>`
      : "";

    // What the count reports is whatever the reader is looking at: the
    // works in the collection, the volumes on the shelf, or the works
    // in the one volume they have opened.
    let counted = `${scoped.length.toLocaleString()} work${scoped.length === 1 ? "" : "s"} in ${escapeHtml(label)}`;
    if (onGrid) {
      const shelved = new Set();
      filtered.forEach((w) => {
        const v = String(shelf.of(w) || "");
        if (v) shelved.add(v);
      });
      counted = `${shelved.size.toLocaleString()} ${shelved.size === 1 ? shelf.one : shelf.many}`
        + ` &middot; ${filtered.length.toLocaleString()} work${filtered.length === 1 ? "" : "s"} in ${escapeHtml(label)}`;
    } else if (onShelf && chosen) {
      counted = `${scoped.length.toLocaleString()} work${scoped.length === 1 ? "" : "s"} in ${escapeHtml(shelf.name(chosen))}`;
    } else if (onShelf) {
      // An address that names nothing here. The collection's own total
      // is the true thing to print: a bare zero beside its name would
      // read as an empty shelf rather than a bad link.
      counted = `${filtered.length.toLocaleString()} work${filtered.length === 1 ? "" : "s"} in ${escapeHtml(label)}`;
    }

    // The search box and the selects are built once and left alone.
    // Rewriting the whole subtree on every render tore them out from
    // under the reader: an open dropdown vanished the moment it was
    // touched, because choosing an option rebuilt the element.
    if (!root.querySelector("[data-room-shell]")) {
      const scopeOpts = Object.keys(SCOPES).map((k) =>
        `<option value="${k}"${k === scope ? " selected" : ""}>${SCOPES[k]}</option>`).join("");
      root.innerHTML = `<div data-room-shell>${views}<div class="faith-room-head"><div class="faith-room-searchbar"><input type="search" class="faith-room-filter" data-room-filter placeholder="Search an author or a title&hellip;" value="${escapeHtml(filter)}" aria-label="Search this collection" /><label class="faith-room-scope"><span class="faith-room-scope-label">Search in</span><select data-room-scope aria-label="What to search">${scopeOpts}</select></label></div><p class="faith-room-count" data-room-count></p></div><div data-room-controls>${filters}</div><div data-room-rail></div><div data-room-list></div><div data-room-pager></div></div>`;
      wireOnce();
    }

    root.querySelector("[data-room-count]").innerHTML = counted;
    root.querySelector("[data-room-rail]").innerHTML = rail;
    root.querySelector("[data-room-list]").innerHTML = body;
    // The grid of volumes is one screen of tiles and has nothing to
    // page through.
    root.querySelector("[data-room-pager]").innerHTML = onGrid ? "" : pager(page, pages);

    // The toggle is part of the shell and is never rebuilt, so the
    // chosen view is marked on it here rather than written into it.
    root.querySelectorAll("[data-room-view]").forEach((b) => {
      const on = b.getAttribute("data-room-view") === view;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });

    // The denomination list follows the chosen tradition, so its options
    // are rewritten when that choice changes. Guarded on the option set
    // actually differing: this element must not be touched while the
    // reader has it open, and the only thing that changes it is a
    // different select.
    const dWrap = root.querySelector("[data-room-denom-wrap]");
    const dSel = root.querySelector("[data-room-denom]");
    if (dWrap && dSel) {
      const [dLabel, dAll] = childLabel(tradition);
      const dOpts = denoms.map(([t, n]) =>
        `<option value="${escapeHtml(t)}">${escapeHtml(t)} (${n.toLocaleString()})</option>`).join("");
      const want = denoms.length ? `<option value="">${escapeHtml(dAll)}</option>${dOpts}` : "";
      if (dSel.innerHTML !== want) dSel.innerHTML = want;
      const dSpan = root.querySelector("[data-room-denom-label]");
      if (dSpan && dSpan.textContent !== dLabel) dSpan.textContent = dLabel;
      dWrap.hidden = !denoms.length;
    }

    // Keep the selects in step with the state without replacing them.
    [["in", collection], ["cent", century || ""], ["trad", tradition],
      ["denom", denomination]].forEach(([k, v]) => {
      const el = root.querySelector(`[data-room-${k}]`);
      if (el && el.value !== String(v)) el.value = String(v);
    });

    wireList();
    pushState();
  }


  // 1 … 5 6 [7] 8 9 … 42
  //
  // Previous and Next alone make a reader who wants page nine press
  // Next seven times, and give no way at all to reach the end. The
  // window is the first page, the last, and two either side of where
  // the reader is; the gaps are elided rather than printing forty
  // numbers across a phone.
  function pageWindow(page, pages) {
    const out = [];
    const push = (n) => { if (out[out.length - 1] !== n) out.push(n); };
    push(1);
    if (page - 2 > 2) out.push(null);
    for (let n = Math.max(2, page - 2); n <= Math.min(pages - 1, page + 2); n += 1) push(n);
    if (page + 2 < pages - 1) out.push(null);
    if (pages > 1) push(pages);
    return out;
  }

  function pageLinks(page, pages, attr) {
    return pageWindow(page, pages).map((n) => (n === null
      ? '<span class="faith-pager-gap" aria-hidden="true">&hellip;</span>'
      : `<button type="button" class="faith-pager-num${n === page ? " is-current" : ""}"`
        + ` ${attr}="${n}"${n === page ? ' aria-current="page"' : ""}`
        + ` aria-label="Page ${n}">${n}</button>`)).join("");
  }

  function pager(p, pages) {
    if (pages < 2) return "";
    return `<nav class="faith-room-pager" aria-label="Pages">` +
      `<button type="button" data-room-page="${p - 1}" ${p <= 1 ? "disabled" : ""}>&larr; Previous</button>` +
      `<span class="faith-pager-nums">${pageLinks(p, pages, "data-room-page")}</span>` +
      `<button type="button" data-room-page="${p + 1}" ${p >= pages ? "disabled" : ""}>Next &rarr;</button>` +
      `</nav>`;
  }

  // Bound once, on elements that are never rebuilt.
  function wireOnce() {
    const input = root.querySelector("[data-room-filter]");
    if (input) {
      let t = null;
      input.addEventListener("input", () => {
        window.clearTimeout(t);
        t = window.setTimeout(() => {
          filter = input.value.trim();
          page = 1;
          render();
        }, 180);
      });
    }
    const onPick = (sel, apply) => {
      const el = root.querySelector(`[data-room-${sel}]`);
      if (!el) return;
      el.addEventListener("change", () => {
        apply(el.value);
        letter = "";
        page = 1;
        render();
      });
    };
    onPick("in", (v) => { collection = v; });
    onPick("cent", (v) => { century = parseInt(v, 10) || 0; });
    // Changing the tradition drops any denomination under the old one,
    // which would otherwise filter to nothing.
    onPick("trad", (v) => { tradition = v; denomination = ""; });
    onPick("denom", (v) => { denomination = v; });
    // Switching views drops the other view's place in the shelf: a
    // letter means nothing inside a volume, and a volume means nothing
    // under an A-Z.
    root.querySelectorAll("[data-room-view]").forEach((b) => {
      b.addEventListener("click", () => {
        const next = b.getAttribute("data-room-view");
        if (next === view) return;
        view = next;
        letter = "";
        vol = "";
        page = 1;
        render();
      });
    });
    const scopeEl = root.querySelector("[data-room-scope]");
    if (scopeEl) {
      scopeEl.addEventListener("change", () => {
        scope = SCOPES[scopeEl.value] ? scopeEl.value : "all";
        const box = root.querySelector("[data-room-filter]");
        if (box) {
          box.placeholder = scope === "author" ? "Search an author\u2026"
            : scope === "title" ? "Search a title\u2026"
              : scope === "keyword" ? "Search a subject or tradition\u2026"
                : "Search an author or a title\u2026";
        }
        letter = "";
        page = 1;
        render();
      });
    }
  }

  function wireList() {
    // Both the tiles and the way back out of one. An empty value is the
    // way back, which is why this reads the attribute rather than
    // trusting the button's class.
    root.querySelectorAll("[data-room-vol]").forEach((b) => {
      b.addEventListener("click", () => {
        vol = b.getAttribute("data-room-vol") || "";
        page = 1;
        render();
        root.scrollIntoView({ block: "start" });
      });
    });
    root.querySelectorAll("[data-room-letter]").forEach((b) => {
      b.addEventListener("click", () => {
        letter = b.getAttribute("data-room-letter");
        page = 1;
        render();
        root.scrollIntoView({ block: "start" });
      });
    });
    root.querySelectorAll("[data-room-page]").forEach((b) => {
      b.addEventListener("click", () => {
        const n = parseInt(b.getAttribute("data-room-page"), 10);
        if (!isNaN(n)) { page = n; render(); root.scrollIntoView({ block: "start" }); }
      });
    });
  }

})();
