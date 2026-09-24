/*
 * Contents for the confessions and catechisms that replaced our own.
 *
 * WHY. Ian, 2026-09-24: where a work was in the library twice, Stiven's
 * copy wins, and where our format was better his copy gets our format.
 * Our Westminster catechisms listed every question in the contents, one
 * entry each with its text; his group them in ranges ("Questions 1–15")
 * or, for the Larger, show only the two part headings. Our Thirty-Nine
 * Articles and 1689 showed "Article I. Of Faith in the Holy Trinity" and
 * "Chapter I. Of the Holy Scriptures"; his show the bare label with the
 * title as a child entry under it.
 *
 * HOW, WITHOUT TOUCHING HIS DATA. A confession's contents are built by
 * FRReaderNavigation.contents() (assets/js/port/reader-navigation.js)
 * from the text as rendered, and reader-core.js calls it through the
 * global each time it draws the sidebar. This file wraps that function
 * for the works listed below and hands back more rows in the same shape
 * ({title, page, anchor, depth, element}), so the engine draws, links,
 * highlights and filters them exactly as it does its own. His files in
 * R2 are never edited: his republish would overwrite them, and "we are
 * the skin, he is the bones".
 *
 * Every row points at an element that is on the page, by the id the
 * engine itself gave it (b<page>-<n>), so a row cannot point at nothing.
 * If his text changes shape (no "Q. n." paragraphs), the rule finds
 * nothing and his own contents stand.
 *
 * Loads in the head, after reader-navigation.js and before reader-core.js.
 */
