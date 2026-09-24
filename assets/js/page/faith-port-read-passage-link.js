/*
 * A link to exactly the words a reader selected.
 *
 * Ian, 2026-09-23: "Add copy and link to this bar and make the link link
 * to the exact highlight." The selection bar's Link used to copy the
 * paragraph's anchor (…#b12-3): the reader who followed it landed on
 * the paragraph and had to find the sentence themselves.
 *
 * Link and Copy now carry the selected words as `hl=` beside the
 * paragraph anchor. On arrival, once the reader has rendered that
 * paragraph, the words are found in it and marked with the CSS Custom
 * Highlight API (a painted range; the text itself is not touched, so the
 * engine's own highlights, notes and selection keep working), and
 * brought to the middle of the screen. The mark lasts until the reader
 * selects something else. A browser without the Highlight API still
 * lands on the paragraph.
 *
 * Both buttons are taken at the document in the capture phase, before
 * read-tools.js's own onclick, which copied the paragraph link.
 */
(function () {
  "use strict";

  const MAX = 400; // characters carried in a link; enough to be exact
  const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();

  // The last selection made in the text, kept because pressing a button
  // can clear the live one before the click lands.
  let last = null;
  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    const row = node && node.closest && node.closest("#reading .row[id]");
    if (!row) return;
    const text = norm(sel.toString());
    if (text) last = { text, row };
  });

  function exactLink(sel) {
    const u = new URL(window.location.href);
    u.searchParams.delete("hl");
    u.searchParams.set("hl", sel.text.slice(0, MAX));
    u.hash = sel.row.id;
    return u.href;
  }

  function cite(row) {
    // The citation line read-tools.js prints lives on the popover's own
    // Cite button; the work and page are enough for a pasted quotation.
    const h1 = document.getElementById("h1");
    const who = document.getElementById("reader-author");
    const folio = row.closest(".folio");
    const parts = [
      who ? norm(who.textContent) : "",
      h1 ? norm(h1.textContent) : "",
      folio && folio.dataset.page ? `p. ${folio.dataset.page}` : "",
    ].filter(Boolean);
    return parts.join(", ");
  }

  function write(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject(new Error("no clipboard"));
  }
  function flash(btn, ok) {
    const was = btn.dataset.frLabel || btn.textContent;
    btn.dataset.frLabel = was;
    btn.textContent = ok ? "Copied" : "Could not copy";
    window.setTimeout(() => { btn.textContent = was; }, 1100);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("#spLink, #spCopy");
    if (!btn || !last) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const link = exactLink(last);
    const body = btn.id === "spLink"
      ? link
      : `${last.text}\n\n${cite(last.row)}\n${link}`;
    write(body).then(() => flash(btn, true), () => flash(btn, false));
  }, true);

  // ── Arriving on a link ─────────────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const want = norm(params.get("hl"));
  const rowId = (window.location.hash || "").slice(1);
  if (!want || !rowId || !(window.CSS && CSS.highlights && window.Highlight)) return;

  // The words may cross formatting (italics, footnote markers), so they
  // are looked for in the paragraph's text as one string, then mapped
  // back to the text nodes that hold them.
  function rangeFor(row, text) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let flat = "";
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement && n.parentElement.closest("button, .fr-sec-toggle")) continue;
      for (let i = 0; i < n.data.length; i += 1) {
        const ch = /\s/.test(n.data[i]) ? " " : n.data[i];
        if (ch === " " && flat.endsWith(" ")) continue;
        nodes.push([n, i]);
        flat += ch;
      }
    }
    const at = flat.indexOf(text);
    if (at < 0) return null;
    const start = nodes[at];
    const end = nodes[at + text.length - 1];
    const r = document.createRange();
    r.setStart(start[0], start[1]);
    r.setEnd(end[0], end[1] + 1);
    return r;
  }

  let tries = 0;
  (function look() {
    const row = document.getElementById(rowId);
    const range = row && rangeFor(row, want);
    if (!range) {
      tries += 1;
      if (tries < 60) window.setTimeout(look, 250);
      return;
    }
    CSS.highlights.set("fr-passage-link", new Highlight(range));
    // The words are marked; take them out of the address so the engine's
    // own links built from it (Cite, BibTeX) do not carry them.
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("hl");
      window.history.replaceState(window.history.state, "", u.href);
    } catch (err) { /* the address keeps them; harmless */ }
    // After the engine's own landing on the anchor, then to the words.
    window.setTimeout(() => {
      const box = range.getBoundingClientRect();
      const sc = document.getElementById("scroll");
      if (sc && box.height) {
        const mid = sc.getBoundingClientRect().top + sc.clientHeight / 2;
        sc.scrollBy({ top: box.top - mid, behavior: "smooth" });
      }
    }, 400);
    const clear = () => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        CSS.highlights.delete("fr-passage-link");
        document.removeEventListener("selectionchange", clear);
      }
    };
    document.addEventListener("selectionchange", clear);
  }());
}());
