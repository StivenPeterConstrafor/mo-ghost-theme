/*
 * Section headings in the text, set the way the rest of TFR sets a head
 * (Ian, 2026-09-24: "something more in line with the design style we've
 * done across the rest of TFR like on the Topics page"):
 *
 *   BOOK I · CHAPTER I                 small caps, terracotta, spaced
 *   On the word or name of Theology    the title, large, in the text face
 *   How those things are to be ...     a subtitle under it, italic
 *
 * A heading is either a printed heading element (h3.csub) or a heading
 * row the section folds found (.row.fr-sec-headrow, faith-reader-folds.js).
 * Its opening division label ("Book I - Chapter I -", "CHAP. III.",
 * "ARTICLE II.") becomes the eyebrow and the rest the title. The row after
 * a heading, when it is short, is its subtitle; when it is a printed
 * argument (italic, or opening with the asterisk EEBO prints) it is set
 * as one. A heading that is only a label ("CHAPTER II.") followed by a
 * short line takes that line as its title.
 *
 * Nothing in the words changes. The split wraps the heading's own text
 * in spans and the separator between label and title is hidden, not
 * removed, so textContent reads exactly as before: the engine finds a
 * heading to jump to by its text, and search and passage links match on
 * it. Reads first, writes after, so a page of headings costs one layout.
 */
