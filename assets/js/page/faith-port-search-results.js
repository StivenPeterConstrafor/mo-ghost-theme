/*
 * Search results: land on the passage, and read like the rest of TFR.
 *
 * Ian, 2026-09-24: every Father's passage in a By-idea search read
 * "Open work; exact reader location unavailable" and opened the work at
 * its top. The location was never missing. The search worker returns a
 * Patrologia hit as { doc, cit: "PL 34:0889", anchor: "34:0889" }, and the
 * port's FRSearch.meaningCandidates reads only `hit.page`, which the
 * worker sets for library (tfr) hits alone. The column is in `anchor` and
 * again in `cit`, and the reader anchors a Migne column as #b<col>-0.
 *
 * So, before the port reads a response, a Father's hit is given the
 * reader page its column names:
 *   PL  one anchor per column          PL 34:0889  -> #b889-0
 *   PG  one anchor per two-column page PG 1:0040   -> #b39-0 (odd column)
 *   PO  printed page                   anchor 422  -> #b422-0
 * Aquinas rows carry no work slug the catalogue can resolve and are left
 * as the port has them.
 *
 * Then, as results paint: the reference becomes a small-caps eyebrow
 * (PL 34 · col. 889), the link reads "Read in context →" and carries the
 * snippet's opening words as ?hl= so the reader marks them
 * (faith-port-read-passage-link.js), and a passage with no location says
 * "Open work →", not an error. The group controls join the result count.
 *
 * Loaded right after search-tools.js, before the port's page script.
 * Our file, not Stiven's: the port files are untouched.
 */
