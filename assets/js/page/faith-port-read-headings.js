/*
 * Section headings in the text: one hierarchy, set the way the rest of
 * The Faith Received sets a head (Ian, 2026-09-24: "I like the little
 * boxes ... there still just seems to be some inconsistency about what
 * is a header, subheader, and eyebrow").
 *
 * FOUR PARTS, EACH WITH ONE STYLE EVERYWHERE (faith-port-reader-skin.css,
 * "SECTION HEADINGS: ONE HIERARCHY"):
 *
 *   EYEBROW   the division label only: "Book I · Chapter II", "Article
 *             XXIII", "Lord's Day 1", "Q. 33". Group separators (a dash,
 *             comma or stop in the source) print as one centred dot.
 *   TITLE     the heading's name. A title printed in capitals is set in
 *             the same case as every other title (word by word, below).
 *   SUBTITLE  a short line under the title, italic and muted.
 *   ARGUMENT  a printed summary, with the terracotta rule at its left.
 *
 * A heading that is only a label ("CHAPTER II.", "HOMILY IV.") takes
 * the short line or plain heading under it as its title, exactly as if
 * it had carried it. Under a label and nothing else, the label stands
 * alone as an eyebrow.
 *
 * THREE TIERS decide the setting (tierOf): a CARD for the top of the
 * outline (books, parts, articles, chapters, homilies, a Lord's Day, a
 * prayer-book office), a HAIRLINE for what sits under those (an office's
 * psalms and collects, sections, headings the outline does not list),
 * and a PLAIN head for the smallest and most numerous (a catechism's
 * questions, the prayer book's fourth level), so that a catechism or
 * the psalter does not become a wall of boxes.
 *
 * NOTHING IN THE WORDS CHANGES. The engine finds a heading to jump to by
 * its textContent, and search, Find and passage links match on it. The
 * split wraps the heading's own text in spans; a separator is hidden,
 * never removed; capitals are recased by CSS, never rewritten. The
 * section-link "§" (.hanchor) is not part of the heading and is left
 * out of the analysis, so it can never be mistaken for a label.
 *
 * No layout is read here at all: every decision is made from the text
 * and the markup, so a pass over the prayer book's 500 headings costs
 * DOM writes and nothing else.
 */
