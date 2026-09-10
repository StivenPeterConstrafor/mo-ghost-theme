/*
 * The Faith Received — Compare.
 *
 * Two to four authors set side by side on one topic, their statements
 * grouped by the work each came from. Binds to custom-faith-compare.hbs;
 * read that template's header for the DOM contract.
 *
 * PORTED FROM the corpus owner's comparison desk (`compareDesk()` in
 * his assets/js/port/compare.in03.js). His interaction model is kept
 * whole and is the reason this file is shaped the way it is:
 *
 *   - the ADDRESS IS THE VIEW. Everything that makes this screen what
 *     it is lives in the hash — which authors, which topic, which
 *     grouping, which stance, which phrase — so a comparison can be
 *     linked, bookmarked and saved without a server knowing anything.
 *   - AUTHORS ARE COLUMNS, capped at four and ordered oldest first, so
 *     reading left to right reads as a reception history.
 *   - THE TOPIC IS THE ROW. The topic list is the UNION of the authors'
 *     own topics with each author's count beside it, so a topic only
 *     one of them treats is visible as exactly that rather than hidden.
 *   - STATEMENTS GROUP BY WORK, collapsible, because "what does Calvin
 *     say about grace" is really "what does he say where".
 *
 * WHAT WAS DROPPED, AND WHY. His desk also carried a "where they meet"
 * finder that pairs statements from different authors by shared rare
 * vocabulary. It is genuinely clever and it is not here, because it
 * presents a lexical coincidence in a layout that reads as a scholarly
 * claim — two passages side by side under one heading. On a publication
 * that says its sources are extracted statements and sometimes
 * summaries, that is a claim we would be making on the reader's behalf
 * and could not stand behind. The columns say what each author says and
 * let the reader do the comparing, which is the honest version of the
 * same idea.
 *
 * WHERE THE DATA COMES FROM. Everything is mo-tfr-library, read from
 * the tfr-library-base meta tag the way every other Faith Received page
 * reads it. Four shapes, all already live:
 *
 *   /v1/bible/<shelf>/rooms/index.json      the roster, per shelf
 *   /v1/bible/<shelf>/rooms/<author>.json   one author: works + topics,
 *                                           each topic carrying a small
 *                                           selection of statements
 *   /v1/bible/<shelf>/rooms/t/<author>/<topic>.json
 *                                           that topic in full (Augustine
 *                                           on Sin: 400 statements against
 *                                           the room's 40)
 *   /v1/mine/topic2-all/<topic>.json        the topic across every author,
 *                                           and the paging contract below
 *
 * /v1/evidence AND WHY IT MAY 404. The topic export carries an
 * `evidence` contract — a snapshot id and a topic id — that the owner's
 * build pages through at GET /v1/evidence to reach the complete index
 * (12,075 statements for Augustine on Sin, against the 400 in the full
 * file). That endpoint is being built on our worker in a parallel
 * session and is NOT live yet: it 404s today, verified 2026-09-10.
 *
 * This file therefore treats deeper paging as an ENHANCEMENT and never
 * as the source of the screen. The full topic file is fetched first and
 * unconditionally, so every column has real statements with or without
 * the endpoint; loadMore() is only offered once a contract has been
 * seen AND a probe has come back non-404. A 404 sets `deepUnavailable`
 * on the cell and the column's own footnote says the complete index is
 * not open yet, naming the number actually loaded. Nothing spins, and
 * "we cannot page further today" never renders as "this author said
 * forty things about sin" — which is the one lie this screen could tell
 * that a reader would carry away and repeat.
 *
 * SAFETY. Every string on this screen came off the network. There is no
 * innerHTML anywhere below: rows are built with createElement and
 * textContent, and the only hrefs are ones this file constructs itself
 * from an id it has already matched against /^[a-z0-9-]+$/ and then
 * passes through MOSafeHref. The `h` field the data carries IS a URL
 * and is deliberately ignored — it addresses the owner's own site, and
 * re-pointing a fetched URL is exactly the sink that shipped an XSS
 * here before.
 */
