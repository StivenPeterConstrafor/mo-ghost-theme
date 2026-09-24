/*
 * The English lane of the Patrologia, set to be read (Ian, 2026-09-24,
 * on Boethius' Consolation, pld-3278: "difficult to read. It needs to be
 * formatted better. And the headers need to be translated." And: "I
 * don't understand what all the numbers in the middle of the text are
 * ... every work like this needs to be fixed too.").
 *
 * FIVE THINGS, ALL DISPLAY ONLY. The stored text is never rewritten, and
 * no character of any element's textContent changes: the engine finds
 * headings by their text, and search, Find and passage links match on
 * it. Text is only wrapped in spans; what should not show is hidden by
 * CSS (faith-port-reader-skin.css, "ENGLISH LANE: MARKERS, VERSE,
 * LABELS"); English words are shown with CSS attr(), never typed in.
 *
 *  1. NOTE AND LINE MARKERS. Migne's note references and line numbers
 *     came through the translation as bare numbers: "pondering these
 *     things with myself 6 , and marking my tearful 7 8 complaint",
 *     "restrained herself 16 (5) to the common measure". Decided per
 *     column from the pattern (several bare numbers, with a number
 *     before a comma or stop, a cluster "7 8", or a rising run), never
 *     from a list of works. Numbers after "chapter", "verse", "book" and
 *     the like, or before "years", "days" and the like, are content and
 *     stay. The editorial notes the Patrologia carries are keyed by
 *     their Latin lemma, not by these numbers, so there is no note to
 *     link a number to: the marker is hidden, with the space it left
 *     before a comma or stop.
 *  2. BARE NUMBERS AND REPEATED LABELS under a heading: the row "1"
 *     under "1 METRUM PRIMUM." and the row "METER 1 I." that repeats
 *     the heading are hidden.
 *  3. THE ARGUMENT a section opens with ("ARGUMENT.-- Boethius, having
 *     observed ...") is set as the site sets an argument: italic, muted,
 *     the terracotta rule at its left.
 *  4. VERSE. A section headed Metrum/Meter/Carmen is set one line per
 *     verse. The source keeps no line breaks (the TEI has no <l>; the
 *     verse is one <p>), so a line starts at a capital that follows
 *     line-ending punctuation or a marker. Not a word moves.
 *  5. LATIN LABELS in English. In the English lane, a heading's label
 *     ("1 METRUM PRIMUM.", "LIBER PRIMUS", "CHAPTER ONE") shows in
 *     English, numbered one way ("Poem 1", "Book I", "Chapter I"). The
 *     book's heading, which the Patrologia prints after its first
 *     section's, shows above that section's card. The Latin lane keeps
 *     its Latin.
 */