(function () {
  "use strict";

  const scroll = document.getElementById("scroll");
  if (!scroll) return;
  const app = document.getElementById("app");

  /* ── Labels ─────────────────────────────────────────────────────── */
  const ORD = "(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|last)";
  const NUM = `(?:[ivxlcdm]+|\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|${ORD}|primus|prima|primum|secundus|secunda|secundum|tertius|tertia|tertium|quartus|quarta|quartum|quintus|quinta|quintum|sextus|sexta|septimus|septima|octavus|octava|nonus|nona|decimus|decima)`;
  const WORD = "(?:chap(?:ter)?|cap(?:ut|itulum)?|book|booke|lib(?:er)?|part|pars|sect(?:ion|io)?|article|art|quaestio|question|q|sermon|homil(?:y|ia)|psalm|epist(?:le|ola)|letter|tract(?:ate|atus)?|distinctio|dist|lectio|lecture|disputatio|disputation|oratio|oration|canon|dialogue|dialogus|discourse|treatise|lord[’']?s\\s+day)";
  // "Book I", "CHAP. III", "Q. 33", "First Part", "§ 4". No trailing
  // stop: "CHAP. III." ends its label at the numeral, and the stop goes
  // with the separator, which is hidden.
  const GROUP = `(?:${WORD}\\.?\\s*${NUM}|${ORD}\\s+${WORD}|§\\s*\\d+)\\b`;
  const SEP = "\\s*[-–—,:;.]*\\s*";
  const HEAD = new RegExp(`^([\\s*]*)(${GROUP}(?:${SEP}${GROUP})*)(\\s*[-–—.:,;]*\\s*)`, "i");
  const GROUP_SEP = new RegExp(`(${GROUP})(${SEP})(?=${GROUP})`, "gi");
  // A catechism question numbered with nothing else: "1. What is your
  // only comfort in life and in death?" Only when it asks a question.
  const QNUM = /^(\s*)(\d{1,3})(\.\s+)(?=\S)/;
  const LABEL_WORD = new RegExp(`^(?:${ORD}\\s+)?(${WORD}|§)`, "i");

  // Divisions that sit UNDER a chapter: a hairline, never a card.
  const MINOR_WORD = /^(?:sect(?:ion|io)?|§|dist(?:inctio)?|canon|lectio)$/i;

  const clean = (t) => String(t || "").replace(/\s+/g, " ").trim();

  /* ── Text, without the section link ─────────────────────────────── */
  // Everything this file measures or wraps is the heading's text less
  // the engine's "§" link and any control inside it. Offsets are taken
  // in that text, and wrap() walks the same nodes, so they agree.
  const NOT_TEXT = ".hanchor, button, .fr-sec-toggle, .trpencil, .rm-marker, .mnote";
  function textNodes(el) {
    const out = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        return p && p !== el && p.closest(NOT_TEXT) && el.contains(p.closest(NOT_TEXT))
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let n = w.nextNode(); n; n = w.nextNode()) out.push(n);
    return out;
  }
  const textOf = (el) => textNodes(el).map((n) => n.data).join("");

  // Put the Modernizer's original words back before a split, so no new
  // text node is born holding modernized text it would then take for the
  // original (faith-port-read-modernize.js keeps the original on the
  // node). Its observer modernizes the new nodes again.
  function unmodernize(el) {
    textNodes(el).forEach((n) => {
      if (n.frRaw != null) {
        if (n.nodeValue !== n.frRaw) n.nodeValue = n.frRaw;
        n.frRaw = null;
      }
    });
  }

  // The text node and offset at character `pos`. A start point that
  // falls on the end of one node moves to the start of the next, so a
  // range never opens inside an element it does not cover (the old split
  // started inside the "§" link and cloned an empty one into the label).
  function pointAt(nodes, pos, isStart) {
    let seen = 0;
    for (let i = 0; i < nodes.length; i += 1) {
      const len = nodes[i].data.length;
      if (isStart ? pos < seen + len : pos <= seen + len) return [nodes[i], pos - seen];
      seen += len;
    }
    const last = nodes[nodes.length - 1];
    return last ? [last, last.data.length] : null;
  }

  // Wrap characters [a, b) of el's text in a span of class cls.
  function wrap(el, a, b, cls) {
    if (b <= a) return null;
    const nodes = textNodes(el);
    const s = pointAt(nodes, a, true);
    const e = pointAt(nodes, b, false);
    if (!s || !e) return null;
    const r = document.createRange();
    r.setStart(s[0], s[1]);
    r.setEnd(e[0], e[1]);
    const span = document.createElement("span");
    span.className = cls;
    span.appendChild(r.extractContents());
    r.insertNode(span);
    return span;
  }

  // Inside the eyebrow, every gap between two groups ("Book I - Chapter
  // I", "Book I, Chapter I", "LIBER I. CAPUT II") prints as one centred
  // dot. The characters stay; CSS draws the dot. Offsets are in the
  // eyebrow's own text, so this holds across any number of text nodes.
  function dotEyebrow(eye) {
    const text = textOf(eye);
    const gaps = [];
    GROUP_SEP.lastIndex = 0;
    let m;
    while ((m = GROUP_SEP.exec(text))) {
      const at = m.index + m[1].length;
      gaps.push([at, at + m[2].length]);
      if (!m[0].length) GROUP_SEP.lastIndex += 1;
    }
    for (let i = gaps.length - 1; i >= 0; i -= 1) {
      const dot = wrap(eye, gaps[i][0], gaps[i][1], "fr-hd-dot");
      if (dot && !dot.textContent) dot.remove();
    }
  }

  /* ── Case ───────────────────────────────────────────────────────── */
  // A title printed in capitals ("THE KNOWLEDGE OF GOD AND OF OURSELVES")
  // is set in headline case like the titles printed in lower case, not
  // left in capitals or small caps beside them. Headline case rather than
  // sentence case because CSS can only lower a word, never tell a proper
  // noun: sentence case would print "god" and "athanasius". Each capital
  // word is wrapped and CSS lowers it, raising the first letter unless it
  // is a short connective; roman numerals keep their capitals. A title
  // in lower case that opens on one capital word ("WHAT is the chief end
  // of man?", a printer's convention) has that word set the same way.
  const MINOR = new Set("a an and as at but by for from in into nor of on or per than the to unto upon via with ad cum de e ex et in per pro seu sive sub vel".split(" "));
  const ROMAN = /^(?=[MDCLXVI])M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/;
  const UPPER = /\p{Lu}/gu;
  const LOWER = /\p{Ll}/gu;
  const count = (s, re) => (String(s).match(re) || []).length;

  function recase(el) {
    const text = textOf(el);
    const up = count(text, UPPER);
    const low = count(text, LOWER);
    const allCaps = up >= 3 && up / (up + low) > 0.85;
    let first = true;
    let afterStop = false;
    let changed = 0;
    textNodes(el).forEach((node) => {
      if (!allCaps && !first) return;
      if (!node.data) return;
      const frag = document.createDocumentFragment();
      let touched = false;
      // A dash before a word ("--NATURE") is not punctuation that
      // ::first-letter takes with the letter, so it goes outside the span.
      const pieces = [];
      node.data.split(/(\s+)/).forEach((p) => {
        const d = /^([-–—]+)(\S+)$/.exec(p);
        if (d) pieces.push(d[1], d[2]); else pieces.push(p);
      });
      // The dash and its word stay on one line (.fr-hd-nb): a line may
      // otherwise break after the first hyphen of "--".
      let dashHost = null;
      pieces.forEach((p) => {
        if (!p) return;
        const into = dashHost || frag;
        dashHost = null;
        if (/^[-–—]+$/.test(p)) {
          dashHost = document.createElement("span");
          dashHost.className = "fr-hd-nb";
          dashHost.appendChild(document.createTextNode(p));
          frag.appendChild(dashHost);
          touched = true;
          afterStop = true;
          return;
        }
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        const letters = p.replace(/[^\p{L}]/gu, "");
        const isFirst = first;
        if (letters) first = false;
        const capsWord = letters.length > 0 && count(letters, LOWER) === 0;
        const want = capsWord && (allCaps || (isFirst && letters.length > 1));
        const bare = letters.toLowerCase();
        let cls = "";
        if (want && !(ROMAN.test(letters) && letters.length <= 8)) {
          cls = !isFirst && !afterStop && MINOR.has(bare) ? "fr-hd-wl" : "fr-hd-wc";
        }
        afterStop = /[.:;?!]$/.test(p);
        if (!cls) { into.appendChild(document.createTextNode(p)); return; }
        const s = document.createElement("span");
        s.className = cls;
        s.textContent = p;
        into.appendChild(s);
        touched = true;
        changed += 1;
      });
      if (touched) node.parentNode.replaceChild(frag, node);
    });
    return changed;
  }

  /* ── Finding headings ───────────────────────────────────────────── */
  // The elements that carry a heading's words: every printed heading
  // (h3.csub, in its own row or in the flow of a lane) and the first
  // paragraph of each language lane of a heading row the section folds
  // found (.fr-sec-headrow, faith-reader-folds.js: the Latin Fathers and
  // the catechisms carry no heading element).
  function freshUnits() {
    const out = [];
    document.querySelectorAll("#reading h3.csub:not([data-fr-hd])").forEach((h) => out.push(h));
    document.querySelectorAll("#reading .row.fr-sec-headrow > :is(.en, .la) > p:first-child:not([data-fr-hd])").forEach((p) => out.push(p));
    return out;
  }
  // The language texts inside a heading element: an h3 can carry the
  // English (.hen) and the Latin (.hla) of one heading side by side.
  function hostsOf(el) {
    if (el.tagName !== "H3") return [el];
    const langs = [...el.querySelectorAll(":scope > .hen, :scope > .hla")].filter((s) => clean(textOf(s)));
    return langs.length ? langs : [el];
  }

  // The row after `row`, across a page boundary: a heading can close
  // its page with its title or argument opening the next. A page not
  // loaded yet (a placeholder) answers "not yet", and the heading is
  // tried again on a later pass.
  function rowAfter(row) {
    const nr = row.nextElementSibling;
    if (nr) return nr.matches(".row, .stkwrap") ? nr : { none: true };
    const folio = row.parentElement;
    if (!folio || !folio.matches(".folio")) return { none: true };
    // Past the page marker (.fmark, "§ 26 · p. 26") between two pages.
    let nf = folio.nextElementSibling;
    while (nf && !nf.matches(".folio, .fph")) nf = nf.nextElementSibling;
    if (!nf) return { none: true };
    if (nf.matches(".fph")) return null;
    return nf.querySelector(":scope > .row, :scope > .stkwrap") || { none: true };
  }
  const laneOf = (el) => el.closest(".en, .la");
  const laneKey = (el) => { const l = laneOf(el); return l ? (l.classList.contains("la") ? "la" : "en") : ""; };

  // What follows a heading element, in its own lane: the next element in
  // the same parent when there is one (a heading printed in the flow),
  // else the matching lane of the next row. null = not loaded yet.
  function nextOf(el) {
    let sib = el.nextElementSibling;
    while (sib && sib.matches(NOT_TEXT)) sib = sib.nextElementSibling;
    if (sib) return sib.matches("p, h3.csub") ? sib : { none: true };
    const parent = el.parentElement;
    const row = el.closest(".row");
    if (!row) return { none: true };
    // Only the last thing in its lane (or row) runs on into the next row.
    if (parent !== row && parent !== laneOf(el)) return { none: true };
    const nr = rowAfter(row);
    if (!nr || nr.none) return nr;
    if (nr.matches(".rhead")) return nr.querySelector("h3.csub") || { none: true };
    const key = laneKey(el);
    const lane = key ? nr.querySelector(`:scope > .${key}`) : (nr.querySelector(":scope > .en") || nr.querySelector(":scope > .la"));
    const first = lane && lane.firstElementChild;
    return first && first.matches("p, h3.csub") ? first : { none: true };
  }

  const isHeading = (el) => el.matches("h3.csub, .row.fr-sec-headrow > :is(.en, .la) > p:first-child");

  function kindOfNext(n) {
    if (!n || n.none) return "";
    const text = clean(textOf(n));
    if (!text) return "";
    if (isHeading(n)) {
      // A plain heading under a label-only heading is that heading's
      // title ("First Part:" / "Of Man's Misery"; "CHAPTER 1." / "THE
      // KNOWLEDGE OF GOD ..."). One with a label of its own is not.
      return text.length < 200 && !HEAD.test(text) && !(QNUM.test(text) && /\?$/.test(text)) ? "head" : "";
    }
    const lenT = text.length;
    const ital = (() => {
      const it = [...n.querySelectorAll("i, em")].reduce((s, e) => s + clean(e.textContent).length, 0);
      return lenT ? it / lenT : 0;
    })();
    if (lenT < 200) {
      const m = HEAD.exec(text);
      if (m && m[2] && clean(text.slice(m[0].length)) === "") return "label";
      // A line with a label and words of its own ("Q. 1. What is the
      // chief end of man?", "1. What is your only comfort ...?") is the
      // next heading, even before the folds have marked its row as one.
      if ((m && m[2]) || (QNUM.test(text) && /\?$/.test(text))) return "";
      // Set apart by the page itself (italic, or capitals) it is a
      // subtitle under any heading. Plain, it may just be a short first
      // paragraph ("COnscience is either good or badde."), so it is a
      // subtitle only under a heading that is nothing but its label.
      const up = count(text, UPPER);
      const low = count(text, LOWER);
      const caps = up + low ? up / (up + low) : 0;
      return ital > 0.7 || caps > 0.8 ? "sub-set" : "sub";
    }
    if (lenT < 1200 && (/^\s*[*†]/.test(text) || ital > 0.7)) return "arg";
    return "";
  }

  /* ── Tiers ──────────────────────────────────────────────────────── */
  function tierOf(el) {
    if (el.classList.contains("fr-hd-q")) return "t3";
    const row = el.closest(".row");
    const lit = app && app.classList.contains("liturgy");
    if (row && row.classList.contains("rhead")) {
      if (lit) {
        if (row.matches(".hl2, .hl1, .hmain")) return "card";
        return row.classList.contains("hl3") ? "t2" : "t3";
      }
      if (row.matches(".hl4, .hl5, .hl6")) return "t3";
    }
    const eye = el.querySelector(".fr-hd-eye");
    const word = eye ? ((clean(textOf(eye)).match(LABEL_WORD) || [])[1] || "") : "";
    // Only the heading at the top of a fold row speaks for the outline
    // entry; a second heading in the same row is not in the outline.
    const own = row && row.dataset.frSec != null && firstUnitOf(row) === el;
    const depth = own ? Number(row.dataset.frDepth || 0) : 0;
    if (word) {
      if (MINOR_WORD.test(word)) return "t2";
      return depth >= 3 ? "t2" : "card";
    }
    if (own) return depth >= 3 ? "t2" : "card";
    return "t2";
  }
  function firstUnitOf(row) {
    return row.querySelector("h3.csub[data-fr-hd], :scope > :is(.en, .la) > p[data-fr-hd]");
  }

  /* ── One heading ────────────────────────────────────────────────── */
  function split(el) {
    unmodernize(el);
    let labelled = false;
    let titled = false;
    let question = false;
    hostsOf(el).forEach((host) => {
      const text = textOf(host);
      const ends = /\?\s*$/.test(text);
      let m = HEAD.exec(text);
      let qn = false;
      if (!(m && m[2])) {
        const q = QNUM.exec(text);
        if (q && ends) { m = [q[0], q[1], q[2], q[3]]; qn = true; }
      }
      if (m && m[2]) {
        labelled = true;
        const lead = m[1].length;
        const labEnd = lead + m[2].length;
        const titleAt = m[0].length;
        const rest = clean(text.slice(titleAt));
        if (rest) {
          wrap(host, titleAt, text.length, "fr-hd-title");
          titled = true;
        }
        wrap(host, labEnd, titleAt, "fr-hd-sep");
        const eye = wrap(host, lead, labEnd, qn ? "fr-hd-eye fr-hd-qn" : "fr-hd-eye");
        if (eye && !qn) dotEyebrow(eye);
        const word = (clean(m[2]).match(LABEL_WORD) || [])[1] || "";
        if (ends && (qn || /^(?:q|question|quaestio)$/i.test(word))) question = true;
      } else if (clean(text)) {
        wrap(host, 0, text.length, "fr-hd-title");
        titled = true;
      }
    });
    el.classList.add("fr-hd");
    if (labelled && !titled) el.classList.add("fr-hd-labelonly");
    if (question) el.classList.add("fr-hd-q");
    // The same heading in two languages inside one h3: the second is a
    // quiet line under the first, without its label a second time.
    if (el.tagName === "H3" && hostsOf(el).length > 1) el.classList.add("fr-hd-bi");
    el.querySelectorAll(".fr-hd-title").forEach((t) => {
      recase(t);
      const len = clean(textOf(t)).length;
      const it = [...t.querySelectorAll("i, em")].reduce((s, e) => s + clean(e.textContent).length, 0);
      if (len && it / len > 0.85) t.classList.add("fr-hd-upright");
    });
  }

  /* A heading and what joins it: the next element takes a role (title,
     subtitle, argument, second label) and, under a card, continues the
     card in the same lane, so heading and line read as one box. */
  function relate(el, nx, kind) {
    const labelOnly = el.classList.contains("fr-hd-labelonly");
    let role = "";
    if (labelOnly && (kind === "sub" || kind === "sub-set" || kind === "head")) role = "promoted";
    else if (kind === "sub-set") role = "sub";
    else if (kind === "arg") role = "arg";
    else if (kind === "label" && !labelOnly) role = "sublabel";
    if (labelOnly && role !== "promoted") el.classList.add("fr-hd-bare");
    if (!role || nx.dataset.frHdNext) return null;
    unmodernize(nx);
    nx.dataset.frHdNext = "1";
    nx.classList.add(`fr-hd-${role}`);
    if (role === "sub") recase(nx);
    if (role === "promoted") {
      // The line is this heading's title: set as one, recased as one.
      nx.querySelectorAll(".fr-hd-title").forEach((t) => t.classList.add("fr-hd-title--as-promoted"));
      if (!nx.querySelector(".fr-hd-title")) recase(nx);
    }
    return nx;
  }

  function setTier(el, tier) {
    const was = el.dataset.frHdTier;
    if (was === tier) return;
    if (was) el.classList.remove(`fr-hd-${was}`);
    el.classList.add(`fr-hd-${tier}`);
    el.dataset.frHdTier = tier;
  }

  // A joined pair: open the heading's box at the bottom and continue it
  // on the line below, in the same lane. Across two rows the rows lose
  // the gap between them, and in the side-by-side view both lanes of each
  // row are stretched to one height so the Latin box and the English box
  // end on the same line.
  function join(el, nx) {
    el.classList.add("fr-hd-open");
    nx.classList.add("fr-hd-cont");
    const r1 = el.closest(".row");
    const r2 = nx.closest(".row");
    if (r1 && r2 && r1 !== r2) {
      r1.classList.add("fr-hd-joinrow");
      r2.classList.add("fr-hd-controw");
      [el, nx].forEach((u) => {
        const lane = laneOf(u);
        if (lane && lane.children.length === 1) lane.classList.add("fr-hd-lanefill");
      });
    }
  }

  /* ── The pass ───────────────────────────────────────────────────── */
  function pass() {
    const fresh = freshUnits();
    fresh.forEach((el) => {
      el.dataset.frHd = "1";
      if (!clean(textOf(el))) { el.dataset.frHdNx = "1"; return; }
      split(el);
    });
    // Anchor for the fold caret: the first heading in each lane of a
    // fold row (faith-port-reader-skin.css positions the caret on it).
    // Asked per row, not per heading: the folds stamp a row after the
    // heading in it may already have been split.
    document.querySelectorAll("#reading .row.fr-sec-head:not([data-fr-hd-anc])").forEach((row) => {
      const lanes = [...row.querySelectorAll(":scope > .en, :scope > .la")];
      let found = false;
      (lanes.length ? lanes : [row]).forEach((lane) => {
        const first = lane.querySelector("h3.csub[data-fr-hd], :scope > p[data-fr-hd]");
        if (first && first.classList.contains("fr-hd")) { first.classList.add("fr-hd-anchor"); found = true; }
      });
      if (found || row.querySelector("[data-fr-hd]")) row.dataset.frHdAnc = "1";
    });

    // Relations, for every heading still waiting on what follows it.
    const waiting = [...document.querySelectorAll("#reading .fr-hd[data-fr-hd]:not([data-fr-hd-nx])")];
    const plans = waiting.map((el) => {
      const nx = nextOf(el);
      return { el, nx, kind: nx && !nx.none ? kindOfNext(nx) : "" };
    });
    plans.forEach(({ el, nx, kind }) => {
      if (nx === null) return; // the page after it has not loaded
      el.dataset.frHdNx = "1";
      const joined = nx && !nx.none ? relate(el, nx, kind) : (el.classList.contains("fr-hd-labelonly") ? (el.classList.add("fr-hd-bare"), null) : null);
      if (joined) el.frHdJoined = joined;
    });

    // Tiers. Re-asked for headings whose row the folds had not stamped
    // yet: the outline arrives after the text starts to stream.
    document.querySelectorAll("#reading .fr-hd:is(:not([data-fr-hd-tier]), [data-fr-hd-prov])").forEach((el) => {
      // A heading promoted to another's title takes that heading's tier.
      if (el.dataset.frHdNext && el.dataset.frHdTier) { delete el.dataset.frHdProv; return; }
      const row = el.closest(".row");
      const tier = tierOf(el);
      setTier(el, tier);
      if (row && row.dataset.frSec == null && !el.closest("#app.liturgy")) el.dataset.frHdProv = "1";
      else delete el.dataset.frHdProv;
      const nx = el.frHdJoined;
      if (!nx) return;
      // The line under a heading is set by that heading's tier; under a
      // card it continues the card. A promoted plain heading gives up
      // its own tier (and with it its own box or rule).
      setTier(nx, `in-${tier}`);
      if (tier === "card") join(el, nx);
      // "First Part:" over "Of Man's Misery", both at one depth of the
      // outline: the label's own fold would close nothing (its section
      // ends where the title's begins), so the box keeps one caret, the
      // title's.
      const r1 = el.closest(".row.fr-sec-head");
      const r2 = nx.closest(".row.fr-sec-head");
      if (r1 && r2 && r1 !== r2 && Number(r1.dataset.frDepth || 0) >= Number(r2.dataset.frDepth || 9)) {
        r1.classList.add("fr-hd-onecaret");
      }
    });
  }

  /* WHEN. In the same task the rows arrive, before anything paints
     (Ian, 2026-09-24: "there's a jump on load when it loads the new
     header cards ... These should be default and just appear on load").
     This used to run 160ms after the text, so every heading painted
     plain and then grew into its box, pushing the page down. A mutation
     callback runs before the next paint, and the folds tell this file
     the moment they stamp a heading row (fr-folds-stamped), so the rows
     they find are set in that same frame. The pass reads no layout, so
     running it often costs DOM work only; the records its own writes
     cause are dropped, not fed back into another pass. */
  let observer = null;
  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    try { pass(); } finally {
      running = false;
      if (observer) observer.takeRecords();
    }
  };
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    const go = () => { if (!queued) return; queued = false; run(); };
    try { window.requestAnimationFrame(go); } catch (_) { /* no frames */ }
    window.setTimeout(go, 160);
  };
  if (window.MutationObserver) {
    observer = new MutationObserver(run);
    observer.observe(scroll, { childList: true, subtree: true });
  }
  document.addEventListener("fr-folds-stamped", run);
  document.addEventListener("fr-folds-change", schedule);
  run();
}());
