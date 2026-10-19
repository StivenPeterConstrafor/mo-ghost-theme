/*
 * Author cards: the people, before their books.
 *
 * Searching a name and being handed 345 title cards buries the man under his own bibliography, so a search that
 * matches a writer says so first and offers the page that gathers everything under the name. ONE implementation,
 * used by the library's hero search (faith-browse-search.js) and the Search page (faith-port-search-authors.js), so a
 * card means the same thing in both places (Ian, 2026-10-19: "the search page doesn't show Author cards that link to
 * their pages like the curated search does").
 *
 *   MOAuthorCards.match(works, term)   [[name, workCount], ...], most works first
 *   MOAuthorCards.block(found, page)   { html, pages, page } for the .bsearch-authors block
 *   MOAuthorCards.href(name)           the author's page (author-address.js resolves the folded name)
 *
 * A work's `author` may be a string or an array of names (the port catalogue); each name is counted on its own.
 * Paging is a button with data-bs-apage; the caller wires the click. Styles are .bsearch-author* in
 * faith-received.css, loaded on every page.
 */
(function () {
  "use strict";

  // Entries in the author field that are not a person: the catalogue's own annotations. "Unknown author (Augustine of
  // Hippo?)" is a librarian's guess, and offering it as a page beside Augustine's own reads as though the library
  // thinks they are two men who happen to share a name.
  const NOT_A_NAME = /^(unknown|anonymous|anon\b|unattributed|\[?various)|\?\s*\)?$/i;

  const AUTHORS_PER_PAGE = 24;

  const fold = (s) => String(s || "")
    .normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "");
  // The words of a query, in any order. fold() drops the spaces too, so the words are split from what was typed and
  // folded one by one.
  const queryWords = (s) => String(s || "").split(/\s+/).map(fold).filter(Boolean);
  const hasWords = (h, words) => words.length > 1 && words.every((x) => h.includes(x));

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const href = (name) => `/the-faith-received/author/?a=${encodeURIComponent(fold(name))}`;

  // Counted against the whole catalogue rather than a filtered set, because the number has to be what the author's
  // page will show. "Albert Great" and "Calvin John" are names too: every word, any order.
  function match(works, term) {
    const q = fold(term);
    if (!q || !works) return [];
    const words = queryWords(term);
    const memo = new Map();
    const m = new Map();
    const names = (w) => (Array.isArray(w.author) ? w.author : [w.author]);
    for (const w of works) {
      for (const raw of names(w)) {
        const a = String(raw || "").trim();
        if (!a || NOT_A_NAME.test(a)) continue;
        let f = memo.get(a);
        if (f === undefined) { f = fold(a); memo.set(a, f); }
        if (!f.includes(q) && !hasWords(f, words)) continue;
        m.set(a, (m.get(a) || 0) + 1);
      }
    }
    // All of them, most works first. Three was a cap, and a cap on a name search is what hid the fact that the
    // catalogue spells Calvin two ways.
    return [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  }

  // A page of names, then a pager. It used to scroll inside a box, which put 1,903 authors behind a 320px window and
  // made the reader drag a scrollbar to reach the second Calvin.
  function pager(page, pages) {
    if (pages < 2) return "";
    const win = [];
    const push = (n) => { if (win[win.length - 1] !== n) win.push(n); };
    push(1);
    if (page - 2 > 2) win.push(null);
    for (let n = Math.max(2, page - 2); n <= Math.min(pages - 1, page + 2); n += 1) push(n);
    if (page + 2 < pages - 1) win.push(null);
    push(pages);
    return `<p class="faith-pager bsearch-authors-pager">`
      + `<button type="button" class="faith-pager-btn" data-bs-apage="${page - 1}"${page <= 1 ? " disabled" : ""}>&larr; Previous</button>`
      + `<span class="faith-pager-nums">${win.map((n) => (n === null
        ? `<span class="faith-pager-gap" aria-hidden="true">&hellip;</span>`
        : `<button type="button" class="faith-pager-num${n === page ? " is-current" : ""}" data-bs-apage="${n}"${n === page ? ' aria-current="page"' : ""}>${n}</button>`)).join("")}</span>`
      + `<button type="button" class="faith-pager-btn" data-bs-apage="${page + 1}"${page >= pages ? " disabled" : ""}>Next &rarr;</button></p>`;
  }

  function block(found, page) {
    if (!found || !found.length) return { html: "", pages: 0, page: 1 };
    const pages = Math.max(1, Math.ceil(found.length / AUTHORS_PER_PAGE));
    const at = page > pages || page < 1 ? 1 : page;
    const from = (at - 1) * AUTHORS_PER_PAGE;
    const label = found.length === 1 ? "Author" : `${found.length.toLocaleString()} authors`;
    const rows = found.slice(from, from + AUTHORS_PER_PAGE).map(([name, n]) =>
      `<a class="bsearch-author" href="${href(name)}">`
      + `<span class="bsearch-author-name">${escapeHtml(name)}</span>`
      + `<span class="bsearch-author-n">${n.toLocaleString()} work${n === 1 ? "" : "s"}</span>`
      + `<span class="bsearch-author-go" aria-hidden="true">&rarr;</span></a>`).join("");
    return {
      pages,
      page: at,
      html: `<div class="bsearch-authors">`
        + `<p class="bsearch-authors-label">${escapeHtml(label)}</p>`
        + `<div class="bsearch-authors-list">${rows}</div>${pager(at, pages)}</div>`,
    };
  }

  window.MOAuthorCards = { match, block, href, fold };
}());
