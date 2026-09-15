/* The English Modernizer, for the ported reader.
 *
 * The rewriting itself is faith-modernize.js, the same engine the Dynamic
 * Reader uses, so a word modernized here is modernized the same way it is
 * everywhere else on the site. What is different is the scope: this
 * reader lays English and Latin side by side in one row and replaces the
 * whole #reading element on every page turn, so neither the Dynamic
 * Reader's zone selectors nor its "apply once" lifecycle carries over.
 *
 * Two rules matter more than the rest:
 *
 *  - NEVER the source lane. Running Latin or Greek through an English
 *    speller turns "causa" into a word nobody wrote. Only .en is touched,
 *    and the furniture inside it is skipped.
 *  - The original lives on the text node, not in a parent's innerHTML.
 *    Rewriting from the stored original rather than from what is on
 *    screen means a second pass cannot compound the first, and nothing
 *    downstream loses its listeners.
 */
(function () {
  "use strict";

  const btn = document.getElementById("m-modern");
  if (!btn) return;

  // Never held across a render: the engine replaces #reading itself.
  const readingNow = () => document.getElementById("reading");

  // The source lane and the apparatus around the text. .la is the
  // original language; the rest is our own and the engine's furniture —
  // page anchors, critical apparatus, marginal notes, footnote banks.
  const SKIP = ".la,.pganchor,.rapp,.appdiv,.mnote,.rowx,.footnotes,.appbank," +
    ".rv-edit,.furn,.ixchip,.vol,.qa,.cgptl-float";

  // The scanned-page spellings that tell you a text is early modern
  // before any dictionary is consulted: u for v, i for j.
  const EARLY_MODERN =
    /\b(vpon|vnto|vs|vse|vnder|haue|giue|loue|euery|neuer|ouer|euen|seruice|deuil|iudge|iust|maiestie|obiect|subiect|reioyce|adioyn)\b/i;

  let on = false;
  let lexiconPromise = null;

  /* Where the toggle lives depends on how much room the toolbar has.
   *
   * Adding a fourth control to the top bar pushed Tools and Aa clean off
   * the right edge of a 375px screen — the .ctr row measured 490px wide
   * in a 375px viewport. On a narrow screen the toggle moves into the
   * Tools popover instead, which is a list and cannot overflow. The
   * BUTTON moves, not a copy of it, so there is one element and one
   * handler and the two placements can never disagree about state.
   */
  const NARROW = 700;
  const pop = document.getElementById("rdToolsPop");
  const bar = btn.parentElement;
  const next = btn.nextElementSibling;

  function place() {
    const narrow = window.innerWidth <= NARROW;
    if (narrow && pop && btn.parentElement !== pop) {
      btn.classList.add("rdt");
      // Above the status line, which must stay last.
      const say = document.getElementById("rdToolsSay");
      pop.insertBefore(btn, say || null);
    } else if (!narrow && btn.parentElement === pop) {
      btn.classList.remove("rdt");
      bar.insertBefore(btn, next || null);
    }
  }
  place();
  let placing = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(placing);
    placing = window.setTimeout(place, 150);
  });

  function loadLexicon() {
    if (lexiconPromise) return lexiconPromise;
    const path = "/assets/data/faith-received/modern-words.txt";
    const url = window.moAssetUrl ? window.moAssetUrl(path) : path;
    lexiconPromise = fetch(url)
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => {
        if (!text || !window.FaithModernize) return false;
        // Common words above the rule, everything else below it. Only
        // the common half may be produced by a rewrite; the whole of it
        // decides whether a word was already modern.
        const parts = text.split("\n---\n");
        const common = parts[0].split("\n").filter(Boolean);
        const rest = (parts[1] || "").split("\n").filter(Boolean);
        window.FaithModernize.setLexicon(
          new Set(common), new Set(common.concat(rest))
        );
        return true;
      })
      // Without it the grammar still modernizes and the macrons still
      // expand; only the spelling stays as printed.
      .catch(() => false);
    return lexiconPromise;
  }

  function lanes() {
    const r = readingNow();
    return r ? Array.prototype.slice.call(r.querySelectorAll(".en")) : [];
  }

  function eachText(zone, fn) {
    const walker = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentNode;
        if (p && p.closest && p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) fn(node);
  }

  function apply() {
    if (!window.FaithModernize) return;
    lanes().forEach((zone) => {
      eachText(zone, (node) => {
        if (node.frRaw == null) node.frRaw = node.nodeValue;
        const next = window.FaithModernize.modernizeSpelling(
          window.FaithModernize.modernizeText(node.frRaw)
        );
        if (next !== node.nodeValue) node.nodeValue = next;
      });
    });
  }

  function restore() {
    lanes().forEach((zone) => {
      eachText(zone, (node) => {
        if (node.frRaw != null && node.nodeValue !== node.frRaw) {
          node.nodeValue = node.frRaw;
        }
      });
    });
  }

  // Ask the text that is actually there. A work whose first archaic word
  // is three pages in should still offer the toggle once you reach it,
  // which is why this is re-asked on every render rather than decided
  // once at the door.
  function archaic() {
    const r = readingNow();
    if (!r || !window.FaithModernize) return false;
    let text = "";
    const ls = lanes();
    for (let i = 0; i < ls.length && text.length < 4000; i += 1) {
      text += ` ${ls[i].textContent || ""}`;
    }
    if (!text.trim()) return false;
    return window.FaithModernize.hasArchaicLanguage(text) || EARLY_MODERN.test(text);
  }

  function draw() {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "Modernized" : "Modernize";
  }

  btn.addEventListener("click", () => {
    on = !on;
    draw();
    if (!on) { restore(); return; }
    // The first press waits on the dictionary. Rewriting first and again
    // on arrival would modernize the grammar, then visibly re-set the
    // spelling a moment later.
    btn.setAttribute("aria-busy", "true");
    loadLexicon().then(() => {
      btn.removeAttribute("aria-busy");
      if (on) apply();
    });
  });

  // Every page turn builds new text. Offer the toggle if this page wants
  // it, and re-apply if the reader already asked for it — otherwise
  // turning the page silently un-modernizes the work.
  let settling = null;
  function onRender() {
    window.clearTimeout(settling);
    settling = window.setTimeout(() => {
      const wanted = archaic();
      btn.hidden = !wanted && !on;
      place();
      if (on && wanted) apply();
    }, 120);
  }

  onRender();
  // Observed from a stable ancestor, because #reading is replaced rather
  // than refilled and an observer bound to it would stop firing.
  const scroll = document.getElementById("scroll") || document.body;
  if (window.MutationObserver) {
    new MutationObserver(onRender).observe(scroll, { childList: true, subtree: true });
  }
})();
