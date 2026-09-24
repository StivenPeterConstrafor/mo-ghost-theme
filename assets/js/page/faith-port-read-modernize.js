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
  // The Modernizer is a tool now on every width (Ian, 2026-09-23: "The
  // english Modernizer also needs to be in the toolbar"): the bar's Tools
  // drawer on a desktop, a cell in the dock's on a phone
  // (faith-port-read-drawer.js). It no longer moves into the Aa panel.
  const NARROW = 0;
  const bar = btn.parentElement;
  const next = btn.nextElementSibling;

  /* IT USED TO MOVE INTO THE TOOLS POPOVER, WHICH HAS NO OPENER ON A
   * PHONE. Ian, 2026-09-21: "I don't see the english modernizer on
   * mobile." He could not: #rdTools, the button that opens
   * #rdToolsPop, is display:none at 390px, so the toggle was moved out
   * of an overflowing toolbar and into a drawer nothing can open. The
   * control existed, answered to its handler, and was unreachable.
   *
   * This is the second time. The reader's Report button went the same
   * route, toolbar to Tools to unreachable, and ended up in the Aa
   * panel, which is the ONE popover whose opener survives at this
   * width: #aaBtn is the only visible control in the top bar on a
   * phone. The Modernizer belongs there for the same reason.
   *
   * It goes in as an .aarow, the panel's own label-plus-control unit,
   * rather than dropped in loose: every other reading setting in that
   * panel is a labelled row and one bare button among them reads as a
   * mistake. "Spelling" is what it does to the text, and "English" and
   * "Latin" are already taken by the lane sizes two rows above. */
  const aaPop = document.getElementById("aaPop");
  let row = null;
  function aaRow() {
    if (row) return row;
    row = document.createElement("div");
    row.className = "aarow";
    const label = document.createElement("span");
    label.textContent = "Spelling";
    row.appendChild(label);
    return row;
  }

  function place() {
    const narrow = window.innerWidth <= NARROW;
    if (narrow && aaPop && btn.parentElement !== row) {
      btn.classList.remove("rdt");
      const r = aaRow();
      r.appendChild(btn);
      // Before the Problem row, which is a report rather than a reading
      // setting and reads best as the last thing in the panel. Found by
      // its Report button rather than by position, so adding a row after
      // it later does not silently put Spelling in the wrong place.
      if (r.parentElement !== aaPop) {
        const report = aaPop.querySelector(".aarow:last-child");
        aaPop.insertBefore(r, report || null);
      }
    } else if (!narrow && btn.parentElement === row) {
      btn.classList.remove("rdt");
      if (row.parentElement) row.parentElement.removeChild(row);
      bar.insertBefore(btn, next || null);
    }
  }
  place();
  let placing = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(placing);
    placing = window.setTimeout(place, 150);
  });

  // The lexicon and the spelling map, fetched once by the engine itself
  // (FaithModernize.loadData), cache-busted through moAssetUrl.
  function loadLexicon() {
    if (lexiconPromise) return lexiconPromise;
    lexiconPromise = window.FaithModernize && window.FaithModernize.loadData
      ? window.FaithModernize.loadData().catch(() => false)
      : Promise.resolve(false);
    return lexiconPromise;
  }

  /* HEADINGS ARE ENGLISH TOO, AND THEY ARE NOT IN THE ENGLISH LANE.
   *
   * Ian, of the Westminster Shorter Catechism: the Modernizer works "on
   * the questions/headers" -- meaning it did not. Measured on the live
   * reader: that work renders 216 .en lanes and 210 .csub headings, and
   * ZERO of the headings sit inside a lane. Every catechism question is
   * a heading, so the answers modernized and the questions did not, which
   * on a catechism is most of the text a reader looks at. Charnock has
   * the same shape with 28 section titles.
   *
   * Widening the net without breaking the rule above it: a heading is
   * taken only when it is outside the source lane, and only when the
   * language it declares is English. Checked before writing this: the
   * Migne works carry none of these heading classes at all, so no Latin
   * can be reached this way, and the lang test is the belt to that
   * brace. A heading already inside .en is left to the lane, so nothing
   * is walked twice. */
  const HEADS = ".csub, .rhead, #reading h1, #reading h2, #reading h3, #reading h4";

  function englishHeading(el) {
    if (el.closest(".la") || el.closest(".en")) return false;
    const declared = el.closest("[lang]");
    const lang = declared ? String(declared.getAttribute("lang") || "").toLowerCase() : "";
    return !lang || lang === "en" || lang.indexOf("en-") === 0;
  }

  function lanes() {
    const r = readingNow();
    if (!r) return [];
    const zones = Array.prototype.slice.call(r.querySelectorAll(".en"));
    Array.prototype.slice.call(r.querySelectorAll(HEADS)).forEach((h) => {
      if (englishHeading(h)) zones.push(h);
    });
    return zones;
  }

  /* A block at a time, not a text node at a time (2026-09-24). Owen
   * prints "Ye; if <i>Ye Mortify.</i>" and an early compositor's
   * superscript "the" arrives as "y<i>e</i>": node by node the engine
   * could see neither the "if" beside "Ye" nor that "y" and "e" are one
   * word. modernizeElement groups the nodes by their block, keeps each
   * node's original on node.frRaw, and skips the furniture in SKIP. */
  function apply() {
    if (!window.FaithModernize) return;
    lanes().forEach((zone) => window.FaithModernize.modernizeElement(zone, SKIP));
  }

  function restore() {
    if (!window.FaithModernize) return;
    lanes().forEach((zone) => window.FaithModernize.restoreElement(zone));
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
      /* THE ROW GOES WITH THE BUTTON. In the Aa panel the toggle is
         wrapped in a labelled row, and `hidden` on the button leaves the
         word "Spelling" sitting in the panel with nothing beside it,
         which reads as a control that failed to load rather than one
         this page has no use for. Only applies on the narrow placement;
         on the toolbar the button has no wrapper. */
      if (row && btn.parentElement === row) row.hidden = btn.hidden;
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
