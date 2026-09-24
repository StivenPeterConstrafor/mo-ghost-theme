/*
 * Split paragraphs: long paragraphs broken at sentence ends, on request.
 *
 * Ian, 2026-09-24: "at one point we had a paragraph rule in the reader to
 * break up long paragraph blocks. Can we add this as a tool next to the
 * modernizer? Turned off by default but able to turn on?"
 *
 * Off by default. On, every paragraph in the text longer than about 700
 * characters is divided into paragraphs of about 450 at sentence ends:
 * after . ? or ! (and any closing quote or bracket), before a capital,
 * never after a short siglum or a common abbreviation ("S.", "cap.",
 * "Matth."), the same rule reader-core.js's segLong uses for the render
 * paths that already split. Display only: the words are not changed.
 *
 * The split is made on the page's own nodes with a Range, so italics,
 * footnote markers, highlights and the Modernizer's spans come across
 * intact, and the first paragraph keeps the space at the cut, so the
 * text reads the same to search and to passage links. Switching it off
 * joins the pieces back into the paragraph they came from. New text
 * (page turns, pages loading as the reader scrolls) is split as it
 * arrives while the tool is on. Remembered per browser.
 *
 * The button is built here and joins the Tools drawer beside Modernize
 * (faith-port-read-drawer.js moves it); the phone's drawer has a cell
 * that presses it. Loaded before the drawer script.
 */
(function () {
  "use strict";

  const reading = () => document.getElementById("reading");
  const scroll = document.getElementById("scroll");
  const ph = document.querySelector("#app .ph.fr-reader-head");
  const ctr = ph && ph.querySelector(".ctr");
  if (!scroll || !ctr) return;

  const KEY = "fr_para_split";
  const MIN = 700; // split only paragraphs longer than this
  const TARGET = 450; // aim for pieces about this long
  const TAIL = 200; // never leave a last piece shorter than this
  const ABBR = /^(?:cap|art|lib|tom|vol|vid|seq|seqq|ibid|etc|viz|fol|pag|num|col|cent|quaest|disp|sect|conf|resp|obs|not|cit|loc|matth|marc|luc|ioh|joh|act|rom|cor|gal|eph|phil|coloss|thess|tim|tit|philem|hebr|heb|iac|jac|petr|iud|jud|apoc|gen|exod|lev|num|deut|jos|judg|ruth|sam|reg|chron|esd|neh|esth|job|psal|ps|prov|eccl|cant|sap|eccli|isa|jer|lam|bar|ezek|dan|hos|joel|amos|obad|jon|mic|nah|hab|zeph|hag|zech|mal|mr|mrs|dr|st|ch|chap|p|pp|v|vv|ver|vers|cf|ed|eds|trans|fr|lat|gr|heb|n|no|nos)$/i;

  let on = false;
  try { on = window.localStorage.getItem(KEY) === "1"; } catch (e) { on = false; }
  let seq = 0;

  function cuts(text) {
    const out = [];
    const re = /[.?!]["'”’)\]]*\s+/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      const at = m.index + m[0].length;
      const next = text[at];
      if (!next || !/[A-ZÀ-Þ“‘"'(\[0-9]/.test(next)) continue;
      if (text[m.index] === ".") {
        const word = /([A-Za-zÀ-ÖØ-öø-ÿ]+)$/.exec(text.slice(Math.max(0, m.index - 14), m.index));
        if (word && (word[1].length <= 2 || ABBR.test(word[1]))) continue;
      }
      if (at - last >= TARGET && text.length - at >= TAIL) {
        out.push(at);
        last = at;
      }
    }
    return out;
  }

  // The text node and offset at a character position in `el`.
  function pointAt(el, pos) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let seen = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const len = n.data.length;
      if (pos <= seen + len) return [n, pos - seen];
      seen += len;
    }
    return null;
  }

  function splitOne(p) {
    if (p.dataset.frSplit || p.dataset.frSplitOf) return;
    const text = p.textContent || "";
    if (text.length <= MIN) return;
    const at = cuts(text);
    if (!at.length) return;
    seq += 1;
    const key = String(seq);
    p.dataset.frSplit = key;
    // From the last cut back, so earlier offsets stay valid.
    for (let i = at.length - 1; i >= 0; i -= 1) {
      const pt = pointAt(p, at[i]);
      if (!pt) continue;
      const r = document.createRange();
      r.setStart(pt[0], pt[1]);
      r.setEnd(p, p.childNodes.length);
      const frag = r.extractContents();
      const part = p.cloneNode(false);
      part.removeAttribute("id");
      part.removeAttribute("data-fr-split");
      part.dataset.frSplitOf = key;
      part.classList.add("fr-para-part");
      part.appendChild(frag);
      p.after(part);
    }
  }

  function joinAll(root) {
    (root || document).querySelectorAll("[data-fr-split]").forEach((p) => {
      const key = p.dataset.frSplit;
      let next = p.nextElementSibling;
      while (next && next.dataset && next.dataset.frSplitOf === key) {
        const after = next.nextElementSibling;
        while (next.firstChild) p.appendChild(next.firstChild);
        next.remove();
        next = after;
      }
      delete p.dataset.frSplit;
      p.normalize();
    });
  }

  let watching = null;
  let queued = 0;
  function splitAll() {
    const r = reading();
    if (!r) return;
    if (watching) watching.disconnect();
    r.querySelectorAll("p").forEach((p) => {
      if (p.closest(".fr-tt, .fr-fold-toggle, sup, button")) return;
      splitOne(p);
    });
    if (watching) watching.observe(scroll, { childList: true, subtree: true });
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fr-tb-paras";
  btn.textContent = "Split paragraphs";
  btn.title = "Break long paragraphs into shorter ones at sentence ends";
  ctr.appendChild(btn);

  function apply() {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) {
      splitAll();
      if (!watching && window.MutationObserver) {
        watching = new MutationObserver(() => {
          if (queued) return;
          queued = window.setTimeout(() => { queued = 0; if (on) splitAll(); }, 150);
        });
        watching.observe(scroll, { childList: true, subtree: true });
      }
    } else {
      if (watching) { watching.disconnect(); watching = null; }
      joinAll(reading());
    }
    document.dispatchEvent(new CustomEvent("fr-paras-change"));
  }

  btn.addEventListener("click", () => {
    on = !on;
    try { window.localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* not remembered */ }
    apply();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
  // The text arrives after this runs; a first pass once it has.
  if (on) window.setTimeout(apply, 1500);
}());