(function () {
  'use strict';

  const S = window.FRSearch;
  const CORPUS = { PL: 'PL', PLD: 'PL', PG: 'PG', PO: 'PO' };
  const PREFIX = { PL: 'pld-', PG: 'pg-', PO: 'po-' };

  // The reader page a Father's hit lands on, or null.
  function fatherPage(corpus, anchor, cit) {
    const c = CORPUS[String(corpus || '').toUpperCase()];
    if (!c) return null;
    if (c === 'PO') {
      const n = /^\d+$/.exec(String(anchor || '').trim());
      return n ? String(Number(n[0])) : null;
    }
    const m = /(?:^|\D)\d+\s*:\s*0*(\d+)[A-D]?\s*$/i.exec(String(anchor || '')) ||
      /^P[LG]\s*\d+\s*:\s*0*(\d+)[A-D]?\b/i.exec(String(cit || '').trim());
    if (!m) return null;
    let col = Number(m[1]);
    if (!col) return null;
    // A Greek page is two columns and is anchored at its first (odd) one.
    if (c === 'PG' && col % 2 === 0) col -= 1;
    return String(col);
  }

  if (S && typeof S.meaningCandidates === 'function' && !S.meaningCandidates.moFathers) {
    const original = S.meaningCandidates;
    const patched = function (data, works) {
      try {
        if (data && Array.isArray(data.bands)) {
          data.bands.forEach((band) => (band.hits || []).forEach((hit) => {
            if (hit && hit.page == null && hit.doc != null) {
              const page = fatherPage(hit.corpus, hit.anchor, hit.cit);
              if (page) hit.page = page;
            }
          }));
        } else if (data && Array.isArray(data.results)) {
          const c = CORPUS[String(data.corpus || '').toUpperCase()];
          data.results.forEach((row) => {
            if (!row || row.slug || row.doc == null || !c) return;
            const page = row.page != null && c !== 'PL' && c !== 'PG' ? String(row.page) : fatherPage(c, row.anchor != null ? row.anchor : row.page, row.cit);
            if (!page) return;
            const key = String(row.doc);
            row.slug = key.startsWith(PREFIX[c]) ? key : PREFIX[c] + key;
            row.page = page;
          });
        }
      } catch (_) { /* the port's own reading still runs */ }
      return original.call(this, data, works);
    };
    patched.moFathers = true;
    S.meaningCandidates = patched;
  }

  // ── Painting ──────────────────────────────────────────────────────
  const results = document.getElementById('results');
  if (!results) return;

  function eyebrow(raw) {
    const t = String(raw || '').replace(/\s+/g, ' ').trim();
    let m = /^(PL|PG)\s*(\d+)\s*:\s*0*(\d+)([A-D]?)$/i.exec(t);
    if (m) return `${m[1].toUpperCase()} ${m[2]} · col. ${m[3]}${m[4] ? m[4].toUpperCase() : ''}`;
    m = /^(?:PO\s+)+(.*)$/.exec(t);
    if (m) return `PO ${m[1].replace(/^PO\s+/i, '')}`;
    m = /,?\s*p\.\s*(\S+)$/.exec(t);
    if (m && t.length > m[0].length) return `Page ${m[1]}`;
    m = /^Location\s+(\S+)$/.exec(t);
    if (m) return `Page ${m[1]}`;
    return t;
  }

  // The first words of a snippet, enough for the reader to find them.
  function openingWords(text) {
    const words = String(text || '').replace(/…\s*$/, '').replace(/\s+/g, ' ').trim().split(' ');
    if (words.length < 4) return '';
    return words.slice(0, Math.min(8, words.length - 1)).join(' ');
  }

  function paintLink(a) {
    const href = a.getAttribute('href') || '';
    const located = href.includes('#');
    const cite = a.querySelector('.sr-cite');
    if (cite && !cite.dataset.moCite) {
      const own = Array.from(cite.childNodes).filter((n) => n.nodeType === 3).map((n) => n.data).join('').trim();
      if (own && !cite.children.length) {
        cite.dataset.moCite = own;
        const nice = eyebrow(own);
        if (nice !== own) cite.textContent = nice;
        cite.title = own;
      }
    }
    // Only a passage row (an excerpt under a reference) takes the arrow;
    // a work row in Works mode is its own link.
    const passage = a.querySelector('.sr-ex');
    let go = a.querySelector('.mo-sr-go');
    const port = a.querySelector(':scope > small');
    if (passage) {
      if (port) port.hidden = true;
      if (!go) {
        go = document.createElement('span');
        go.className = 'mo-sr-go';
        a.appendChild(go);
      }
      const label = located ? 'Read in context' : 'Open work';
      if (go.dataset.label !== label) {
        go.dataset.label = label;
        go.textContent = `${label} →`;
      }
      if (located && !a.closest('.exact-work')) {
        const words = openingWords(passage.textContent);
        try {
          const u = new URL(href, location.origin);
          if (words && u.searchParams.get('hl') !== words) {
            u.searchParams.set('hl', words);
            a.setAttribute('href', u.pathname + u.search + u.hash);
          }
        } catch (_) { /* leave the port's link */ }
      }
    }
  }

  function paint() {
    results.querySelectorAll('a.sr').forEach(paintLink);
    // A work with no printed reference read "· 3 indexed excerpts".
    results.querySelectorAll('.scripture-work > summary > span').forEach((span) => {
      const t = span.firstChild;
      if (t && t.nodeType === 3 && /^\s*·\s*/.test(t.data)) t.data = t.data.replace(/^\s*·\s*/, '');
    });
    // The group controls sit with the count, one toolbar, not a row of
    // underlined links between the pager and the results.
    const row = document.querySelector('.faith-port-search-page .count-row');
    const group = document.getElementById('groupControls');
    const density = document.getElementById('densityBtn');
    if (row && group && group.parentNode !== row) row.insertBefore(group, density && density.parentNode === row ? density : null);
  }

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      observer.disconnect();
      try { paint(); } finally { watch(); }
    });
  });
  function watch() {
    observer.observe(results, { childList: true, subtree: true, characterData: true });
    const main = results.parentNode;
    if (main) observer.observe(main, { childList: true });
  }
  paint();
  watch();
})();