(function () {
  "use strict";

  const root = document.querySelector("[data-cmp-root]");
  if (!root) return;

  const baseMeta = document.querySelector('meta[name="tfr-library-base"]');
  const BASE = ((baseMeta && baseMeta.content) || "").replace(/\/$/, "");

  /* ── Elements ────────────────────────────────────────────────── */

  const authorsEl = root.querySelector("[data-cmp-authors]");
  const addForm = root.querySelector("[data-cmp-add-form]");
  const addInput = root.querySelector("[data-cmp-add]");
  const addList = root.querySelector("[data-cmp-add-list]");
  const addNote = root.querySelector("[data-cmp-add-note]");
  const toolsEl = root.querySelector("[data-cmp-tools]");
  const groupSel = root.querySelector("[data-cmp-group]");
  const stanceSel = root.querySelector("[data-cmp-stance]");
  const phraseInput = root.querySelector("[data-cmp-phrase]");
  const topicsWrap = root.querySelector("[data-cmp-topics-wrap]");
  const topicsEl = root.querySelector("[data-cmp-topics]");
  const topicHeadEl = root.querySelector("[data-cmp-topic-head]");
  const columnsEl = root.querySelector("[data-cmp-columns]");
  const statusEl = root.querySelector("[data-cmp-status]");
  const emptyEl = root.querySelector("[data-cmp-empty]");
  const saveBtn = root.querySelector("[data-cmp-save]");
  const exportBtn = root.querySelector("[data-cmp-export]");
  const savedWrap = root.querySelector("[data-cmp-saved]");
  const savedList = root.querySelector("[data-cmp-saved-list]");
  const savedCount = root.querySelector("[data-cmp-saved-count]");

  /* ── The nine shelves ────────────────────────────────────────── *
   * Byte-identical to the owner's own shelf map, and to the nine
   * traditions the Research page's scope control offers. A shelf key
   * that is not one of these has no room index, so the roster fetch for
   * it would 404 rather than return nothing. */
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

  // The four stances the extraction records. `qualifies` is shown as
  // "qualifies or other" because the data also carries a handful of
  // rows with no stance at all, and a filter that silently excluded
  // them would under-report an author.
  const STANCES = [
    ["asserts", "Asserts"],
    ["denies", "Denies"],
    ["reports", "Reports another view"],
    ["qualifies", "Qualifies or other"],
  ];

  const MAX_AUTHORS = 4;

  /* ── State ───────────────────────────────────────────────────── */

  let state = { a: [], sel: "", g: "work", s: "", q: "" };
  let roster = null; // [{a, s, sh, y, w, n}]
  let rosterMissing = []; // shelves that failed, named on screen
  let authors = []; // resolved, ordered oldest first
  let topics = []; // union of the authors' topics
  let current = null; // the selected topic row
  const cells = new Map(); // author slug + "|" + topic slug -> cell
  const roomCache = new Map();
  const fullCache = new Map();
  const exportCache = new Map();
  let evidenceOpen = null; // null = unprobed, false = 404, true = live
  let run = 0; // guards against a stale fetch painting

  /* ── Small helpers ───────────────────────────────────────────── */

  const SLUG = /^[a-z0-9][a-z0-9-]*$/;
  const isSlug = (s) => typeof s === "string" && SLUG.test(s);

  const fold = (s) => String(s == null ? "" : s)
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ").trim();

  const tslugOf = (t) => fold(t).replace(/ /g, "-") || "topic";

  const fmt = (n) => Number(n || 0).toLocaleString();

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  // Fetch JSON, resolving to null on any failure. Every caller treats
  // null as "this piece is not available" and says so on screen rather
  // than throwing the whole page away.
  function getJSON(url) {
    return fetch(url, { signal: AbortSignal.timeout(25000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }

  /* ── Reader links ────────────────────────────────────────────── *
   * Mirrors readerUrlFor() in website/workers/tfr-library/lib/collections.js
   * and readerUrl() in assets/js/lib/faith-notebook-store.js: the
   * corpus goes in `c=` and the work's own id in `w=`, with `c` omitted
   * for the native collection. `pld-2809` is corpus pld and work 2809 —
   * `?w=pld-2809` loads nothing at all.
   *
   * The page is appended ONLY for the two collections that have real
   * printed pages. Patrologia Latina and our own English editions are
   * stored as sections and rows with no page numbering, so a `p=` there
   * would be a number the reader could not find on the page it landed
   * on. The statement's own `h` anchor is not used: it addresses the
   * owner's reader, whose block ids are not ours. */
  const PREFIXES = [
    [/^pld-/, "pld", 4, false],
    [/^mo-/, "mo", 3, false],
    [/^eebo-/, "eebo", 5, true],
    [/^pg-/, "pg", 3, false],
  ];

  function readerHref(work, page) {
    const w = String(work || "");
    if (!w) return "";
    let corpus = "";
    let id = w;
    let hasPages = true;
    for (let i = 0; i < PREFIXES.length; i += 1) {
      if (PREFIXES[i][0].test(w)) {
        corpus = PREFIXES[i][1];
        id = w.slice(PREFIXES[i][2]);
        hasPages = PREFIXES[i][3];
        break;
      }
    }
    const params = [];
    if (corpus) params.push(`c=${encodeURIComponent(corpus)}`);
    params.push(`w=${encodeURIComponent(id)}`);
    if (hasPages && page != null && page !== "") params.push(`p=${encodeURIComponent(page)}`);
    return `/the-faith-received/reader/?${params.join("&")}`;
  }

  // The one place a link is made. Built from ids this file validated,
  // then through MOSafeHref anyway — belt and braces, because the cost
  // of being wrong here is an XSS and the cost of the extra call is
  // nothing.
  function link(href, text, cls) {
    const a = el("a", cls, text);
    if (window.MOSafeHref) window.MOSafeHref.set(a, href, "#");
    else a.setAttribute("href", href || "#");
    return a;
  }

  /* ── The address ─────────────────────────────────────────────── */

  function parseHash() {
    const P = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
    const list = (P.get("a") || "").split(",").map((x) => x.trim()).filter(isSlug).slice(0, MAX_AUTHORS);
    return {
      a: list,
      sel: P.get("sel") || "",
      g: P.get("g") === "canon" ? "canon" : "work",
      s: STANCES.some((x) => x[0] === P.get("s")) ? P.get("s") : "",
      q: P.get("q") || "",
    };
  }

  function hashOf(st) {
    let h = `#a=${st.a.map(encodeURIComponent).join(",")}`;
    if (st.sel) h += `&sel=${encodeURIComponent(st.sel)}`;
    if (st.g !== "work") h += `&g=${st.g}`;
    if (st.s) h += `&s=${encodeURIComponent(st.s)}`;
    if (st.q) h += `&q=${encodeURIComponent(st.q)}`;
    return h;
  }

  function writeHash() {
    const h = hashOf(state);
    if (location.hash !== h) history.replaceState(null, "", location.pathname + location.search + h);
    paintSaved();
  }

  /* ── Saved views ─────────────────────────────────────────────── *
   * A saved view is an ADDRESS and a name, nothing more: re-opening it
   * re-fetches, so a view saved in March shows what the library holds
   * today rather than a stale copy of what it held in March. Kept in
   * this browser, and the page says so. */
  const VIEWS_KEY = "fr_compare_views";

  function readViews() {
    try {
      const v = JSON.parse(window.localStorage.getItem(VIEWS_KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (_) {
      return [];
    }
  }

  function writeViews(v) {
    try {
      window.localStorage.setItem(VIEWS_KEY, JSON.stringify(v.slice(0, 60)));
      return true;
    } catch (_) {
      return false;
    }
  }

  function say(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  /* ── Roster ──────────────────────────────────────────────────── */

  function loadRoster() {
    if (roster) return Promise.resolve(roster);
    const keys = Object.keys(SHELVES);
    return Promise.all(keys.map((sh) => getJSON(`${BASE}/v1/bible/${sh}/rooms/index.json`)
      .then((d) => ({ sh, rows: d && Array.isArray(d.authors) ? d.authors : null }))))
      .then((parts) => {
        rosterMissing = parts.filter((p) => !p.rows).map((p) => SHELVES[p.sh]);
        const rows = [];
        parts.forEach((p) => {
          (p.rows || []).forEach((r) => {
            if (isSlug(r.s)) rows.push({ a: String(r.a || r.s), s: r.s, sh: p.sh, y: r.y, w: r.w, n: r.n });
          });
        });
        // One row per author: the same person can keep a room on more
        // than one shelf, and the heaviest is the one with the works.
        const best = new Map();
        rows.forEach((r) => {
          const cur = best.get(r.s);
          if (!cur || (r.w || 0) > (cur.w || 0)) best.set(r.s, r);
        });
        roster = [...best.values()].sort((x, y) => x.a.localeCompare(y.a));
        return roster;
      });
  }

  function rosterRow(slug) {
    return (roster || []).filter((r) => r.s === slug)[0] || null;
  }

  function whenOf(r) {
    return [r.y ? `c. ${r.y}` : "", SHELVES[r.sh] || ""].filter(Boolean).join(" · ");
  }

  /* ── Author rooms and topics ─────────────────────────────────── */

  function loadRoom(r) {
    const k = `${r.sh}/${r.s}`;
    if (!roomCache.has(k)) roomCache.set(k, getJSON(`${BASE}/v1/bible/${r.sh}/rooms/${r.s}.json`));
    return roomCache.get(k);
  }

  function loadFull(sh, slug, tslug) {
    const k = `${sh}/${slug}/${tslug}`;
    if (!fullCache.has(k)) fullCache.set(k, getJSON(`${BASE}/v1/bible/${sh}/rooms/t/${slug}/${tslug}.json`));
    return fullCache.get(k);
  }

  function loadExport(reg) {
    if (!exportCache.has(reg)) exportCache.set(reg, getJSON(`${BASE}/v1/mine/topic2-all/${reg}.json`));
    return exportCache.get(reg);
  }

  // A statement row, normalised. `q` is the extracted statement, `g`
  // the page annotation where there is one; a row with neither is
  // dropped, since an empty blockquote under a citation reads as a
  // passage that says nothing.
  function rows(list) {
    return (list || [])
      .map((r) => ({
        q: String(r.q || ""),
        g: String(r.g || ""),
        s: String(r.s || ""),
        w: String(r.w || ""),
        wt: String(r.wt || ""),
        p: r.p == null ? null : r.p,
      }))
      .filter((r) => r.q || r.g);
  }

  const rowKey = (r) => `${r.w}|${r.p}|${(r.q || r.g).slice(0, 60)}`;

  /* ── Building the author set ─────────────────────────────────── */

  async function resolveAuthors(token) {
    const out = [];
    for (const slug of state.a) {
      const r = rosterRow(slug);
      if (!r) continue;
      const room = await loadRoom(r);
      if (token !== run) return null;
      if (!room) continue;
      const works = new Map();
      (room.works || []).forEach((w) => works.set(String(w.w), w));
      const byTopic = new Map();
      (room.topics || []).forEach((t) => {
        const label = String(t.t || "").trim();
        if (!label) return;
        byTopic.set(fold(label), {
          label,
          tslug: tslugOf(label),
          npos: t.npos || 0,
          full: !!t.full,
          pos: t.pos || [],
          pages: t.pages || [],
          byw: t.byw || [],
        });
      });
      out.push({ s: slug, a: String(room.a || r.a), sh: r.sh, r, works, topics: byTopic });
    }
    // Oldest first, so left-to-right reads as a reception history.
    out.sort((x, y) => ((x.r.y || 9999) - (y.r.y || 9999)) || x.a.localeCompare(y.a));
    return out;
  }

  function buildTopics() {
    const map = new Map();
    authors.forEach((au, i) => {
      au.topics.forEach((t, key) => {
        if (!map.has(key)) {
          map.set(key, {
            key,
            label: t.label,
            tslug: t.tslug,
            counts: authors.map(() => 0),
            parts: authors.map(() => null),
          });
        }
        const row = map.get(key);
        row.counts[i] = t.npos || 0;
        row.parts[i] = t;
      });
    });
    topics = [...map.values()]
      .map((t) => ({ ...t, total: t.counts.reduce((n, x) => n + x, 0), shared: t.counts.filter(Boolean).length }))
      .filter((t) => t.total > 0)
      // Shared first, then weight. A topic every author treats is the
      // one worth comparing; a topic only one of them treats is still
      // listed, and its count column says so at a glance.
      .sort((x, y) => (y.shared - x.shared) || (y.total - x.total) || x.label.localeCompare(y.label));
  }

  /* ── Cells ───────────────────────────────────────────────────── */

  function cellFor(au, topic) {
    const k = `${au.s}|${topic.tslug}`;
    if (!cells.has(k)) {
      cells.set(k, {
        rows: [], seen: new Set(), total: 0, loading: true,
        contract: null, author: null, cursor: null,
        done: false, deepUnavailable: false, failed: false, open: new Set(),
      });
    }
    return cells.get(k);
  }

  async function fillCell(au, topic, token) {
    const cell = cellFor(au, topic);
    const idx = authors.indexOf(au);
    const part = topic.parts[idx];
    if (!part) { cell.loading = false; return; }

    // The room's own selection first, so a column has something in it
    // while the full file is still in flight.
    if (!cell.rows.length) {
      rows(part.pos).forEach((r) => {
        const k = rowKey(r);
        if (!cell.seen.has(k)) { cell.seen.add(k); cell.rows.push(r); }
      });
      cell.total = part.npos || cell.rows.length;
      paintColumns();
    }

    const full = part.full ? await loadFull(au.sh, au.s, topic.tslug) : null;
    if (token !== run) return;
    if (full) {
      rows(full.pos).forEach((r) => {
        const k = rowKey(r);
        if (!cell.seen.has(k)) { cell.seen.add(k); cell.rows.push(r); }
      });
    } else if (part.full) {
      // The room said a full file existed and it did not answer. Say
      // so: the column is a SAMPLE, not the author's whole hand.
      cell.failed = true;
    }
    cell.loading = false;
    paintColumns();
    probeDeep(au, topic, cell, token);
  }

  /* ── The deep index: pending on /v1/evidence ─────────────────── *
   * The topic export carries the paging contract. We fetch it for the
   * count alone — knowing an author has 12,075 statements when 400 are
   * loaded is worth saying even when nothing can page further — and
   * probe the endpoint once per page load. A 404 is not an error here;
   * it is the expected answer today, and it is recorded as
   * `deepUnavailable` so the footnote can be honest rather than silent. */
  async function probeDeep(au, topic, cell, token) {
    const reg = topic.reg || topic.tslug;
    const ex = await loadExport(reg);
    if (token !== run) return;
    if (!ex || !ex.evidence || !Array.isArray(ex.authors)) return;
    const mine = ex.authors.filter((x) => x.s === au.s)[0];
    if (!mine) return;
    cell.contract = ex.evidence;
    cell.author = mine;
    if (mine.np && mine.np > cell.total) cell.total = mine.np;

    if (evidenceOpen === false) { cell.deepUnavailable = true; paintColumns(); return; }
    if (evidenceOpen === null) {
      const probe = await fetch(`${BASE}/v1/evidence?${new URLSearchParams({
        snapshot: String(ex.evidence.snapshot || ""),
        topic: String(ex.evidence.topic || ""),
        author: String(mine.id || mine.s || ""),
        limit: "1",
      })}`, { signal: AbortSignal.timeout(20000) }).catch(() => null);
      if (token !== run) return;
      evidenceOpen = !!(probe && probe.ok);
    }
    cell.deepUnavailable = !evidenceOpen;
    paintColumns();
  }

  /* ── Filtering ───────────────────────────────────────────────── */

  function matches(r) {
    if (state.s && r.s !== state.s) return false;
    if (state.q) {
      const needle = fold(state.q);
      if (needle && fold(`${r.q} ${r.g}`).indexOf(needle) === -1) return false;
    }
    return true;
  }

  function groupsOf(au, cell) {
    const kept = cell.rows.filter(matches);
    const byWork = new Map();
    kept.forEach((r) => {
      if (!byWork.has(r.w)) byWork.set(r.w, []);
      byWork.get(r.w).push(r);
    });
    const out = [...byWork.entries()].map(([w, rs]) => {
      const meta = au.works.get(w);
      return {
        w,
        label: (meta && meta.t) || rs[0].wt || w || "Source work",
        sub: (meta && meta.vs) || "",
        rows: rs.slice().sort((a, b) => (Number(a.p) || 0) - (Number(b.p) || 0)),
      };
    });
    if (state.g === "canon") out.sort((x, y) => x.label.localeCompare(y.label));
    else out.sort((x, y) => y.rows.length - x.rows.length || x.label.localeCompare(y.label));
    return out;
  }

  /* ── Painting ────────────────────────────────────────────────── */

  function paintAuthors() {
    clear(authorsEl);
    authors.forEach((au, i) => {
      const chip = el("span", "cmp-chip");
      chip.appendChild(link(`/the-faith-received/author/?a=${encodeURIComponent(au.s)}`, au.a, "cmp-chip-name"));
      chip.appendChild(el("small", "cmp-chip-when", whenOf(au.r)));
      const x = el("button", "cmp-chip-remove", "×");
      x.type = "button";
      x.setAttribute("aria-label", `Remove ${au.a} from the comparison`);
      x.addEventListener("click", () => {
        state.a = state.a.filter((s) => s !== au.s);
        writeHash();
        render();
        (addInput || authorsEl).focus();
      });
      chip.appendChild(x);
      authorsEl.appendChild(chip);
      if (i < authors.length - 1) authorsEl.appendChild(document.createTextNode(" "));
    });
    const full = authors.length >= MAX_AUTHORS;
    if (addForm) addForm.hidden = full;
    if (addNote) {
      addNote.hidden = !full;
      addNote.textContent = full
        ? "Four authors is the width of the desk. Remove one to add another."
        : "";
    }
  }

  function paintAddList() {
    if (!addList || !roster) return;
    clear(addList);
    const chosen = new Set(state.a);
    const needle = fold(addInput ? addInput.value : "");
    roster
      .filter((r) => !chosen.has(r.s))
      .filter((r) => !needle || fold(r.a).indexOf(needle) !== -1)
      .slice(0, 40)
      .forEach((r) => {
        const o = el("option");
        o.value = r.a;
        o.label = `${SHELVES[r.sh] || ""} · ${fmt(r.w)} works`;
        addList.appendChild(o);
      });
  }

  function paintTopics() {
    if (!topicsEl) return;
    clear(topicsEl);
    if (!topics.length) {
      topicsEl.appendChild(el("p", "cmp-note", authors.length
        ? "No topics are recorded for these authors."
        : ""));
      return;
    }
    topics.forEach((t) => {
      const b = el("button", "cmp-topic");
      b.type = "button";
      b.setAttribute("role", "tab");
      const on = !!current && current.key === t.key;
      b.setAttribute("aria-selected", String(on));
      if (on) b.classList.add("is-active");
      if (t.shared < authors.length) b.classList.add("cmp-topic-partial");
      b.appendChild(el("span", "cmp-topic-label", t.label));
      const counts = el("span", "cmp-topic-counts");
      authors.forEach((au, i) => {
        const c = el("span", "cmp-topic-count");
        c.appendChild(el("i", null, au.a));
        c.appendChild(el("b", null, fmt(t.counts[i])));
        counts.appendChild(c);
      });
      b.appendChild(counts);
      b.addEventListener("click", () => selectTopic(t));
      topicsEl.appendChild(b);
    });
  }

  function paintTopicHead() {
    if (!topicHeadEl) return;
    clear(topicHeadEl);
    if (!current) return;
    const h = el("h2", "cmp-topic-title", current.label);
    topicHeadEl.appendChild(h);
    const line = authors
      .map((au, i) => `${au.a} ${fmt(current.counts[i])}`)
      .join(" · ");
    topicHeadEl.appendChild(el("p", "cmp-note", `${line} recorded statements`));
  }

  function statementNode(r, au) {
    const art = el("article", "cmp-statement");
    if (r.q) art.appendChild(el("blockquote", "cmp-quote", r.q));
    if (r.g) art.appendChild(el("p", "cmp-gloss", r.g));
    const cite = el("p", "cmp-cite");
    const meta = au.works.get(r.w);
    const title = (meta && meta.t) || r.wt || r.w || "Source work";
    cite.appendChild(el("span", "cmp-cite-work", title));
    if (r.s) cite.appendChild(el("span", "cmp-stance", r.s));
    const href = readerHref(r.w, r.p);
    if (href) cite.appendChild(link(href, "Read the passage", "cmp-read"));
    art.appendChild(cite);
    return art;
  }

  function paintColumns() {
    if (!columnsEl) return;
    clear(columnsEl);
    if (!current || !authors.length) return;
    columnsEl.style.setProperty("--cmp-cols", String(authors.length));

    authors.forEach((au) => {
      const cell = cellFor(au, current);
      const col = el("section", "cmp-col");

      const head = el("header", "cmp-col-head");
      const h = el("h3", "cmp-col-name");
      h.appendChild(link(`/the-faith-received/author/?a=${encodeURIComponent(au.s)}`, au.a));
      head.appendChild(h);
      head.appendChild(el("p", "cmp-note", whenOf(au.r)));
      col.appendChild(head);

      const groups = groupsOf(au, cell);
      const shown = groups.reduce((n, g) => n + g.rows.length, 0);

      // The count line, and the one place the deep index is talked
      // about. Four different truths, four different sentences.
      const prog = el("p", "cmp-progress");
      if (cell.loading) prog.textContent = "Loading…";
      else if (!cell.rows.length) prog.textContent = "No statements recorded on this topic.";
      else {
        let t = `${fmt(shown)} of ${fmt(cell.rows.length)} loaded`;
        if (shown === cell.rows.length) t = `${fmt(shown)} loaded`;
        if (cell.total > cell.rows.length) {
          t += cell.deepUnavailable
            ? `, of ${fmt(cell.total)} in the index. The rest of the index is not open yet.`
            : `, of ${fmt(cell.total)} in the index.`;
        } else t += ".";
        if (cell.failed) t += " This is the room's selection; the full file did not answer.";
        prog.textContent = t;
      }
      col.appendChild(prog);

      const body = el("div", "cmp-col-body");
      if (!cell.loading && cell.rows.length && !shown) {
        body.appendChild(el("p", "cmp-note", "No loaded statements match these filters."));
      }
      groups.forEach((g) => {
        const d = el("details", "cmp-work");
        if (cell.open.has(g.w) || (!cell.open.size && g === groups[0])) d.open = true;
        const sum = el("summary", "cmp-work-head");
        const t = el("span", "cmp-work-title", g.label);
        sum.appendChild(t);
        if (g.sub) sum.appendChild(el("small", "cmp-work-sub", g.sub));
        sum.appendChild(el("small", "cmp-work-n", fmt(g.rows.length)));
        d.appendChild(sum);
        const wrap = el("div", "cmp-work-body");
        g.rows.forEach((r) => wrap.appendChild(statementNode(r, au)));
        const openWork = readerHref(g.w, null);
        if (openWork) wrap.appendChild(link(openWork, "Open the work", "cmp-open-work"));
        d.appendChild(wrap);
        d.addEventListener("toggle", () => {
          if (d.open) cell.open.add(g.w);
          else cell.open.delete(g.w);
        });
        body.appendChild(d);
      });
      col.appendChild(body);
      columnsEl.appendChild(col);
    });
  }

  function paintSaved() {
    if (!savedList) return;
    const views = readViews();
    const here = hashOf(state);
    if (savedCount) savedCount.textContent = views.length ? `${fmt(views.length)} in this browser` : "none yet";
    clear(savedList);
    if (!views.length) {
      savedList.appendChild(el("p", "cmp-note",
        "Save a comparison and it appears here, kept in this browser."));
      return;
    }
    views.forEach((v) => {
      const row = el("div", "cmp-saved-row");
      if (v.hash === here) row.classList.add("is-active");
      row.appendChild(link(`/the-faith-received/compare/${v.hash}`, v.name, "cmp-saved-name"));
      row.appendChild(el("small", "cmp-saved-meta",
        (v.authors || []).join(" · ") + (v.topic ? ` · ${v.topic}` : "") + (v.hash === here ? " · this view" : "")));
      const del = el("button", "cmp-saved-remove", "Remove");
      del.type = "button";
      del.setAttribute("aria-label", `Remove the saved view ${v.name}`);
      del.addEventListener("click", () => {
        writeViews(readViews().filter((x) => x.id !== v.id));
        paintSaved();
        say("Saved view removed.");
      });
      row.appendChild(del);
      savedList.appendChild(row);
    });
  }

  /* ── Actions ─────────────────────────────────────────────────── */

  function selectTopic(t) {
    current = t;
    state.sel = t.tslug;
    writeHash();
    paintTopics();
    paintTopicHead();
    paintColumns();
    const token = run;
    authors.forEach((au) => {
      const cell = cellFor(au, t);
      if (!cell.rows.length && cell.loading !== false) fillCell(au, t, token);
    });
    if (topicHeadEl) topicHeadEl.setAttribute("tabindex", "-1");
    if (topicHeadEl) topicHeadEl.focus({ preventScroll: false });
  }

  function saveView() {
    if (!authors.length) { say("Add an author before saving a view."); return; }
    const hash = hashOf(state);
    const views = readViews();
    const existing = views.filter((v) => v.hash === hash)[0];
    const name = [
      authors.map((a) => a.a).join(" · "),
      current ? `on ${current.label}` : "",
    ].filter(Boolean).join(" ");
    const entry = {
      id: existing ? existing.id : `v${Date.now().toString(36)}`,
      name: (existing && existing.name) || name || "Comparison",
      hash,
      authors: authors.map((a) => a.a),
      topic: current ? current.label : "",
      at: new Date().toISOString().slice(0, 10),
    };
    const ok = writeViews([entry].concat(views.filter((v) => v.hash !== hash)));
    paintSaved();
    say(ok
      ? "Saved in this browser."
      : "This view could not be saved. Your browser's storage for this site is full.");
  }

  // Compare's one hand-off to the Desk: the comparison on screen
  // becomes a draft with every statement quoted and cited. The Desk
  // reads the same store, so this is a write and a redirect, not an
  // integration.
  function exportToDesk() {
    if (!window.MOFaithDesk) { say("The Desk could not be opened from here."); return; }
    if (!current || !authors.length) { say("Choose a topic before sending this to the Desk."); return; }

    const doc = document.createElement("div");
    const title = `${authors.map((a) => a.a).join(", ")} on ${current.label}`;
    const h1 = document.createElement("h2");
    h1.textContent = title;
    doc.appendChild(h1);

    const intro = document.createElement("p");
    intro.textContent = "These are extracted statements, sometimes summarised or translated, "
      + "and not always direct quotations. A statement can report another speaker or a view its "
      + "author rejects. Read each passage in its source before attributing it.";
    doc.appendChild(intro);

    let n = 0;
    authors.forEach((au) => {
      const cell = cellFor(au, current);
      const groups = groupsOf(au, cell);
      if (!groups.length) return;
      const h = document.createElement("h3");
      h.textContent = `${au.a} — ${whenOf(au.r)}`;
      doc.appendChild(h);
      groups.forEach((g) => {
        const hw = document.createElement("p");
        const b = document.createElement("strong");
        b.textContent = g.label;
        hw.appendChild(b);
        doc.appendChild(hw);
        g.rows.forEach((r) => {
          n += 1;
          const bq = document.createElement("blockquote");
          const p = document.createElement("p");
          p.textContent = r.q || r.g;
          bq.appendChild(p);
          const cite = document.createElement("cite");
          cite.textContent = `${au.a}, ${g.label}${r.p != null ? `, ${r.p}` : ""}${r.s ? ` · ${r.s}` : ""}`;
          const href = readerHref(r.w, r.p);
          if (href && window.MOSafeHref && window.MOSafeHref.isSafe(href)) {
            cite.appendChild(document.createTextNode(" · "));
            const a = document.createElement("a");
            a.href = href;
            a.textContent = "Read the passage";
            cite.appendChild(a);
          }
          bq.appendChild(cite);
          doc.appendChild(bq);
        });
      });
    });

    if (!n) { say("There are no statements on screen to send."); return; }
    const created = window.MOFaithDesk.create({ title, html: doc.innerHTML });
    if (!created) {
      say("The draft could not be saved. Your browser's storage for this site is full.");
      return;
    }
    window.MOFaithDesk.setContext(created.id);
    location.assign(`/the-faith-received/desk/?doc=${encodeURIComponent(created.id)}`);
  }

  /* ── Render ──────────────────────────────────────────────────── */

  async function render() {
    run += 1;
    const token = run;
    const resolved = await resolveAuthors(token);
    if (token !== run || resolved === null) return;
    authors = resolved;

    // An author asked for by address that the roster does not hold.
    const missing = state.a.filter((s) => !authors.some((a) => a.s === s));
    state.a = authors.map((a) => a.s);

    paintAuthors();
    paintAddList();

    const has = authors.length > 0;
    if (toolsEl) toolsEl.hidden = !has;
    if (topicsWrap) topicsWrap.hidden = !has;
    if (emptyEl) emptyEl.hidden = has;
    if (saveBtn) saveBtn.disabled = !has;
    if (exportBtn) exportBtn.disabled = !has;

    if (!has) {
      topics = [];
      current = null;
      clear(columnsEl);
      clear(topicHeadEl);
      paintTopics();
      writeHash();
      return;
    }

    buildTopics();
    const wanted = state.sel;
    current = topics.filter((t) => t.tslug === wanted)[0] || topics[0] || null;
    if (current) state.sel = current.tslug;
    writeHash();
    paintTopics();
    paintTopicHead();
    paintColumns();

    const notes = [];
    if (missing.length) notes.push(`${missing.length === 1 ? "One author" : `${missing.length} authors`} in this link could not be found in the library.`);
    if (rosterMissing.length) notes.push(`${rosterMissing.join(" and ")} did not answer, so those authors are missing from the list.`);
    say(notes.join(" "));

    if (current) {
      authors.forEach((au) => fillCell(au, current, token));
    }
  }

  /* ── Wiring ──────────────────────────────────────────────────── */

  function addAuthorByName(value) {
    const needle = fold(value);
    if (!needle || !roster) return false;
    const chosen = new Set(state.a);
    const pool = roster.filter((r) => !chosen.has(r.s));
    const exact = pool.filter((r) => fold(r.a) === needle);
    const hits = exact.length ? exact : pool.filter((r) => fold(r.a).indexOf(needle) !== -1);
    if (!hits.length) { say("No author of that name is in the library."); return false; }
    if (hits.length > 1 && !exact.length) {
      say(`${fmt(hits.length)} authors match that. Choose one from the list.`);
      return false;
    }
    if (state.a.length >= MAX_AUTHORS) { say("Four authors is the width of the desk."); return false; }
    state.a.push(hits[0].s);
    say("");
    writeHash();
    render();
    return true;
  }

  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (addAuthorByName(addInput.value)) addInput.value = "";
    });
  }
  if (addInput) {
    addInput.addEventListener("input", () => {
      paintAddList();
      // A datalist pick fires `input` with the full name and no
      // keystroke, so an exact match commits immediately.
      const needle = fold(addInput.value);
      if (needle && roster && roster.some((r) => fold(r.a) === needle && state.a.indexOf(r.s) === -1)) {
        if (addAuthorByName(addInput.value)) addInput.value = "";
      }
    });
  }
  if (groupSel) {
    groupSel.addEventListener("change", () => {
      state.g = groupSel.value === "canon" ? "canon" : "work";
      writeHash();
      paintColumns();
    });
  }
  if (stanceSel) {
    stanceSel.addEventListener("change", () => {
      state.s = stanceSel.value;
      writeHash();
      paintColumns();
    });
  }
  if (phraseInput) {
    let t = null;
    phraseInput.addEventListener("input", () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        state.q = phraseInput.value;
        writeHash();
        paintColumns();
      }, 180);
    });
  }
  if (saveBtn) saveBtn.addEventListener("click", saveView);
  if (exportBtn) exportBtn.addEventListener("click", exportToDesk);

  window.addEventListener("hashchange", () => {
    const next = parseHash();
    if (hashOf(next) === hashOf(state)) return;
    state = next;
    if (groupSel) groupSel.value = state.g;
    if (stanceSel) stanceSel.value = state.s;
    if (phraseInput) phraseInput.value = state.q;
    render();
  });

  /* ── Boot ────────────────────────────────────────────────────── */

  state = parseHash();
  if (groupSel) groupSel.value = state.g;
  if (stanceSel) stanceSel.value = state.s;
  if (phraseInput) phraseInput.value = state.q;
  if (savedWrap) savedWrap.hidden = false;
  paintSaved();

  if (!BASE) {
    say("The library could not be reached from this page, so nothing can be compared. Reload, and tell us if it keeps happening.");
    if (toolsEl) toolsEl.hidden = true;
    if (topicsWrap) topicsWrap.hidden = true;
    return;
  }

  say("Loading the library…");
  loadRoster().then(() => {
    say("");
    paintAddList();
    render();
  }).catch(() => {
    say("The list of authors could not be loaded, so nothing can be added to the comparison. Reload to try again.");
  });
})();