(function () {
  "use strict";

  const scroll = document.getElementById("scroll");
  if (!scroll) return;

  const NUM = "(?:[ivxlcdm]+|\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|primus|prima|primum|secundus|secunda|secundum|tertius|tertia|tertium|quartus|quarta|quintus|quinta|sextus|sexta|septimus|octavus|nonus|decimus)";
  const WORD = "(?:chap(?:ter)?|cap(?:ut|itulum)?|book|booke|lib(?:er)?|part|pars|sect(?:ion|io)?|§|article|art|quaestio|question|q|sermon|homil(?:y|ia)|psalm|epist(?:le|ola)|letter|tract(?:ate|atus)?|distinctio|dist|lectio|lecture|disputatio|disputation|oratio|oration|canon|dialogue|dialogus|discourse|treatise|lord'?s day|day)";
  const GROUP = `${WORD}\\.?\\s*${NUM}\\b\\.?`;
  // One or more groups at the very start, then the separator before the
  // title. "Book I - Chapter I - On the word", "CHAP. III.", "ARTICLE II.
  // By What Means", "CHAPTER V.-- On the general custom".
  const HEAD = new RegExp(`^([\\s§*]*)(${GROUP}(?:\\s*[-–—,:;.]?\\s*${GROUP})*)(\\s*[-–—.:,;]*\\s*)`, "i");
  const GROUP_SEP = new RegExp(`(${GROUP})(\\s*[-–—,:;.]?\\s*)(?=${GROUP})`, "gi");

  const clean = (t) => String(t || "").replace(/\s+/g, " ").trim();

  // Put the Modernizer's original words back before a split, so no new
  // text node is born holding modernized text it would then take for the
  // original (faith-port-read-modernize.js keeps the original on the
  // node). Its observer modernizes the new nodes again.
  function unmodernize(el) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.frRaw != null) {
        if (n.nodeValue !== n.frRaw) n.nodeValue = n.frRaw;
        n.frRaw = null;
      }
    }
  }

  function pointAt(el, pos) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let seen = 0;
    let last = null;
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const len = n.data.length;
      if (pos <= seen + len) return [n, pos - seen];
      seen += len;
      last = n;
    }
    return last ? [last, last.data.length] : null;
  }

  // Wrap characters [a, b) of el in a span of class cls.
  function wrap(el, a, b, cls) {
    if (b <= a) return null;
    const s = pointAt(el, a);
    const e = pointAt(el, b);
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

  // Inside the eyebrow, the gaps between groups ("Book I - Chapter I")
  // print as a centred dot. The characters stay; CSS draws the dot.
  function dotEyebrow(eye) {
    if (eye.childNodes.length !== 1 || eye.firstChild.nodeType !== 3) return;
    const text = eye.firstChild.data;
    const parts = [];
    let last = 0;
    GROUP_SEP.lastIndex = 0;
    let m;
    while ((m = GROUP_SEP.exec(text))) {
      const at = m.index + m[1].length;
      parts.push(text.slice(last, at), [m[2]]);
      last = at + m[2].length;
    }
    if (!parts.length) return;
    parts.push(text.slice(last));
    eye.textContent = "";
    parts.forEach((p) => {
      if (Array.isArray(p)) {
        const dot = document.createElement("span");
        dot.className = "fr-hd-dot";
        dot.textContent = p[0] || " ";
        eye.appendChild(dot);
      } else if (p) eye.appendChild(document.createTextNode(p));
    });
  }

  // The elements that carry a heading's words: the h3 itself, or the
  // first paragraph of each language lane of a heading row.
  function targets(root) {
    const out = [];
    // New headings, and headings still waiting for the page that holds
    // what follows them (a heading can be the last row of its page).
    root.querySelectorAll("#reading h3.csub:not([data-fr-hd-nx])").forEach((h) => out.push({ el: h, host: h }));
    root.querySelectorAll("#reading .row.fr-sec-headrow").forEach((row) => {
      row.querySelectorAll(":scope > .en, :scope > .la").forEach((lane) => {
        const p = lane.querySelector("p");
        if (p && !p.dataset.frHdNx) out.push({ el: p, host: row });
      });
    });
    return out;
  }

  // What follows a heading: the next paragraph in the same lane (a
  // heading printed in the flow of the text), else the next row.
  // The row after `row`, across a page boundary: a heading can close
  // its page with its argument opening the next. A page not loaded yet
  // (a placeholder) answers "not yet", and the heading is tried again.
  function rowAfter(row) {
    let nr = row.nextElementSibling;
    while (nr && nr.matches("button, .fr-sec-toggle")) nr = nr.nextElementSibling;
    if (nr) return nr;
    const folio = row.parentElement;
    // Past the page marker (.fmark, "§ 26 · p. 26") between two pages.
    let nf = folio && folio.nextElementSibling;
    while (nf && !nf.matches(".folio, .fph")) nf = nf.nextElementSibling;
    if (!nf || nf.matches(".fph")) return null;
    return nf.querySelector(":scope > .row, :scope > .stkwrap");
  }
  function nextOf(t) {
    if (t.host === t.el) {
      const sib = t.el.nextElementSibling;
      if (sib && sib.tagName === "P") return { el: sib, row: null };
      const row = t.el.closest(".row");
      if (row && row.querySelector(".csub") === t.el && !sib) {
        const nr = rowAfter(row);
        return nr ? { el: null, row: nr } : null;
      }
      return { el: null, row: null, none: true };
    }
    const nr = rowAfter(t.host);
    return nr ? { el: null, row: nr } : null;
  }

  function kindOfNext(n) {
    if (!n || n.none) return "";
    if (n.row && (n.row.classList.contains("fr-sec-headrow") || n.row.querySelector(".csub"))) return "";
    // The first paragraph of each lane, not the lane: an argument and
    // the chapter's opening paragraphs can share one lane (Owen).
    let lanes = n.el ? [n.el] : [...n.row.querySelectorAll(":scope > .en, :scope > .la")];
    if (!lanes.length) lanes = [n.row];
    lanes = lanes.map((l) => (l.tagName === "P" ? l : (l.querySelector("p") || l)));
    n.units = lanes;
    const texts = lanes.map((l) => clean(l.textContent)).filter(Boolean);
    if (!texts.length) return "";
    const len = Math.max(...texts.map((t) => t.length));
    const lane = lanes.find((l) => clean(l.textContent));
    const ital = (() => {
      const t = clean(lane.textContent).length;
      const it = [...lane.querySelectorAll("i, em")].reduce((s, e) => s + clean(e.textContent).length, 0);
      return t ? it / t : 0;
    })();
    if (len < 200) {
      const m = HEAD.exec(texts[0]);
      if (m && clean(texts[0].slice(m[0].length)) === "") return "label";
      // Set apart by the page itself (italic, or capitals) it is a
      // subtitle under any heading. Plain, it may just be a short first
      // paragraph ("COnscience is either good or badde."), so it is a
      // subtitle only under a heading that is nothing but its label.
      const letters = texts[0].replace(/[^A-Za-z]/g, "");
      const caps = letters.length ? letters.replace(/[^A-Z]/g, "").length / letters.length : 0;
      return ital > 0.7 || caps > 0.8 ? "sub-set" : "sub";
    }
    if (len < 1200 && (/^\s*[*†]/.test(texts[0]) || ital > 0.7)) return "arg";
    return "";
  }

  function pass() {
    const list = targets(document);
    if (!list.length) return;
    // Reads.
    const plans = list.map((t) => {
      const text = t.el.textContent || "";
      const m = HEAD.exec(text);
      const nx = nextOf(t);
      return {
        t,
        m,
        textLen: text.length,
        rest: m ? clean(text.slice(m[0].length)) : clean(text),
        nx,
        nk: kindOfNext(nx),
      };
    });
    // Writes.
    plans.forEach(({ t, m, textLen, rest, nx, nk }) => {
      const { el } = t;
      const fresh = !el.dataset.frHd;
      el.dataset.frHd = "1";
      el.classList.add("fr-hd");
      if (nx) el.dataset.frHdNx = "1";
      if (m && m[2]) {
        const lead = m[1].length;
        const labEnd = lead + m[2].length;
        const titleAt = m[0].length;
        if (rest && fresh) {
          unmodernize(el);
          wrap(el, titleAt, textLen, "fr-hd-title");
          wrap(el, labEnd, titleAt, "fr-hd-sep");
          const eye = wrap(el, lead, labEnd, "fr-hd-eye");
          if (eye) dotEyebrow(eye);
        } else if (!rest && !el.classList.contains("fr-hd-labelonly")) {
          // A label and nothing else. With a short line under it, the
          // label is the eyebrow and that line the title; alone (or
          // until the page after it arrives), it is the title.
          if (nk === "sub" || nk === "sub-set") {
            unmodernize(el);
            el.classList.remove("fr-hd-bare");
            el.classList.add("fr-hd-labelonly");
            const eye = wrap(el, lead, labEnd, "fr-hd-eye");
            if (eye) dotEyebrow(eye);
          } else el.classList.add("fr-hd-bare");
        }
      }
      if (!nx || !nk) return;
      const units = nx.units || [nx.el || nx.row];
      let cls = "";
      if (el.classList.contains("fr-hd-labelonly") && (nk === "sub" || nk === "sub-set")) cls = "fr-hd-promoted";
      else if (nk === "sub-set") cls = "fr-hd-sub";
      else if (nk === "arg") cls = "fr-hd-arg";
      else if (nk === "label") cls = "fr-hd-sublabel";
      if (!cls) return;
      units.forEach((u) => { if (u && !u.dataset.frHdNext) { u.dataset.frHdNext = "1"; u.classList.add(cls); } });
    });
  }

  let queued = 0;
  const schedule = () => {
    if (queued) return;
    queued = window.setTimeout(() => { queued = 0; pass(); }, 160);
  };
  if (window.MutationObserver) new MutationObserver(schedule).observe(scroll, { childList: true, subtree: true });
  document.addEventListener("fr-folds-change", schedule);
  schedule();
}());
