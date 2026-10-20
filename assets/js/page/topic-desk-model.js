/*
 * The Topic Desk, as pure functions (Ian, 2026-10-19: "push the new desks").
 *
 * buildDeskModel(input)  data in, a model out: which modules have enough to show, and what they say.
 * renderDesk(model)      a model in, an HTML string out.
 *
 * Neither touches the page, the network, or the clock, so scripts/check-topic-desk.mjs runs them in Node
 * on the live data for ten topics. page/topic-desk.js is the thin browser part that fetches and mounts.
 *
 * THE RULES (the owner found wrong claims on the live site, 2026-10-19):
 *  1. Every number and sentence is computed from the library's data by a fixed rule. The only hand-written
 *     text is the short marquee file (assets/data/faith-received/topic-desk-marquee.json), which says what
 *     it is. A line from the marquee file is shown only when it passes the check beside it.
 *  2. No author is shown holding a view. A person is a name, a birth year, a church, and how many pages of
 *     their works the index reads on this topic. A document is shown in its own words.
 *  3. A module with too little data is OMITTED, not shown empty. Each module has a minimum below.
 *  4. Churches are named from the document or author (see CHURCH rules). A church with no mapped document
 *     and no mapped work gets no column, so there is no Orthodox column until a confession is mapped.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MOTopicDesk = api;
}(typeof window === "undefined" ? globalThis : window, () => {
  "use strict";

  const SHELF = {
    gf: "Greek Fathers", pl: "Latin Fathers", po: "Eastern Fathers", md: "Medieval", rc: "Roman Catholic",
    lu: "Lutheran", rf: "Continental Reformed", ed: "English writers", hl: "Humanism and Law",
  };
  const SHELF_ORDER = ["gf", "po", "pl", "md", "rc", "lu", "rf", "ed", "hl"];
  const ED_ORDER = ["Anglican", "Presbyterian", "Congregational", "Baptist", "Quaker", "Anabaptist", "Arminian", "Methodist", "Bohemian Brethren", "Waldensian", "Socinian"];
  const ED_TO_SHELF = { "Continental Reformed": "rf", Lutheran: "lu", "Roman Catholic": "rc" };
  const CHURCHES = [
    ["early", "The early church, to 1054"], ["rc", "Roman Catholic"], ["or", "Eastern Orthodox"], ["lu", "Lutheran"],
    ["rf", "Reformed"], ["an", "Anglican"], ["bp", "Baptist"],
  ];
  /* The era bands. The first boundary is the one the confession groups already use (1054). The others are the dates the
     library's own timelines and the Westminster Assembly fix: 1517, 1648, 1800. Stated in the caption on the page. */
  const ERAS = [
    { id: "early", label: "The early church", span: "to 1054", end: 1054 }, { id: "medieval", label: "Medieval", span: "1054 to 1517", end: 1517 },
    { id: "reformation", label: "Reformation", span: "1517 to 1648", end: 1648 }, { id: "post", label: "Post-Reformation", span: "1648 to 1800", end: 1800 },
    { id: "modern", label: "Modern", span: "after 1800", end: 9999 },
  ];
  const eraOf = (c) => ERAS.find((e) => c * 100 - 50 < e.end).id;
  const ord = (n) => `${n}${[11, 12, 13].includes(n % 100) ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th")}`;
  const CHURCH_LABEL = Object.fromEntries(CHURCHES);

  /* Minimums: a module with fewer rows than this is left out. */
  /* One switch per module (Ian, 2026-10-19, after the first desk went live with claims nobody had vetted). A module that is
     false is omitted whole: no heading, no empty box. Turn one back on only after its content has passed a relevance
     check. traditions also carries the fault-line row. */
  const MODULES_ON = { traditions: false, treatments: false, chron: true, verses: false, people: true, path: false, related: true };
  const MIN = { docs: 2, ruler: 3, columns: 2, treatments: 3, events: 5, verses: 5, people: 6, pathSteps: 2, pathItems: 2, related: 3 };
  const CAP = { docsPerCentury: 4, quotesPerColumn: 2, worksPerColumn: 3, verses: 9, moreVerses: 15, people: 12, related: 8, eventsPerCentury: 2, events: 16 };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
  const enc = encodeURIComponent;
  const clip = (s, n) => {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    if (t.length <= n) return t;
    return `${t.slice(0, n).replace(/\s+\S*$/, "").replace(/[\s,;:.]+$/, "")} …`;
  };
  const cleanText = (t) => String(t || "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^#+\s*/gm, "")
    .replace(/^\s*\[[^\]\n]{1,100}\]\s*/, "").replace(/\s+/g, " ").trim();
  // Titles and headings from the data keep their words but not the dash (the site sets no em dashes).
  const plain = (s) => String(s || "").replace(/\s*—\s*/g, ": ");
  const stripYear = (doc) => String(doc || "").replace(/\s+\(?\d{3,4}(?:\s*[-–]\s*\d{3,4})?\)?\s*$/, "").trim();
  // The same fallback as scripture-dev-core.js sourceHref, so a page opens where the Topics page opens it.
  const readHref = (w, p) => `/the-faith-received/read/?w=${enc(w)}${p ? `#b${enc(p)}-0` : ""}`;
  const topicHref = (id) => `/the-faith-received/topics/?t=${enc(id)}`;
  const authorHref = (s) => `/the-faith-received/author/?a=${enc(s)}`;
  // A link from the data is used only when it has exactly the reader's shape; otherwise it is rebuilt from the slug.
  const safeRead = (href, w, p) => (/^\/the-faith-received\/read\/\?w=[A-Za-z0-9_.%-]+(#[A-Za-z0-9_.:-]*)?$/.test(String(href || "")) ? href : readHref(w, p));
  const COUNCILS_GUIDE = "/the-faith-received/guide/?s=councils";

  // ── Groups: shelves, with the English shelf split by church ───────
  const shelfKey = (e) => {
    const v = String((e && (e.sh || e.trad)) || "");
    if (v.length <= 3) return v;
    const hit = Object.entries(SHELF).find(([, lab]) => lab.toLowerCase() === v.toLowerCase());
    return hit ? hit[0] : (v.toLowerCase() === "english divines" ? "ed" : v);
  };
  const groupOf = (e, bodyOf) => {
    const k = shelfKey(e);
    if (k !== "ed") return k;
    const b = bodyOf ? bodyOf(e.author || e.a) : "";
    return ED_TO_SHELF[b] || (b ? `ed:${b}` : "ed");
  };
  const groupLabel = (g) => (String(g).startsWith("ed:") ? String(g).slice(3) : g === "ed" ? "Other English writers" : (SHELF[g] || g));
  // How a person's church reads on the people strip: one name for the Reformed, whichever table placed them.
  const personChurch = (g) => (g === "rf" || g === "ed:Reformed" ? "Reformed" : groupLabel(g));
  const groupOrder = (groups) => {
    const rank = (g) => {
      if (String(g).startsWith("ed:")) return SHELF_ORDER.indexOf("ed") + 0.1 + ED_ORDER.indexOf(String(g).slice(3)) / 100;
      return SHELF_ORDER.indexOf(g) + (g === "ed" ? 0.5 : 0);
    };
    return [...groups].sort((a, b) => rank(a) - rank(b));
  };
  /* A group's church column. Fathers go to the early church. The Medieval shelf (the Latin church before the
     Reformation) goes with Rome. Presbyterians and Congregationalists go with the Reformed. Anything else
     (Humanism and Law, Quakers, unplaced English writers) has no column. */
  const COLUMN_OF_GROUP = {
    gf: "early", po: "early", pl: "early", md: "rc", rc: "rc", lu: "lu", rf: "rf",
    "ed:Anglican": "an", "ed:Baptist": "bp", "ed:Presbyterian": "rf", "ed:Congregational": "rf",
  };

  // A confession document's church, from its date, type, and the library's own tradition field.
  const churchOfArticle = (a) => {
    const year = Number(a.year) || 0;
    const type = String(a.doc_type || "");
    const doc = String(a.doc || "");
    const trad = String(a.trad || "");
    if (year && year < 1054) return "early";
    if (!year) return /^(Creed|Council|Definition)$/.test(type) ? "early" : null;
    if (/orthodox/i.test(trad)) return "or";
    if (/lukar|lukaris/i.test(doc)) return null;
    if (/waldens|bohemian|moravian|brethren|socinian|racovian|mennonite|anabapt|quaker/i.test(doc)) return null;
    if (/baptist/i.test(doc)) return "bp";
    if (/thirty-nine articles|forty-two articles|irish articles|church of england|book of common prayer|lambeth/i.test(doc)) return "an";
    if (trad === "Lutheran") return "lu";
    if (trad === "Roman Catholic") return "rc";
    if (trad === "Reformed") return "rf";
    return null;
  };

  const showHeading = (h) => {
    const t = String(h || "").trim();
    if (!t || t.length >= 120) return false;
    const letters = t.replace(/[^A-Za-z]/g, "");
    return !(letters.length && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6);
  };

  // ── The model ─────────────────────────────────────────────────
  function buildDeskModel(input) {
    const {
      locus, part, parent = null, topic = null, conf = null, scr = null, treat = [], data = {}, marquee = null,
      books = new Map(), loci = new Map(), bodyOf = null,
    } = input;
    const counts = (topic && topic.counts) || {};
    const articles = ((conf && conf.articles) || []).filter((a) => a && a.w);
    const treatList = (treat || []).filter((e) => e && e.w);
    const trace = ((topic && topic.trace) || []).filter((t) => t.cen && t.total > 0);
    const authors = (topic && topic.authors) || [];
    const rows = ((scr && scr.rows) || []).filter((r) => books.has(r.b));
    const timeline = (conf && conf.timeline) || [];
    const omitted = [];
    const skip = (module, reason) => { omitted.push({ module, reason }); return null; };
    const hit = marquee || null;

    const model = {
      id: locus.id, label: locus.label, tier: "thin", modules: {}, omitted,
      from: conf && conf.from ? conf.from : null,
    };

    // Hero ----------------------------------------------------------
    const dek = hit && hit.dek ? hit.dek : (locus.definition || "");
    const tiles = [
      [articles.length, "Confession articles", "traditions"], [counts.works, "Works", "treatments"],
      [counts.authors, "Authors", "people"], [scr && scr.total, "Verses cited", "verses"],
    ].filter(([n]) => n > 0).map(([n, label, to]) => ({ n, label, to }));
    const kids = (locus.children || []).map((c) => ({ id: c.id, label: c.label }));

    // Ruler ---------------------------------------------------------
    let ruler = null;
    if (trace.length >= MIN.ruler) {
      const cens = trace.map((t) => t.cen);
      const minC = Math.min(...cens);
      const maxC = Math.max(...cens);
      const bars = [];
      for (let c = minC; c <= maxC; c += 1) {
        const t = trace.find((x) => x.cen === c);
        const by = {};
        ((t && t.by) || []).forEach((b) => { by[b.k] = b.n; });
        bars.push({ c, total: t ? t.total : 0, by });
      }
      const dated = timeline.filter((d) => Number(d.year) > (minC - 1) * 100 && Number(d.year) <= maxC * 100);
      const marks = [];
      (data.councils || []).forEach((cn) => {
        if (cn.y <= (minC - 1) * 100 || cn.y > maxC * 100) return;
        if (dated.some((d) => /^Council$/i.test(String(d.doc_type || "")) && Math.abs(Number(d.year) - cn.y) <= 1)) marks.push({ name: cn.name, y: cn.y });
      });
      const undated = ((topic && topic.trace) || []).filter((t) => !t.cen).reduce((s, t) => s + t.total, 0);
      const present = SHELF_ORDER.filter((k) => bars.some((b) => b.by[k]));
      ruler = {
        minC, maxC, bars, undated, positions: counts.positions || 0, shelves: present,
        docs: dated.map((d) => ({ y: Number(d.year), doc: plain(stripYear(d.doc)) })), councils: marks,
        hasCouncil: marks.length > 0,
      };
    } else skip("ruler", `${trace.length} dated centuries (needs ${MIN.ruler})`);

    // Church columns -----------------------------------------------
    const colMap = new Map();
    const colOf = (k) => {
      if (!colMap.has(k)) colMap.set(k, { id: k, name: CHURCH_LABEL[k], arts: [], works: [], docs: new Set(), authors: 0 });
      return colMap.get(k);
    };
    const confRank = (a) => (a.match === "title" ? 0 : 3) + (a.confidence === "high" ? 0 : a.confidence === "medium" ? 1 : 2);
    articles.forEach((a) => {
      const k = churchOfArticle(a);
      if (k) { const col = colOf(k); col.docs.add(`${a.w}`); col.arts.push(a); }
    });
    treatList.forEach((e) => {
      const k = COLUMN_OF_GROUP[groupOf(e, bodyOf)];
      if (!k) return;
      const col = colOf(k);
      if (col.works.length < CAP.worksPerColumn && !col.works.some((x) => x.author === e.author)) col.works.push(e);
    });
    authors.forEach((a) => {
      const k = COLUMN_OF_GROUP[groupOf(a, bodyOf)];
      if (k && colMap.has(k)) colMap.get(k).authors += 1;
    });
    const columns = CHURCHES.map(([k]) => colMap.get(k)).filter(Boolean).map((col) => {
      const quotes = [];
      const seen = new Set();
      [...col.arts].sort((x, y) => confRank(x) - confRank(y) || (Number(x.year) || 0) - (Number(y.year) || 0)).forEach((a) => {
        const text = cleanText(a.text);
        if (quotes.length >= CAP.quotesPerColumn || text.length < 60 || seen.has(a.w)) return;
        seen.add(a.w);
        quotes.push({ doc: plain(stripYear(a.doc)), year: Number(a.year) || 0, article: plain(a.article_display || a.article || ""), text: clip(text, 240), w: a.w, p: a.p, href: a.href });
      });
      return {
        id: col.id, name: col.name, quotes, works: col.works.map((e) => ({ w: e.w, p: e.p, title: plain(clip(e.title, 70)), author: e.author, shelf: groupLabel(groupOf(e, bodyOf)), y: e.y })),
        nArticles: col.arts.length, nDocs: col.docs.size, nAuthors: col.authors,
      };
    }).filter((c) => c.quotes.length || c.works.length);

    // Fault-line row (marquee only; every quotation must be found word for word) --
    let fault = null;
    if (hit && hit.fault && hit.fault.rows) {
      const norm = (s) => cleanText(s).replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
      const okRows = hit.fault.rows.filter((r) => {
        const a = articles.find((x) => x.w === r.w && x.p === r.p);
        return a && norm(a.text).includes(norm(r.quote));
      });
      if (okRows.length >= 3 && okRows.length === hit.fault.rows.length) fault = { question: hit.fault.question, rows: okRows.map((r) => ({ church: r.church, doc: r.doc, quote: r.quote, href: readHref(r.w, null) })) };
      else skip("fault-line", "a quotation was not found in the mapped article");
    }

    let traditions = null;
    if (columns.length >= MIN.columns) traditions = { columns, fault, nArticles: articles.length, from: model.from };
    else skip("traditions", `${columns.length} church columns (needs ${MIN.columns})`);

    // Classic treatments -------------------------------------------
    let treatments = null;
    if (treatList.length >= MIN.treatments) {
      const groups = new Map();
      treatList.forEach((e) => {
        const g = groupOf(e, bodyOf);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push({
          w: e.w, p: e.p, title: plain(clip(e.title, 70)), author: e.author, y: e.y || 0, authorId: e.author_id,
          section: showHeading(e.heading) ? plain(clip(e.heading, 110)) : "",
        });
      });
      treatments = { n: treatList.length, groups: groupOrder([...groups.keys()]).map((g) => ({ id: g, label: groupLabel(g), shelf: shelfKey({ sh: g.split(":")[0] }), rows: groups.get(g) })) };
    } else skip("treatments", `${treatList.length} treatments (needs ${MIN.treatments})`);

    // Timeline -----------------------------------------------------
    const typeRank = (t) => (/^(Council|Creed|Definition|Canons)$/.test(t) ? 0 : /^(Confession|Catechism|Articles|Formula|Apology)$/.test(t) ? 1 : 2);
    /* The doctrine through the centuries: the century counts from the worker's own trace, and as markers only the dated
       documents the library holds on this topic (each linked to its first article here). No quotation, no summary. */
    let chron = null;
    if (ruler) {
      const byCen = new Map();
      timeline.forEach((d) => {
        const y = Number(d.year) || 0;
        const first = articles.find((a) => a.w === d.w);
        if (!y || !first) return;
        const c = Math.ceil(y / 100);
        if (!byCen.has(c)) byCen.set(c, []);
        byCen.get(c).push({ y, title: plain(stripYear(d.doc)), type: String(d.doc_type || ""), rank: typeRank(d.doc_type), n: Number(d.n_articles) || 1, w: first.w, href: safeRead(first.href, first.w, first.p) });
      });
      const rowsC = ruler.bars.filter((b) => b.total || byCen.has(b.c)).map((b) => {
        const all = (byCen.get(b.c) || []).sort((x, y) => x.rank - y.rank || x.y - y.y);
        const shown = all.slice(0, CAP.docsPerCentury).sort((x, y) => x.y - y.y);
        return { c: b.c, total: b.total, by: b.by, docs: shown, more: all.length - shown.length, era: eraOf(b.c) };
      });
      const nDocs = rowsC.reduce((n, r) => n + r.docs.length + r.more, 0);
      const eras = ERAS.map((e) => ({ ...e, rows: rowsC.filter((r) => r.era === e.id) })).filter((e) => e.rows.length);
      if (rowsC.filter((r) => r.total).length >= MIN.ruler) {
        chron = { eras, max: Math.max(...rowsC.map((r) => r.total)), positions: ruler.positions, shelves: ruler.shelves, nDocs, compact: nDocs < MIN.docs, hasCouncil: rowsC.some((r) => r.docs.some((d) => d.rank === 0)) };
      } else skip("centuries", "fewer than 3 centuries with data");
    }

    // Key verses ---------------------------------------------------
    let verses = null;
    if (rows.length >= MIN.verses) {
      const notes = (hit && hit.verseNotes) || {};
      const key = (r) => `${r.b}.${r.c}.${r.v}`;
      const lab = (r) => {
        const b = books.get(r.b);
        return `${b.slug === "psalms" ? "Psalm" : b.name} ${r.c}:${r.v}`;
      };
      verses = {
        items: rows.slice(0, CAP.verses).map((r) => ({
          ref: lab(r), href: `/the-faith-received/scripture/desk/?ref=${books.get(r.b).slug}.${r.c}.${r.v}`, text: r.t || "",
          n: r.n, nAll: r.n_all, share: r.n_all ? Math.round((100 * r.n) / r.n_all) : 0, lift: r.lift, note: notes[key(r)] || "",
        })),
        more: rows.slice(CAP.verses, CAP.verses + CAP.moreVerses).map(lab),
        total: (scr && scr.total) || rows.length,
      };
    } else skip("verses", `${rows.length} verses (needs ${MIN.verses})`);

    // People -------------------------------------------------------
    let people = null;
    const portrait = new Set(data.portraits || []);
    if (authors.length >= MIN.people) {
      const pool = [...authors].filter((a) => a.s && a.a).sort((x, y) => (y.n || 0) - (x.n || 0));
      const chosen = [];
      const perGroup = new Map();
      const take = (needPortrait) => pool.forEach((a) => {
        if (chosen.length >= CAP.people || chosen.includes(a)) return;
        if (needPortrait && !portrait.has(a.s)) return;
        const g = groupOf(a, bodyOf);
        if ((perGroup.get(g) || 0) >= 2) return;
        perGroup.set(g, (perGroup.get(g) || 0) + 1);
        chosen.push(a);
      });
      take(true);
      if (chosen.length < 8) { perGroup.clear(); chosen.forEach((a) => perGroup.set(groupOf(a, bodyOf), (perGroup.get(groupOf(a, bodyOf)) || 0) + 1)); take(false); }
      if (chosen.length >= MIN.people) {
        chosen.sort((a, b) => (Number(a.y) || 9999) - (Number(b.y) || 9999));
        people = {
          nAuthors: counts.authors || authors.length,
          items: chosen.map((a) => ({
            name: a.a, slug: a.s, born: Number(a.y) || 0, church: personChurch(groupOf(a, bodyOf)), pages: Number(a.pages) || 0, portrait: portrait.has(a.s),
          })),
        };
      } else skip("people", `${chosen.length} people (needs ${MIN.people})`);
    } else skip("people", `${authors.length} authors (needs ${MIN.people})`);

    // Reading path -------------------------------------------------
    let path = null;
    {
      const typeOrder = ["Creed", "Catechism", "Confession", "Articles", "Formula", "Definition", "Council"];
      const cand = articles.map((a) => ({ a, t: cleanText(a.text) })).filter(({ t }) => t.length >= 120 && t.length <= 1500)
        .sort((x, y) => typeOrder.indexOf(x.a.doc_type) - typeOrder.indexOf(y.a.doc_type) || x.t.length - y.t.length);
      const start = [];
      const docs = new Set();
      [0, 1].forEach((pass) => cand.forEach(({ a }) => {
        if (start.length >= 3 || docs.has(a.w)) return;
        if (pass === 0 && start.some((s) => s.type === a.doc_type)) return;
        docs.add(a.w);
        start.push({ w: a.w, p: a.p, href: a.href, title: plain(clip(`${stripYear(a.doc)}, ${a.article_display || a.article || ""}`.replace(/,\s*$/, ""), 90)), type: a.doc_type });
      }));
      const deeper = [];
      const usedCols = new Set();
      const treatRows = treatList.map((e) => ({ e, g: groupOf(e, bodyOf) }));
      ["rc", "lu", "rf", "an", "bp"].forEach((col) => {
        const m = treatRows.find(({ e, g }) => COLUMN_OF_GROUP[g] === col && g !== "pl" && !usedCols.has(col) && !deeper.some((d) => d.author === e.author));
        if (m && deeper.length < 4) { usedCols.add(col); deeper.push({ w: m.e.w, p: m.e.p, title: plain(`${m.e.author}, ${clip(m.e.title, 60)}`), author: m.e.author }); }
      });
      const sources = [];
      treatRows.filter(({ g }) => ["gf", "po", "pl"].includes(g)).forEach(({ e }) => {
        if (sources.length < 4 && !sources.some((s) => s.author === e.author)) sources.push({ w: e.w, p: e.p, title: plain(`${e.author}, ${clip(e.title, 60)}`), author: e.author });
      });
      const steps = [
        { name: "Start here", note: "Short statements, a few minutes each.", items: start },
        { name: "Go deeper", note: "A standard treatment from each of several traditions.", items: deeper },
        { name: "To the sources", note: "The earliest treatments in the library.", items: sources },
      ].filter((s) => s.items.length >= MIN.pathItems);
      if (steps.length >= MIN.pathSteps) path = { steps };
      else skip("path", `${steps.length} steps (needs ${MIN.pathSteps})`);
    }

    // Related topics -----------------------------------------------
    let related = null;
    const rel = ((data.related || {})[locus.id] || []).filter((r) => loci.has(r.id)).slice(0, CAP.related);
    if (rel.length >= MIN.related) related = { items: rel.map((r) => ({ id: r.id, label: loci.get(r.id).label, n: r.n })), label: locus.label };
    else skip("related", `${rel.length} neighbors (needs ${MIN.related})`);

    const off = (k, name, v) => { if (MODULES_ON[k]) return v; if (v) skip(name, "switched off until its content is vetted"); return null; };
    traditions = off("traditions", "traditions", traditions);
    treatments = off("treatments", "treatments", treatments);
    verses = off("verses", "verses", verses);
    path = off("path", "path", path);
    model.modules = {
      hero: {
        title: locus.label, dek, kids, tiles, ruler,
        partLabel: part ? `Part ${part.n}` : "", parent: parent ? { id: parent.id, label: parent.label } : null,
      },
      traditions, treatments, chron, verses, people, path, related,
    };
    const full = articles.length >= 6 && treatList.length >= 8 && rows.length >= 20 && trace.length >= 8;
    model.tier = hit ? "marquee" : full ? "full" : "thin";
    return model;
  }

  // ── Rendering ─────────────────────────────────────────────────
  const link = (href, text, cls) => `<a${cls ? ` class="${cls}"` : ""} href="${esc(href)}">${esc(text)}</a>`;
  const modHead = (eyebrow, title, lede) =>
    `<div class="tdk-head"><p class="tdk-eyebrow">${esc(eyebrow)}</p><h3 class="tdk-h">${esc(title)}</h3>${lede ? `<p class="tdk-lede">${lede}</p>` : ""}</div>`;

  function renderHero(h, tier, ids) {
    const jumps = [];
    const j = (id, label) => { if (ids[id]) jumps.push(link(`#tdk-${id}`, label)); };
    j("traditions", "Traditions"); j("treatments", "Classic works"); j("chron", "Centuries"); j("verses", "Key verses");
    j("people", "People"); j("path", "Reading path"); j("related", "Related");
    jumps.push(link("#td-h-conf", "Full record"));
    const tiles = h.tiles.length ? `<ul class="tdk-tiles" aria-label="This topic in the library">${h.tiles.map((t) =>
      `<li>${ids[t.to] ? `<a href="#tdk-${t.to}"><b>${fmt(t.n)}</b><span>${esc(t.label)}</span></a>` : `<b>${fmt(t.n)}</b><span>${esc(t.label)}</span>`}</li>`).join("")}</ul>` : "";
    return `<div class="tdk-hero" id="tdk-hero" data-tier="${esc(tier)}"><div class="tdk-hero-grid">${h.dek ? `<p class="tdk-dek">${esc(h.dek)}</p>` : "<span></span>"}${tiles}</div>` +
      `${jumps.length ? `<nav class="tdk-jump" aria-label="On this page">${jumps.join("")}</nav>` : ""}</div>`;
  }

  function renderTraditions(t, label) {
    const cols = t.columns.map((c) => {
      const quotes = c.quotes.map((q) =>
        `<figure class="tdk-quote"><blockquote>${esc(q.text)}</blockquote><figcaption>${link(safeRead(q.href, q.w, q.p), [q.doc, q.article && q.article !== q.doc ? q.article : ""].filter(Boolean).join(", "))}${q.year ? ` <span>${q.year}</span>` : ""}</figcaption></figure>`).join("");
      const works = c.works.length ? `<h4 class="tdk-h4">Key works</h4><ul class="tdk-keyworks">${c.works.map((w) =>
        `<li>${link(readHref(w.w, w.p), w.title)}<span class="by">${esc(w.author)}${w.shelf && w.shelf !== c.name ? `, ${esc(w.shelf)}` : ""}</span></li>`).join("")}</ul>` : "";
      const stat = [c.nArticles ? `${plural(c.nArticles, "article", "articles")} in ${plural(c.nDocs, "document", "documents")} on this topic` : "", c.nAuthors ? `${plural(c.nAuthors, "author", "authors")} among the 400 with the most indexed passages` : ""].filter(Boolean).join(". ");
      return `<article class="tdk-card" id="tdk-trad-${esc(c.id)}"><h4 class="tdk-card-h">${esc(c.name)}</h4>${quotes ? `<h4 class="tdk-h4">What the documents say</h4>${quotes}` : ""}${works}${stat ? `<p class="tdk-small tdk-stat">${esc(stat)}.</p>` : ""}</article>`;
    }).join("");
    const f = t.fault;
    const fault = f ? `<table class="tdk-matrix"><caption>${esc(f.question)}</caption><thead><tr><th scope="col">Church</th><th scope="col">The text</th><th scope="col">Source</th></tr></thead><tbody>${f.rows.map((r) =>
      `<tr><th scope="row">${esc(r.church)}</th><td>“${esc(r.quote)}”</td><td>${link(r.href, r.doc)}</td></tr>`).join("")}</tbody></table>${t.columns.some((c) => c.id === "or") ? "" : `<p class="tdk-small">The library maps no Orthodox document, so the Eastern view appears only in the 381 text above.</p>`}` : "";
    return `<section class="tdk-mod" id="tdk-traditions">${modHead("How each tradition treats it", `${label} in the documents of the churches`,
      `Each column opens with words from the documents the library maps to this topic. All ${fmt(t.nArticles)} articles are in the full record below.${t.from ? ` These documents are mapped to ${link(topicHref(t.from.id), t.from.label)}, which this topic belongs to.` : ""}`)}${fault}<div class="tdk-grid">${cols}</div></section>`;
  }

  function renderTreatments(t) {
    const groups = t.groups.map((g) => `<div class="tdk-tgroup"><h4 class="tdk-tgroup-h"><i class="b-${esc(g.shelf)}"></i>${esc(g.label)} <span>${g.rows.length}</span></h4><ul class="tdk-tlist">${g.rows.map((r) =>
      `<li>${link(readHref(r.w, r.p), r.title, "tw")}<span class="ta">${esc(r.author)}${r.y ? `, fl. ${r.y}` : ""}</span>${r.section ? `<span class="ts">${esc(r.section)}</span>` : ""}</li>`).join("")}</ul></div>`).join("");
    return `<section class="tdk-mod" id="tdk-treatments">${modHead("Classic treatments", "The standard works, section by section",
      `${plural(t.n, "treatment", "treatments")}. Each opens at the section that names the topic. Every link goes to that page in the reader.`)}<div class="tdk-tcols">${groups}</div></section>`;
  }

  function renderChron(c) {
    let step = 0;
    const eras = c.eras.map((e) => {
      const rows = e.rows.map((r) => {
        step += 1;
        const bar = SHELF_ORDER.filter((k) => r.by[k]).map((k) => `<i class="b-${k}" style="width:${((100 * Math.sqrt(r.total / c.max) * r.by[k]) / r.total).toFixed(2)}%" title="${esc(SHELF[k])}: ${fmt(r.by[k])}"></i>`).join("");
        const label = `${fmt(r.total)} indexed passages in the ${ord(Number(r.c))} century`;
        const docs = r.docs.length || r.more ? `<ul class="tdk-docs">${r.docs.map((d) =>
          `<li class="${d.rank === 0 ? "is-council" : ""}"><a href="${esc(d.href)}" aria-label="${esc(`${d.title}, ${Number(d.y)}${d.type ? `, ${d.type}` : ""}. Opens the document.`)}"><b>${Number(d.y)}</b> ${esc(d.title)}${d.type ? `<span>${esc(d.type)}</span>` : ""}</a></li>`).join("")}${r.more ? `<li class="more"><a href="#td-h-conf">${fmt(r.more)} more in the full record</a></li>` : ""}</ul>` : "";
        return `<li class="tdk-row" style="--d:${Math.min(step * 45, 900)}ms"><span class="tdk-cn">${ord(Number(r.c))} century</span>` +
          `<span class="tdk-bar" role="img" aria-label="${esc(label)}" title="${esc(label)}">${bar}</span><span class="tdk-n">${fmt(r.total)}</span>${docs}</li>`;
      }).join("");
      return `<li class="tdk-era tdk-era--${e.id}"><h4 class="tdk-era-h">${esc(e.label)} <span>${esc(e.span)}</span></h4><ol class="tdk-rows">${rows}</ol></li>`;
    }).join("");
    const caption = c.compact ? "" : `<p class="tdk-small tdk-cap">Documents only: what each says is in the document. Each links to its first article on this topic.${c.hasCouncil ? ` For every council see the ${link(COUNCILS_GUIDE, "Councils guide")}.` : ""}</p>`;
    return `<section class="tdk-mod tdk-cent" id="tdk-chron" aria-labelledby="tdk-cent-h"><div class="tdk-head"><p class="tdk-eyebrow">Through time</p><h3 class="tdk-h tdk-cent-h" id="tdk-cent-h">The doctrine through the centuries</h3>` +
      `<p class="tdk-lede">${fmt(c.positions)} indexed passages in the library, counted by century, with the ${c.nDocs ? `${plural(c.nDocs, "dated document", "dated documents")} on this topic` : "documents"} where the library has them. Bar length is square-root scaled so the early centuries show. A passage is a place in a work where the index finds this topic treated.</p></div>` +
      `<ul class="tdk-legend" aria-label="Shelves">${c.shelves.map((k) => `<li><i class="b-${k}"></i>${esc(SHELF[k])}</li>`).join("")}</ul>` +
      `<ol class="tdk-eras${c.compact ? " is-compact" : ""}">${eras}</ol>${caption}<p class="tdk-small">Era bands: the early church to 1054, medieval to 1517, Reformation to 1648, post-Reformation to 1800, then modern.</p></section>`;
  }

  function renderVerses(v) {
    const items = v.items.map((x) => `<li class="tdk-verse">${link(x.href, x.ref, "vref")}<p class="vtxt">${esc(x.text)}</p>${x.note ? `<p class="vnote">${esc(x.note)}</p>` : ""}` +
      `<div class="meter" role="img" aria-label="${esc(`${fmt(x.n)} of ${fmt(x.nAll)} citations of this verse are on this topic`)}"><i style="width:${Math.max(2, x.share)}%"></i></div>` +
      `<p class="vmeta"><b>${fmt(x.n)}</b> of ${fmt(x.nAll)} citations of this verse are on this topic</p></li>`).join("");
    return `<section class="tdk-mod" id="tdk-verses">${modHead("Key verses", "The texts cited for it",
      `The most particular proof-texts first. Each opens its Verse Desk. The bar shows how much of that verse's citing in the library falls under this topic.${v.more.length ? ` Also frequent: ${esc(v.more.join(", "))}.` : ""}`)}<ul class="tdk-vgrid">${items}</ul></section>`;
  }

  function renderPeople(p) {
    const items = p.items.map((x) => {
      const ini = x.name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("");
      const img = x.portrait ? `<img src="/assets/data/faith-received/guides/portraits/${enc(x.slug)}.jpg" alt="" width="84" height="84" loading="lazy" decoding="async" data-tdk-portrait>` : "";
      return `<li class="tdk-person"><a href="${esc(authorHref(x.slug))}"><span class="ph">${img}<span class="ini" aria-hidden="true"${x.portrait ? " hidden" : ""}>${esc(ini)}</span></span><b>${esc(x.name)}</b>` +
        `<span class="d">${Number(x.born) ? `b. ${Number(x.born)}` : ""}</span><span class="t">${esc(x.church)}</span>${x.pages ? `<span class="t">${plural(x.pages, "page", "pages")} indexed here</span>` : ""}</a></li>`;
    }).join("");
    return `<section class="tdk-mod" id="tdk-people">${modHead("People", "Voices on this topic",
      `${plural(p.items.length, "author", "authors")} of the ${fmt(p.nAuthors)} on this topic, listed by birth year, with authors of unknown birth year last. A fixed rule picks them. Authors with an engraved portrait come first, then those with the most pages indexed on this topic. No more than two come from one shelf.`)}<ul class="tdk-people">${items}</ul></section>`;
  }

  function renderPath(p) {
    const steps = p.steps.map((s, i) => `<li class="tdk-step"><span class="sn">${i + 1}</span><h4 class="tdk-card-h">${esc(s.name)}</h4><p class="tdk-small">${esc(s.note)}</p><ul>${s.items.map((it) =>
      `<li>${link(readHref(it.w, it.p), it.title)}</li>`).join("")}</ul></li>`).join("");
    return `<section class="tdk-mod" id="tdk-path">${modHead("Reading path", "Where to start", "Built only from works in the library: the shortest confession articles first, then a standard treatment from several traditions, then the earliest treatments.")}<ol class="tdk-path">${steps}</ol></section>`;
  }

  function relSvg(r) {
    const cx = 470; const cy = 215; const rx = 215; const ry = 140;
    const max = Math.max(...r.items.map((i) => Number(i.n)));
    const o = ['<svg class="tdk-rel" viewBox="0 0 940 430" aria-hidden="true" focusable="false">'];
    r.items.forEach((it, k) => {
      const ang = -Math.PI / 2 + (k * 2 * Math.PI) / r.items.length;
      const x = cx + rx * Math.cos(ang); const y = cy + ry * Math.sin(ang);
      const rad = 6 + (10 * Number(it.n)) / max;
      const c = Math.cos(ang);
      let anchor = "start"; let tx = x + rad + 8; let ty = y + 5;
      if (Math.abs(c) < 0.2) { anchor = "middle"; tx = x; ty = Math.sin(ang) < 0 ? y - rad - 10 : y + rad + 20; } else if (c < 0) { anchor = "end"; tx = x - rad - 8; }
      o.push(`<line class="rel-l" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" style="stroke-width:${(1 + (3 * Number(it.n)) / max).toFixed(1)}"/>` +
        `<circle class="rel-n" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}"/>` +
        `<text class="rel-t" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}">${esc(it.label)}</text>` +
        `<text class="rel-s" x="${tx.toFixed(1)}" y="${(ty + 15).toFixed(1)}" text-anchor="${anchor}">${fmt(it.n)} shared</text>`);
    });
    o.push(`<circle class="rel-c" cx="${cx}" cy="${cy}" r="40"/><text class="rel-ct" x="${cx}" y="${cy + 4}" text-anchor="middle">This topic</text></svg>`);
    return o.join("");
  }

  function renderRelated(r) {
    const list = r.items.map((it) => `<li>${link(topicHref(it.id), it.label)} <span>${fmt(it.n)} of the 60 most particular proof-texts are shared</span></li>`).join("");
    return `<section class="tdk-mod" id="tdk-related">${modHead("Related topics", "Topics that share its proof-texts",
      "Neighbors by shared proof-texts: how many of each topic's sixty most particular verses it has in common with this one.")}<div class="tdk-relgrid">${relSvg(r)}<ul class="tdk-rellist">${list}</ul></div></section>`;
  }

  /* The HTML for the modules, in page order. The hero is separate so the page can place it under the topic's
     title. Returns { hero, body }. A module that is null renders nothing at all. */
  function renderDesk(model) {
    const m = model.modules;
    const present = {
      traditions: Boolean(m.traditions), treatments: Boolean(m.treatments), chron: Boolean(m.chron), verses: Boolean(m.verses),
      people: Boolean(m.people), path: Boolean(m.path), related: Boolean(m.related),
    };
    const body = [
      m.chron && renderChron(m.chron), m.traditions && renderTraditions(m.traditions, model.label), m.treatments && renderTreatments(m.treatments),
      m.verses && renderVerses(m.verses), m.people && renderPeople(m.people), m.path && renderPath(m.path), m.related && renderRelated(m.related),
    ].filter(Boolean).join("");
    return { hero: renderHero(m.hero, model.tier, present), body };
  }

  return { buildDeskModel, renderDesk, readHref, churchOfArticle, groupOf, MIN, CAP, SHELF, CHURCHES, MODULES_ON };
}));
