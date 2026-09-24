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

  const base = api.contents;
  api.contents = function (...args) {
    const [reading] = args;
    const rows = base.apply(this, args);
    const rule = RULES[slug()];
    if (!rule || !reading) return rows;
    try { return overlay(rows, reading, rule); } catch (_) { return rows; }
  };
})();