(function () {
  "use strict";

  const api = window.FRReaderNavigation;
  if (!api || typeof api.contents !== "function") return;

  // questions: one entry per "Q. n." paragraph, flat, as our copies had.
  // titles: a bare "Article I" / "Chapter I" heading takes the title
  //         printed under it ("Article I. Of Faith in the Holy Trinity").
  const RULES = {
    "rc-115-westminster-shorter-catechism-1647": { questions: true },
    "rc-114-westminster-larger-catechism-1647": { questions: true, caps: true },
    // Heidelberg prints its questions as "1. What is your only comfort…?"
    // with no "Q.", so only an unbroken run 1, 2, 3… counts, which keeps
    // an answer's own numbered list out of the contents.
    "rc-061-heidelberg-catechism-1563": { questions: "numbered" },
    "rc-060-thirty-nine-articles-1562": { titles: true },
    "rc-126-london-baptist-confession-1677": { titles: true },
  };

  function slug() {
    try {
      // DATA is reader-core's top-level binding, shared across scripts.
      if (typeof DATA !== "undefined" && DATA && DATA.slug) return String(DATA.slug);
    } catch (_) { /* not booted yet */ }
    return new URLSearchParams(window.location.search).get("w") || "";
  }

  const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
  // "WHAT is the chief end of man?": the printed capitals of a first
  // word, not emphasis. Contents read in sentence case.
  const unshout = (s) => s.replace(/^([A-Z])([A-Z]+)\b/, (_, a, b) => a + b.toLowerCase());
  const Q = /^Q(?:uestion)?\.?\s*(\d{1,3})\.?\s+(.+?\?)(?=\s|$)/;
  const LABEL = /^(?:article|chapter)\s+[ivxlc\d]+\.?$/i;

  const NUMBERED = /^(\d{1,3})\.\s+(.+?\?)(?=\s|$)/;
  function questions(reading, kind) {
    const out = [];
    let last = 0;
    // The engine's block ids sit on the row in the two-lane layout and on
    // the English block itself in the flowing one; either way the id is
    // b<page>-<n>.
    reading.querySelectorAll('[id^="b"]').forEach((row) => {
      const page = (/^b(.+)-\d+$/.exec(row.id) || [])[1];
      if (page == null || row.closest(".rowx,.appbank,.footnotes,.margin,.rtoc,.ctoc,.la,.stk-la")) return;
      const en = row.classList.contains("en") ? row : (row.querySelector(".en") || row);
      const m = (kind === "numbered" ? NUMBERED : Q).exec(clean(en.textContent));
      if (!m) return;
      if (kind === "numbered") {
        if (Number(m[1]) !== last + 1) return;
        last = Number(m[1]);
      }
      out.push({ title: `${m[1]}. ${unshout(m[2])}`, page, anchor: row.id, depth: 1, element: row });
    });
    return out;
  }

  /* LEVELS, so a catechism folds by its parts (Ian, 2026-09-24:
     "heidelberg doesn't actually collapse all"). The flat list folded
     each question by itself and nothing nested. A fold runs to the next
     entry of equal or higher rank (faith-reader-folds.js), so the rank
     is what makes Collapse all leave only the parts on screen.
       Part headings ("First Part:", "Part II")          1
       the line printed under a Part ("Of Man's Misery") 2, its child
       Lord's Day, and any other heading inside a Part   2
       a question: one below the grouping heading before it.
     The work's title is 1 and counts as a grouping heading only when the
     work has others; the Shorter, with none, stays flat as before. */
  const PART = /^(?:(?:the\s+)?(?:first|second|third|fourth|fifth)\s+part|part\s+(?:[ivx]+|\d+|one|two|three))\b/i;
  const DAY = /^lord['’]?s\s+day\b/i;
  function levels(list, qset) {
    const heads = list.filter((r) => !qset.has(r));
    const grouped = heads.length > 1;
    let group = 0; // depth of the grouping heading in force
    let inPart = false;
    let prevHead = null;
    return list.map((r, i) => {
      const t = clean(r.title).replace(/^§\s*/, "");
      if (qset.has(r)) return { ...r, depth: grouped && group ? group + 1 : 1 };
      let d;
      if (i === 0 || r === heads[0]) d = 1;
      else if (PART.test(t)) { d = 1; inPart = true; }
      else if (DAY.test(t)) d = 2;
      else if (prevHead && PART.test(clean(prevHead.title).replace(/^§\s*/, ""))
        && String(prevHead.page) === String(r.page)) d = 2;
      else d = inPart ? 2 : 1;
      group = d;
      prevHead = r;
      return { ...r, depth: d };
    });
  }

  // "HAVING SEEN WHAT THE SCRIPTURES PRINCIPALLY TEACH…": a whole
  // paragraph in capitals, not a question, is a printed heading.
  function capsHeads(reading) {
    const out = [];
    reading.querySelectorAll('[id^="b"]').forEach((row) => {
      const page = (/^b(.+)-\d+$/.exec(row.id) || [])[1];
      if (page == null || row.closest(".rowx,.appbank,.footnotes,.margin,.rtoc,.ctoc,.la,.stk-la")) return;
      const en = row.classList.contains("en") ? row : (row.querySelector(".en") || row);
      const t = clean(en.textContent);
      if (t.length < 24 || t.length > 240 || /\?/.test(t) || /[a-z]/.test(t) || !/[A-Z]{4}/.test(t)) return;
      const title = t.charAt(0) + t.slice(1).toLowerCase().replace(/\bgod\b/g, "God").replace(/\bscriptures\b/g, "Scriptures");
      out.push({ title, page, anchor: row.id, depth: 1, element: row });
    });
    return out;
  }

  const before = (a, b) => {
    if (!a.element || !b.element || a.element === b.element) return 0;
    return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  };

  function overlay(rows, reading, rule) {
    let out = rows.slice();
    if (rule.questions) {
      const qs = questions(reading, rule.questions);
      if (qs.length < 2) return rows;
      // A heading printed as a capitals paragraph (the Larger's second
      // part) joins the contents as a heading.
      const extra = rule.caps ? capsHeads(reading) : [];
      out = levels(out.concat(extra, qs).sort(before), new Set(qs));
    }
    if (rule.titles) {
      const merged = [];
      for (let i = 0; i < out.length; i++) {
        const r = out[i];
        const next = out[i + 1];
        if (LABEL.test(clean(r.title)) && next && next.depth > r.depth
          && String(next.page) === String(r.page) && !api.chapterLabel(next.title)) {
          merged.push({ ...r, title: `${clean(r.title).replace(/\.$/, "")}. ${clean(next.title)}` });
          i++;
          continue;
        }
        merged.push(r);
      }
      out = merged;
    }
    return out;
  }

  /* CHAPTERS FROM PRINTED LABELS, for any work whose only contents are
     its pages or columns (Ian, 2026-09-24, on Jerome's Matthew: the
     inline "[ Cap. I. I, 3.]" labels ARE the chapters, and "that needs
     to be a rule across all works that are like this").

     THE RULE, decided from the text as rendered, never from a list:
     - the work has no outline of its own (DATA.structure empty), so its
       sidebar would list only columns or pages, and is not a confession;
     - at least 3 paragraphs OPEN on a division label and number, in
       brackets ("[ Cap. II.]"), in capitals ("CAPUT XIII.", "HOMILY
       IV", "ΚΕΦΑΛΑΙΟΝ Β΄."), or title-cased and ending on a stop
       ("Chapter IV."), with the numbers rising in order at least twice.
       A lowercase citation ("cf. cap. VI.") is never a label.
     Such a work is drawn through the confession contents path (the
     engine's renderConfessionContents, reached by answering
     isConfession), with one entry per label: "Chapter I", book-level
     labels as parents. Only the chapter number makes the entry; a
     verse reference after it ("I, 3" in "Cap. I. I, 3.") is detail, not
     an entry. The page box still reaches every column.
     faith-reader-folds.js folds on the same rows (its label resolver
     reads "Chapter I" and "[ Cap. I" as the same chapter), so folding
     chapter N hides what the chapter N entry covers. */
  const LKIND = [
    [/^(?:chap(?:ter)?|cap(?:ut|itulum)?|κεφ(?:άλαιον|αλαιον)?)$/i, "Chapter", 2],
    [/^(?:book|booke|lib(?:er)?)$/i, "Book", 1],
    [/^(?:part|pars)$/i, "Part", 1],
    [/^(?:homil(?:y|ia)|ὁμιλία|ομιλια)$/i, "Homily", 2],
    [/^(?:sermon|sermo)$/i, "Sermon", 2],
    [/^(?:question|quaestio)$/i, "Question", 2],
    [/^(?:article|articulus|art)$/i, "Article", 2],
    [/^(?:letter|epist(?:le|ola))$/i, "Letter", 2],
    [/^(?:tract(?:atus|ate)?)$/i, "Tractate", 2],
    [/^(?:dissertatio)$/i, "Discourse", 2],
    [/^(?:λόγος|λογος)$/i, "Discourse", 2],
  ];
  const ORDW = { primus: 1, prima: 1, primum: 1, secundus: 2, secunda: 2, secundum: 2, tertius: 3, tertia: 3, tertium: 3, quartus: 4, quarta: 4, quartum: 4, quintus: 5, quinta: 5, quintum: 5, sextus: 6, sexta: 6, septimus: 7, septima: 7, octavus: 8, octava: 8, nonus: 9, nona: 9, decimus: 10, decima: 10, first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
  const GREEK = { α: 1, β: 2, γ: 3, δ: 4, ε: 5, ϛ: 6, ζ: 7, η: 8, θ: 9, ι: 10, κ: 20, λ: 30, μ: 40, ν: 50, ξ: 60, ο: 70, π: 80, ρ: 100 };
  function lnum(t) {
    const w = String(t).replace(/[.ʹ΄']+$/, "");
    if (/^\d+$/.test(w)) return Number(w);
    if (/^[IVXLCDM]+$/.test(w)) {
      const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      let n = 0;
      for (let k = 0; k < w.length; k += 1) { const x = v[w[k]]; const y = v[w[k + 1]] || 0; n += x < y ? -x : x; }
      return n;
    }
    if (ORDW[w.toLowerCase()]) return ORDW[w.toLowerCase()];
    if (/^[Α-Ωα-ω]{1,4}$/.test(w)) {
      let n = 0;
      for (const ch of w.toLowerCase()) { if (!GREEK[ch]) return null; n += GREEK[ch]; }
      return n;
    }
    return null;
  }
  const ROMAN = (n) => {
    let out = "";
    [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]
      .forEach(([v, r]) => { while (n >= v) { out += r; n -= v; } });
    return out;
  };
  const LNUM = "([IVXLCDM]+|\\d+|[Α-Ω]{1,4}[ʹ΄']|[A-Za-z]+)";
  const LABEL_FORMS = [
    new RegExp(`^\\s*\\[\\s*([A-Za-z]+)\\.?\\s*${LNUM}\\.?([^\\]\\n]{0,40})\\]`),
    new RegExp(`^\\s*(CAPUT|CAPITULUM|CAP|CHAPTER|CHAP|HOMILY|HOMILIA|SERMO|SERMON|LIBER|BOOK|DISSERTATIO|ARTICULUS|ARTICLE|QUAESTIO|QUESTION|EPISTOLA|EPISTLE|TRACTATUS|ΚΕΦΑΛΑΙΟΝ|ΛΟΓΟΣ|ΟΜΙΛΙΑ)\\.?\\s+${LNUM}\\.?()(?=[\\s!:,;—–-]|$)`, "u"),
    new RegExp(`^\\s*(Caput|Capitulum|Chapter|Chap|Cap|Homily|Homilia|Sermo|Liber|Book|Article|Articulus|Quaestio|Dissertatio)\\.?\\s+([IVXLCDM]+|\\d+)(?:\\.|:|\\s*[—–]|(?=\\s*$))()`),
  ];
  function labelOf(text) {
    for (const re of LABEL_FORMS) {
      const m = re.exec(text);
      if (!m) continue;
      const kind = LKIND.find(([k]) => k.test(m[1]));
      const n = kind ? lnum(m[2]) : null;
      if (!kind || !n) continue;
      return { name: kind[1], depth: kind[2], n, detail: clean(m[3] || "").replace(/^[.,\s]+|[.,\s]+$/g, "") };
    }
    return null;
  }
  let lcache = null;
  function labelRows(reading) {
    const rows = reading.querySelectorAll(".folio > .row[id]");
    if (lcache && lcache.n === rows.length && lcache.reading === reading) return lcache.out;
    const found = [];
    rows.forEach((row) => {
      if (row.matches(".rhead") || row.closest(".pld-editorial")) return;
      const page = (/^b(.+)-\d+$/.exec(row.id) || [])[1];
      if (page == null) return;
      const ps = row.querySelectorAll(":scope > :is(.en, .la, .gr) > p, :scope > p");
      for (const p of ps) {
        const lab = labelOf((p.textContent || "").slice(0, 120));
        if (lab) { found.push({ row, page, ...lab }); break; }
      }
    });
    let rises = 0;
    const last = new Map();
    found.forEach((f) => {
      const prev = last.get(f.name);
      if (prev != null && f.n > prev) rises += 1;
      last.set(f.name, f.n);
    });
    const ok = found.length >= 3 && rises >= 2;
    const books = found.some((f) => f.depth === 1);
    const pre = /^pld-/.test(slug()) ? "col." : "p.";
    const out = ok ? found.map((f) => ({
      title: `${f.name} ${ROMAN(f.n)}`,
      page: f.page,
      anchor: f.row.id,
      depth: books ? f.depth : 1,
      element: f.row,
      frDetail: f.detail,
      frCol: `${pre} ${f.page}`,
    })) : [];
    lcache = { n: rows.length, reading, out };
    return out;
  }
  function data() {
    try { return typeof DATA !== "undefined" ? DATA : null; } catch (_) { return null; }
  }
  const baseConf = api.isConfession;
  function labelWork(d) {
    if (!d || (Array.isArray(d.structure) && d.structure.length)) return false;
    const reading = document.getElementById("reading");
    return !!reading && labelRows(reading).length >= 3;
  }
  if (typeof baseConf === "function") {
    api.isConfession = function (d) {
      if (baseConf.call(this, d)) return true;
      try { return labelWork(d); } catch (_) { return false; }
    };
  }

  // The starting column beside each chapter entry, and its verse detail.
  const byAnchor = new Map();
  function decorate() {
    const nav = document.getElementById("nav");
    if (!nav || !byAnchor.size) return;
    nav.querySelectorAll(".nav-node a.nn-t:not([data-fr-col])").forEach((a) => {
      let h = "";
      try { h = decodeURIComponent(new URL(a.href, window.location.href).hash.slice(1)); } catch (_) { h = ""; }
      const r = byAnchor.get(h);
      if (!r) return;
      a.dataset.frCol = "1";
      const sp = document.createElement("span");
      sp.className = "nn-col";
      sp.textContent = r.frDetail ? `${r.frCol} · ${r.frDetail}` : r.frCol;
      a.after(sp);
    });
  }
  let watching = false;
  function watchNav() {
    const nav = document.getElementById("nav");
    if (!nav || watching) return;
    watching = true;
    if (window.MutationObserver) new MutationObserver(decorate).observe(nav, { childList: true, subtree: true });
  }
  document.addEventListener("DOMContentLoaded", () => { watchNav(); decorate(); });

  /* FRONT MATTER, one group (Ian, 2026-09-24, on Calvin's Institutes:
     "All of the front matter ... should be under a header and be
     collapsible"). For any work whose outline runs through two or more
     entries before its first main division (Book I, Part I, Chapter 1,
     Liber I, Article I, Question 1, Lord's Day 1, Homily I) and then
     follows at least two of that division, those entries nest under one
     "Front Matter" entry at the division's rank. Decided from the
     outline, never from a list; an outline that already opens on "Front
     Matter", or has no clear run of divisions, is left alone. The
     engine's own outline (readerDisplayOutline) is untouched unless the
     rule applies. faith-reader-folds.js folds the group on a heading row
     it adds before the first page's text. */
  const MAIN = /^(?:the\s+)?(?:book|part|liber|pars|chapter|chap\.?|caput|cap\.|article|articulus|question|quaestio|lord['’]?s\s+day|homily|homilia|sermon|sermo|tractate|tractatus|letter|epistle|epistola)\s+(?:[ivxlcdm]+|\d+|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i;
  const kindOfMain = (t) => (MAIN.exec(clean(t)) ? clean(t).toLowerCase().replace(/^the\s+/, "").split(/[\s.]/)[0] : "");
  function frontMatter(src) {
    if (!Array.isArray(src) || src.length < 4) return null;
    // An outline that already groups its front matter ("Front Matter",
    // "Front matter: Parts I–II") keeps its own.
    if (src.slice(0, 3).some((e) => /^front\s*matter\b/i.test(clean(e && e.title)))) return null;
    const m = src.findIndex((e) => kindOfMain(e.title));
    if (m < 2) return null;
    const d = Math.max(1, Number(src[m].depth) || 1);
    if (src.slice(0, m).some((e) => (Number(e.depth) || 1) > d + 1 || (Number(e.depth) || 1) < d)) return null;
    const kind = kindOfMain(src[m].title);
    const same = src.slice(m).filter((e) => (Number(e.depth) || 1) === d && kindOfMain(e.title) === kind).length;
    if (same < 2) return null;
    const head = { ...src[0], title: "Front Matter", depth: d, navFullTitle: "Front Matter", frFrontMatter: true };
    delete head.navSourcePath;
    delete head.navSourceKey;
    return [head, ...src.slice(0, m).map((e) => ({ ...e, depth: (Number(e.depth) || 1) + 1 })), ...src.slice(m)];
  }
  const baseOutline = api.outline;
  if (typeof baseOutline === "function") {
    const memo = new WeakMap();
    api.outline = function (d, ...rest) {
      const own = baseOutline.call(this, d, ...rest);
      try {
        if (!d || baseConf.call(api, d)) return own;
        let src = own;
        if (!src) {
          let tei = null;
          try { tei = typeof TEI_PAGES === "undefined" ? null : TEI_PAGES; } catch (_) { tei = null; }
          src = (window.FRSourceOutline && window.FRSourceOutline.outline(d, tei)) || d.structure;
        }
        if (!src || typeof src !== "object") return own;
        if (memo.has(src)) return memo.get(src) || own;
        const fm = frontMatter(src);
        memo.set(src, fm);
        return fm || own;
      } catch (_) { return own; }
    };
  }

  const base = api.contents;
  api.contents = function (...args) {
    const [reading] = args;
    const rows = base.apply(this, args);
    const rule = RULES[slug()];
    if (!rule && reading) {
      try {
        const d = data();
        if (d && !baseConf.call(api, d) && labelWork(d)) {
          const out = labelRows(reading);
          byAnchor.clear();
          out.forEach((r) => byAnchor.set(r.anchor, r));
          // The engine draws the entries right after this returns.
          window.setTimeout(() => { watchNav(); decorate(); }, 0);
          return out;
        }
      } catch (_) { return rows; }
    }
    if (!rule || !reading) return rows;
    try { return overlay(rows, reading, rule); } catch (_) { return rows; }
  };
})();
