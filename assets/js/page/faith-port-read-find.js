/* Find in this work.
 *
 * The port shipped the STYLING for this and nothing else: fr-reading-system.css
 * carries #findbar, its grid of an input and three buttons, .findmeta, and
 * mark.findhit / mark.findhit.cur — but no markup and no implementation
 * anywhere in the theme, and reader-core's Search button calls a
 * window.__frOpenSearch that is defined nowhere. So the reader has had a
 * find bar's clothes and no find.
 *
 * This is the implementation, written to his selectors so it wears them.
 *
 * Scope: the text that is loaded. The reader holds one page, or one flow
 * of pages, at a time, and searching what is on screen is what a find bar
 * means. Searching all 428 pages of a work is the Ask panel's job and it
 * says so in the meta line.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  // Never held across a render: the engine replaces #reading itself.
  const readingNow = () => $("reading");

  // The source lane is searchable — a reader looking for a Latin phrase is
  // exactly who needs this — but the furniture around the text is not.
  const SKIP = ".pganchor,.rapp,.appdiv,.mnote,.rowx,.footnotes,.appbank," +
    ".rv-edit,.furn,.ixchip,.vol,.qa,.cgptl-float,#findbar,.fr-para-rail";

  let bar = null, input = null, meta = null, count = null, scope = null;
  let hits = [], at = -1, term = "";
  const scroller = $("scroll");
  /* Marking and unmarking are themselves DOM changes inside #scroll, and
     the page-turn observer at the foot of this file cannot tell them from
     a real page turn: it re-ran the search, which reset the cursor to the
     first hit. Next advanced and then, 200ms later, jumped back.

     A boolean guard does NOT fix this, which is what I tried first.
     MutationObserver delivers its callback as a microtask AFTER the
     current task finishes, so by the time the guard is read it has
     already been set back to false. The observer has to be genuinely
     detached while we mutate, and its queue emptied before it is
     reattached, or the records it banked during the edit are delivered
     the moment it comes back. */
  let observer = null;
  function quietly(fn) {
    if (observer) observer.disconnect();
    try { fn(); }
    finally {
      if (observer && scroller) {
        observer.takeRecords();
        observer.observe(scroller, { childList: true, subtree: true });
      }
    }
  }

  function build() {
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "findbar";
    bar.hidden = true;
    bar.setAttribute("role", "search");
    bar.innerHTML =
      '<input type="search" id="findq" autocomplete="off" spellcheck="false"' +
      ' placeholder="Find in this work" aria-label="Find in this work">' +
      '<button type="button" id="findPrev" title="Previous match (Shift+Enter)" aria-label="Previous match">‹</button>' +
      '<button type="button" id="findNext" title="Next match (Enter)" aria-label="Next match">›</button>' +
      '<button type="button" id="findX" title="Close find (Esc)" aria-label="Close find">×</button>' +
      '<div class="findmeta"><span id="findCount"></span><span id="findScope"></span></div>';

    // Into .main, ahead of #reading, so it sticks to the top of the
    // reading column and survives the engine replacing the column itself.
    const main = document.querySelector(".main") || $("scroll");
    const reading = readingNow();
    if (main && reading && reading.parentElement === main) main.insertBefore(bar, reading);
    else if (main) main.insertBefore(bar, main.firstChild);
    else return null;

    input = $("findq"); meta = bar.querySelector(".findmeta");
    count = $("findCount"); scope = $("findScope");

    let typing = null;
    input.addEventListener("input", () => {
      window.clearTimeout(typing);
      typing = window.setTimeout(() => run(input.value), 160);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
    });
    $("findNext").addEventListener("click", () => step(1));
    $("findPrev").addEventListener("click", () => step(-1));
    $("findX").addEventListener("click", close);
    return bar;
  }

  /* ---- Marking ------------------------------------------------------ */

  // Undo by replacing each mark with its own text, then normalising the
  // parent so the split text nodes fuse back into one. Without the
  // normalise, searching repeatedly leaves a paragraph in hundreds of
  // fragments and every later search gets slower than the last.
  function clear() {
    const reading = readingNow();
    if (!reading) { hits = []; at = -1; return; }
    const marks = reading.querySelectorAll("mark.findhit");
    const parents = new Set();
    marks.forEach((m) => {
      const p = m.parentNode;
      if (!p) return;
      parents.add(p);
      p.replaceChild(document.createTextNode(m.textContent), m);
    });
    parents.forEach((p) => p.normalize());
    hits = []; at = -1;
  }

  function textNodes(root) {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentNode;
        if (!p || !p.closest) return NodeFilter.FILTER_REJECT;
        if (p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  /* `keep` preserves the reader's place across a re-run.
   *
   * Stepping to a match scrolls it into view, and scrolling makes the
   * reader hydrate more of the work — a real DOM change, which the
   * observer below is right to notice. But re-running the search from
   * scratch reset the cursor to match 1, so every press of Next landed
   * on the next match and was thrown back a moment later. The observer
   * was not misfiring; it was discarding the answer. */
  function run(q, keep) {
    const was = at;
    term = String(q || "");
    const reading = readingNow();
    const needle = term.toLowerCase();
    quietly(() => {
      clear();
      if (!reading || term.trim().length < 2) return;

      // Collected first, then marked. Marking while walking mutates the
      // tree the walker is standing in.
      textNodes(reading).forEach((node) => {
        const hay = node.nodeValue.toLowerCase();
        if (hay.indexOf(needle) === -1) return;
        let rest = node, from = 0, idx;
        while ((idx = rest.nodeValue.toLowerCase().indexOf(needle, from)) !== -1) {
          const after = rest.splitText(idx);
          rest = after.splitText(needle.length);
          const mark = document.createElement("mark");
          mark.className = "findhit";
          mark.appendChild(document.createTextNode(after.nodeValue));
          after.parentNode.replaceChild(mark, after);
          hits.push(mark);
          from = 0;
        }
      });
    });
    if (!hits.length) at = -1;
    else if (keep && was >= 0) at = Math.min(was, hits.length - 1);
    else at = 0;
    if (at >= 0) show();
    draw();
  }

  function show() {
    hits.forEach((m) => m.classList.remove("cur"));
    const m = hits[at];
    if (!m) return;
    m.classList.add("cur");
    m.scrollIntoView({ block: "center", behavior: "auto" });
  }

  function step(by) {
    if (!hits.length) return;
    at = (at + by + hits.length) % hits.length;
    show(); draw();
  }

  function draw() {
    if (!count) return;
    count.textContent = !term.trim() ? ""
      : hits.length ? (at + 1) + " of " + hits.length
      : "No matches on this page";
    scope.textContent = hits.length || !term.trim()
      ? "Searching the text in view"
      : "Ask searches the whole work";
    const none = !hits.length;
    $("findNext").disabled = none;
    $("findPrev").disabled = none;
  }

  /* ---- Open and close ----------------------------------------------- */

  function open(seed) {
    if (!build()) return;
    bar.hidden = false;
    bar.classList.add("on");
    if (seed) input.value = seed;
    // Focused on a timer, not rAF: a hidden page can stop servicing rAF,
    // and the bar has only this instant been un-hidden.
    const reach = (n) => {
      input.focus();
      if (document.activeElement === input) { input.select(); return; }
      if (n > 0) window.setTimeout(() => reach(n - 1), 80);
    };
    reach(0);
    window.setTimeout(() => reach(6), 0);
    if (input.value) run(input.value);
  }

  function close() {
    if (!bar) return;
    quietly(clear);
    term = "";
    input.value = "";
    bar.classList.remove("on");
    bar.hidden = true;
    draw();
  }

  // reader-core's Search button calls this and does nothing when it is
  // absent, which is why the button has never worked.
  window.__frOpenSearch = function (seed) { open(seed); };
  window.__frCloseSearch = close;

  // Ctrl/Cmd+Shift+F. Plain Cmd+F belongs to the browser and taking it
  // from a reader who wants the browser's own find would be rude.
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "f" || e.key === "F")) {
      e.preventDefault(); open("");
    }
  });

  // A page turn replaces the text the marks were in. Re-run against what
  // is there now rather than leaving a stale count over new prose.
  let settling = null;
  if (scroller && window.MutationObserver) {
    observer = new MutationObserver(() => {
      if (!bar || bar.hidden || !term.trim()) return;
      window.clearTimeout(settling);
      settling = window.setTimeout(() => run(term, true), 200);
    });
    observer.observe(scroller, { childList: true, subtree: true });
  }
})();