(function () {
  "use strict";

  const reading = document.getElementById("reading");
  if (!reading) return;

  /* ── Labels ──────────────────────────────────────────────────────── */
  const EN = {
    liber: "Book", lib: "Book", book: "Book", booke: "Book",
    caput: "Chapter", capitulum: "Chapter", cap: "Chapter", chapter: "Chapter", chap: "Chapter",
    pars: "Part", part: "Part", sectio: "Section", section: "Section",
    quaestio: "Question", question: "Question", articulus: "Article", article: "Article",
    sermo: "Sermon", sermon: "Sermon", homilia: "Homily", homily: "Homily",
    epistola: "Letter", epistle: "Epistle", letter: "Letter",
    praefatio: "Preface", prologus: "Prologue", tractatus: "Treatise", treatise: "Treatise",
    distinctio: "Distinction", distinction: "Distinction", disputatio: "Disputation",
    disputation: "Disputation", lectio: "Lecture", lecture: "Lecture",
    metrum: "Poem", meter: "Poem", metre: "Poem", carmen: "Poem", poem: "Poem",
    prosa: "Prose", prose: "Prose",
  };
  // Poem and prose sections are numbered 1, 2, 3; the rest keep the
  // numerals printed, with numbers in words as roman numerals, as the
  // contents number them.
  const ARABIC = new Set(["Poem", "Prose"]);
  const WORDNUM = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
    "eighteen", "nineteen", "twenty"];
  const ORDNUM = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
    "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth",
    "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"];
  const LATORD = ["", "prim", "secund", "terti", "quart", "quint", "sext", "septim",
    "octav", "non", "decim"];
  const romanToInt = (r) => {
    const v = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
    let n = 0;
    const s = r.toLowerCase().replace(/j$/, "i");
    for (let i = 0; i < s.length; i++) {
      const a = v[s[i]], b = v[s[i + 1]] || 0;
      n += a < b ? -a : a;
    }
    return n;
  };
  const intToRoman = (n) => {
    const t = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
      [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let out = "";
    for (const [v, s] of t) while (n >= v) { out += s; n -= v; }
    return out;
  };
  function numValue(tok) {
    const low = tok.toLowerCase();
    if (/^\d{1,4}$/.test(low)) return Number(low);
    if (/^[ivxlcdm]+j?$/.test(low)) return romanToInt(low);
    let n = WORDNUM.indexOf(low);
    if (n > 0) return n;
    n = ORDNUM.indexOf(low);
    if (n > 0) return n;
    n = LATORD.findIndex((s) => s && new RegExp(`^${s}(?:us|a|um)$`).test(low));
    return n > 0 ? n : 0;
  }
  const WORDS = Object.keys(EN).join("|");
  const NUMTOK = `[ivxlcdm]+j?|\\d{1,4}|${WORDNUM.slice(1).join("|")}|${ORDNUM.slice(1).join("|")}|` +
    `(?:${LATORD.slice(1).join("|")})(?:us|a|um)`;
  // One group: "LIBER PRIMUS", "METER 1 I" (a stray number between),
  // "CAP. 4". A whole label may carry a stray number before it.
  const GROUP = `(${WORDS})\\.?\\s+(?:\\d{1,4}\\s+(?=(?:[ivxlcdm]+j?|[a-z]{4,})\\b))?(${NUMTOK})`;
  const LABEL_RE = new RegExp(`^\\s*(?:\\d{1,4}\\s+)?${GROUP}(?:\\s*[.,:;·—–-]+\\s*${GROUP})?\\s*[.:,;—–-]*\\s*$`, "i");
  const WORD_ONLY = /^\s*(praefatio|prologus|prooemium|epilogus)\s*[.:]?\s*$/i;
  const WORD_EN = { praefatio: "Preface", prologus: "Prologue", prooemium: "Preface", epilogus: "Epilogue" };

  // Labels that need English: a Latin word or ordinal, the engine's
  // "Meter" for Metrum, or a stray number. English labels as printed
  // ("CHAP. I", "BOOK FIRST") are left alone.
  const LATIN = new RegExp(`\\b(?:liber|lib|caput|capitulum|cap|pars|sectio|quaestio|articulus|sermo|` +
    `homilia|epistola|praefatio|prologus|prooemium|epilogus|tractatus|distinctio|disputatio|lectio|` +
    `metrum|meter|metre|carmen|prosa|(?:${LATORD.slice(1).join("|")})(?:us|a|um))\\b|^\\s*\\d{1,4}\\s+\\p{L}`, "iu");
  // "1 METRUM PRIMUM." -> "Poem 1"; "LIBER PRIMUS" -> "Book I". Null when
  // the text is not a label and nothing else.
  function english(text) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    const w = t.match(WORD_ONLY);
    if (w) return WORD_EN[w[1].toLowerCase()];
    const m = t.match(LABEL_RE);
    if (!m) return null;
    const one = (word, num) => {
      const en = EN[word.toLowerCase()];
      const v = numValue(num);
      if (!en || !v) return null;
      // Arabic as printed stays arabic; words and Latin ordinals take the
      // house roman numerals.
      return `${en} ${ARABIC.has(en) || /^\d+$/.test(num) ? v : intToRoman(v)}`;
    };
    const a = one(m[1], m[2]);
    if (!a) return null;
    if (!m[3]) return a;
    const b = one(m[3], m[4]);
    return b ? `${a} · ${b}` : null;
  }
  const bare = (t) => String(t || "").toLowerCase().replace(/\d+/g, "").replace(/[^\p{L}]/gu, "");

  /* ── Text helpers ────────────────────────────────────────────────── */
  function textNodes(el) {
    const out = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) out.push(n);
    return out;
  }
  // A Range over [a, b) of el's textContent.
  function rangeOf(el, a, b) {
    const r = document.createRange();
    let pos = 0, set = false;
    for (const n of textNodes(el)) {
      const len = n.nodeValue.length;
      if (!set && a <= pos + len) { r.setStart(n, a - pos); set = true; }
      if (set && b <= pos + len) { r.setEnd(n, b - pos); return r; }
      pos += len;
    }
    return null;
  }
  function wrap(el, a, b, cls) {
    if (b <= a) return null;
    const r = rangeOf(el, a, b);
    if (!r) return null;
    const span = document.createElement("span");
    span.className = cls;
    span.appendChild(r.extractContents());
    r.insertNode(span);
    return span;
  }

  /* ── 1. Markers ─────────────────────────────────────────────────── */
  const BEFORE = /^(?:chapters?|chap|ch|caps?|capit|verses?|vv?|books?|lib|psalms?|pss?|pages?|pp?|col|cols|columns?|lines?|l|years?|anno|ad|bc|a\.d|b\.c|number|numbers|nos?|n|sections?|sect|sec|parts?|questions?|q|qq|articles?|art|epistles?|letters?|ep|epist|epp|tract|tr|enarr|serm|sermons?|serm|homil(?:y|ies)|hom|lectures?|lect|dist|distinctions?|tome|vol|volumes?|fol|folio|§|no\.|paragraph|chapter\.)$/i;
  const AFTER = /^(?:years?|days?|months?|weeks?|hours?|times|men|women|persons|thousand|thousands|hundred|hundreds|cubits|talents|shekels|denarii|books|chapters|verses|psalms|feet|miles|stadia|pounds|shillings|sheep|loaves|fishes|brothers|sons|daughters|kings|apostles|disciples|tribes|%)(?=$|[\s.,;:])/i;
  const NUM_AT = /(^|\s)(\d{1,3})(?=\s|$)/g;

  // The marker candidates in a paragraph's text: [{a, b, v}] where [a, b)
  // is the number itself.
  function candidates(t) {
    const out = [];
    NUM_AT.lastIndex = 0;
    let m;
    while ((m = NUM_AT.exec(t))) {
      const a = m.index + m[1].length, b = a + m[2].length;
      const prev = (t.slice(0, a).match(/(\S+)\s*$/) || [])[1] || "";
      const next = (t.slice(b).match(/^\s*(\S+)/) || [])[1] || "";
      const prevWord = prev.replace(/[.,;:()[\]"'’”]+$/, "");
      const prevIsNum = /^\d{1,3}$/.test(prev);
      if (!prevIsNum && BEFORE.test(prevWord)) continue;
      if (AFTER.test(next)) continue;
      if (/^[:–-]\d/.test(next)) continue; // "3 :16", "3 -5"
      out.push({ a, b, v: Number(m[2]) });
    }
    return out;
  }
  // A column shows Migne's markers when bare numbers keep turning up
  // where no number belongs: before a comma or stop, in clusters, or
  // counting upward.
  function markedColumn(texts) {
    let count = 0, punct = 0, cluster = 0, rising = 0, last = -1;
    for (const t of texts) {
      const cs = candidates(t);
      count += cs.length;
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i];
        if (/^\s+[,.;:!?]/.test(t.slice(c.b))) punct++;
        if (i && /^\s+$/.test(t.slice(cs[i - 1].b, c.a))) cluster++;
        if (last >= 0 && c.v > last && c.v - last <= 12) rising++;
        last = c.v;
      }
    }
    return count >= 3 && (punct >= 1 || cluster >= 1 || rising >= 2);
  }
  const LINE_MARK = /\s\((5|10|15|20|25|30|35|40|45|50|55|60)\)(?=\s|[,.;:]|$)/g;

  // Ranges to hide in t: markers with the space before them (and the space
  // after, when a comma or stop follows), and "(5)" line numbers.
  function hideRanges(t) {
    const cs = candidates(t);
    const out = [];
    for (let i = 0; i < cs.length; i++) {
      let j = i;
      while (j + 1 < cs.length && /^\s+$/.test(t.slice(cs[j].b, cs[j + 1].a))) j++;
      let a = cs[i].a, b = cs[j].b;
      const after = t.slice(b).match(/^\s+(?=[,.;:!?)])/);
      if (a === 0 || /^\s*$/.test(t.slice(0, a))) {
        a = 0;
        b += (t.slice(b).match(/^\s+/) || [""])[0].length;
      } else {
        a -= (t.slice(0, a).match(/\s+$/) || [""])[0].length;
        if (after) b += after[0].length;
      }
      out.push([a, b]);
      i = j;
    }
    LINE_MARK.lastIndex = 0;
    let m;
    while ((m = LINE_MARK.exec(t))) out.push([m.index, m.index + m[0].length]);
    return out.sort((x, y) => x[0] - y[0]).filter((r, k, all) => !k || r[0] >= all[k - 1][1]);
  }

  /* ── 3/4. Argument and verse ─────────────────────────────────────── */
  const ARG = /^\s*argument(?:um)?\s*[.:]?\s*[-–—.:]+\s*/i;
  // Where a verse line starts: a capital after line-ending punctuation,
  // or after a marker; "I" only after a full stop.
  function verseBreaks(t, from, hidden) {
    const isHidden = (i) => hidden.some(([a, b]) => i >= a && i < b);
    const out = [];
    const re = /\p{Lu}/gu;
    re.lastIndex = from;
    let m;
    while ((m = re.exec(t))) {
      const i = m.index;
      if (i <= from) continue;
      if (/[\p{L}\p{N}'’]/u.test(t[i - 1] || "")) continue;
      // The text before, less hidden markers and spaces.
      let k = i - 1;
      while (k > from && (/\s/.test(t[k]) || isHidden(k))) k--;
      if (k <= from) continue;
      const ch = t[k];
      const word = (t.slice(i).match(/^\p{L}+/u) || [""])[0];
      const markerBefore = hidden.some(([a, b]) => b <= i && b > k && a > k);
      const punct = /[,;:.!?"”’)]/.test(ch);
      if (!punct && !markerBefore) continue;
      if (word === "I" && !/[.!?;]/.test(ch)) continue;
      out.push(i);
    }
    return out;
  }

  /* ── The pass ────────────────────────────────────────────────────── */
  const doneText = new WeakMap();
  const headText = (row) => {
    const h = row.querySelector(".en h1, .en h2, .en h3, .en h4");
    if (!h) return "";
    const t = h.querySelector(".fr-hd-title");
    return (t || h).textContent.replace(/^\s*§\s*/, "");
  };
  const isHeadRow = (row) => row.classList.contains("rhead") || !!row.querySelector(":scope > .en > :is(h2, h3, h4)");
  const laneP = (row, lane) => Array.from(row.querySelectorAll(`:scope > .${lane} > p`));

  function translateHeading(el) {
    if (!el || el.classList.contains("fr-trx")) return;
    if (!LATIN.test(el.textContent)) return;
    const en = english(el.textContent);
    if (!en) return;
    const shown = en;
    // "Book One" already reads in English: leave it unless the numbering
    // changes ("CHAPTER ONE" -> "Chapter I", to match "CHAPTER II").
    const o = document.createElement("span");
    o.className = "fr-trx-o";
    while (el.firstChild) o.appendChild(el.firstChild);
    el.appendChild(o);
    el.classList.add("fr-trx");
    el.setAttribute("data-fr-en", shown);
  }

  function processColumn(rows) {
    // Which rows are verse: those under a Metrum heading.
    let verse = false, lastHead = null, sinceHead = 0;
    const texts = [];
    for (const row of rows) for (const p of laneP(row, "en")) if (!p.classList.contains("fr-hd")) texts.push(p.textContent);
    const marked = markedColumn(texts);
    for (const row of rows) {
      if (isHeadRow(row)) {
        const ht = headText(row);
        verse = /\b(metrum|meter|metre|carmen)\b/i.test(ht);
        lastHead = row;
        sinceHead = 0;
        continue;
      }
      sinceHead++;
      const ps = laneP(row, "en");
      if (!ps.length) continue;
      // 2. Bare number / repeated label rows under a heading.
      if (lastHead && sinceHead <= 4 && !row.classList.contains("fr-vx-hide")) {
        const et = ps.map((p) => p.textContent).join(" ").trim();
        const lat = laneP(row, "la").map((p) => p.textContent).join(" ").trim();
        const ht = headText(lastHead).trim();
        const hl = (lastHead.querySelector(":scope > .la") || lastHead).textContent.trim();
        const lead = (ht.match(/^(\d{1,4})\s/) || [])[1];
        const isNum = (s) => /^\d{1,4}\.?$/.test(s);
        if (lead && isNum(et) && (!lat || isNum(lat)) && et.replace(".", "") === lead) {
          row.classList.add("fr-vx-hide");
          continue;
        }
        if (bare(ht) && (bare(lat) === bare(hl) || bare(et) === bare(ht)) && et.length < 40 && english(et)) {
          row.classList.add("fr-vx-hide");
          continue;
        }
      }
      for (const p of ps) {
        if (p.classList.contains("fr-hd") || p.closest(".fr-hd")) continue;
        const t = p.textContent;
        if (doneText.get(p) === t) continue;
        if (p.querySelector(".fr-nm, .fr-vl, .fr-vx-arg")) { doneText.set(p, t); continue; }
        // A paragraph with real footnote marks keeps its numbers.
        const hidden = marked && !p.querySelector("sup, .fnref, a.fn") ? hideRanges(t) : [];
        // Wrap from the end so earlier offsets hold.
        for (let k = hidden.length - 1; k >= 0; k--) wrap(p, hidden[k][0], hidden[k][1], "fr-nm");
        const arg = t.match(ARG);
        if (arg) {
          // The argument runs to the end of the sentence before the first
          // marker, or the whole paragraph.
          const first = hidden.find(([a]) => a > arg[0].length);
          let end = t.length;
          if (first) {
            const before = t.slice(0, first[0]);
            end = /[.!?]["”’)]?\s*$/.test(before) ? first[0] : t.length;
          }
          const lines = verse && end < t.length ? verseBreaks(t, end, hidden) : [];
          const cuts = [end, ...lines, t.length].filter((x, i, a) => i === 0 || x > a[i - 1]);
          for (let k = cuts.length - 1; k > 0; k--) {
            if (verse && end < t.length) wrap(p, cuts[k - 1], cuts[k], "fr-vl");
          }
          const argSpan = wrap(p, 0, end, "fr-vx-arg");
          if (argSpan) wrap(argSpan, 0, arg[0].length, "fr-vx-arglabel");
          if (verse && end < t.length) p.classList.add("fr-vx-verse");
          if (end >= t.length) p.classList.add("fr-vx-argp");
        } else if (verse) {
          const lines = verseBreaks(t, 0, hidden);
          const cuts = [0, ...lines, t.length].filter((x, i, a) => i === 0 || x > a[i - 1]);
          if (cuts.length > 2) {
            for (let k = cuts.length - 1; k > 0; k--) wrap(p, cuts[k - 1], cuts[k], "fr-vl");
            p.classList.add("fr-vx-verse");
          }
        }
        doneText.set(p, p.textContent);
      }
    }
  }

  // 5. Headings in the English lane, and the book heading moved above its
  // first section's card.
  function processHeadings(rows) {
    for (const el of reading.querySelectorAll(".en .fr-hd .fr-hd-title, .en .fr-hd .fr-hd-eye, .en .fr-hd-sublabel .fr-hd-eye")) {
      translateHeading(el);
    }
    for (let i = 0; i + 1 < rows.length; i++) {
      const row = rows[i], next = rows[i + 1];
      if (!isHeadRow(row)) continue;
      const nextEye = next.querySelector(".en .fr-hd-eye, .en .fr-hd-labelonly");
      const laEye = next.querySelector(".la .fr-hd-eye, .la .fr-hd-labelonly");
      if (!nextEye || isHeadRow(next)) continue;
      const bookEn = english(nextEye.textContent);
      if (!bookEn || !/^Book /.test(bookEn)) continue;
      const enLane = row.querySelector(":scope > .en");
      const laLane = row.querySelector(":scope > .la");
      if (enLane) enLane.setAttribute("data-fr-book", bookEn);
      if (laLane && laEye) laLane.setAttribute("data-fr-book", laEye.textContent.replace(/[.\s]+$/, ""));
      row.classList.add("fr-vx-bookhead");
      next.classList.add("fr-vx-hide", "fr-vx-bookrow");
    }
  }

  let busy = false, timer = 0;
  function run() {
    if (busy) return;
    busy = true;
    try {
      const folios = reading.querySelectorAll("section.folio");
      const groups = folios.length
        ? Array.from(folios, (f) => Array.from(f.querySelectorAll(":scope > .row")))
        : [Array.from(reading.querySelectorAll(".row"))];
      const all = [];
      for (const rows of groups) {
        if (!rows.length) continue;
        all.push(...rows);
        if (!rows.some((r) => r.querySelector(':scope > .en[lang="en"]'))) continue;
        processColumn(rows);
      }
      if (all.some((r) => r.querySelector(':scope > .en[lang="en"]'))) processHeadings(all);
    } catch (e) {
      /* display only: never break the reader */
    } finally {
      busy = false;
    }
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  }
  new MutationObserver(() => { if (!busy) schedule(); })
    .observe(reading, { childList: true, subtree: true });
  schedule();
})();
