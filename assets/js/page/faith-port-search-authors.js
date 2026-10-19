/*
 * Author cards on the Search page.
 *
 * Ian, 2026-10-19: "the search page doesn't show Author cards that link to their pages like the curated search does.
 * It should do that." The library's hero search puts the writer a query names above the books; the Search page showed
 * only the books. The cards are the same ones (MOAuthorCards, assets/js/lib/faith-author-cards.js): same matching, same
 * markup, same .bsearch-author styles, same link to the author's page.
 *
 * Shown on Find a work (as you type) and Search the texts (once the search has run), above the results. Other modes
 * keep their own results. The catalogue is the one the page already holds (FRResearchData.corpus(), memoized), read
 * with each work's authors as a list rather than the page's comma-joined string, so a work by two writers counts for
 * each of them.
 *
 * Loaded after search.in03.js, whose MODE and #q this reads. No inline script (CSP); no page code calls into this.
 */
(function () {
  'use strict';

  const cards = window.MOAuthorCards;
  const q = document.getElementById('q');
  const results = document.getElementById('results');
  const countRow = document.querySelector('.count-row');
  const modes = document.querySelector('.smodes');
  if (!cards || !q || !results || !countRow) return;

  let host = null;
  let works = null;
  let loading = false;
  let page = 1;
  let key = '';
  // Search the texts runs on Enter or the button, not as you type. A search that ran is in the address bar (run() saves
  // m and q); typing after it makes the cards stale until the next run.
  let dirty = false;

  const mode = () => (typeof MODE === 'string' ? MODE : 'title'); // search.in03.js's top-level var

  function ensureHost() {
    if (host) return host;
    host = document.createElement('div');
    host.id = 'searchAuthors';
    host.className = 'search-authors';
    host.hidden = true;
    countRow.after(host);
    return host;
  }

  function clear() {
    key = '';
    if (host) { host.hidden = true; host.innerHTML = ''; }
  }

  function load() {
    if (works || loading) return;
    const data = window.FRResearchData;
    if (!data || typeof data.corpus !== 'function') return;
    loading = true;
    data.corpus().then((corpus) => {
      works = Array.from(corpus.works.values());
      loading = false;
      sync();
    }).catch(() => { loading = false; });
  }

  function wanted() {
    const m = mode();
    if (m === 'title') return q.value.trim();
    if (m === 'full') {
      if (dirty) return '';
      const u = new URL(location.href).searchParams;
      return u.get('m') === 'full' ? (u.get('q') || '').trim() : '';
    }
    return '';
  }

  function sync(force) {
    const term = wanted();
    if (term.length < 2) { clear(); return; }
    if (!works) { load(); return; }
    const next = mode() + '|' + term + '|' + page;
    if (!force && next === key) return;
    const found = cards.match(works, term);
    if (!found.length) { clear(); return; }
    const b = cards.block(found, page);
    page = b.page;
    key = mode() + '|' + term + '|' + page;
    const el = ensureHost();
    el.innerHTML = b.html;
    el.hidden = false;
  }

  let timer = 0;
  const soon = () => { clearTimeout(timer); timer = setTimeout(() => sync(), 120); };

  q.addEventListener('input', () => {
    page = 1;
    if (mode() === 'full') { dirty = true; clear(); return; }
    soon();
  });
  q.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (mode() === 'full') { page = 1; dirty = false; }
    soon();
  });
  const go = document.getElementById('runSearch');
  if (go) go.addEventListener('click', () => {
    if (mode() === 'full') { page = 1; dirty = false; }
    soon();
  });
  if (modes) modes.addEventListener('click', () => { page = 1; dirty = false; clear(); setTimeout(() => sync(), 0); });

  // A search restored from the address bar, and every repaint of the results, land here.
  new MutationObserver(soon).observe(results, { childList: true });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('#searchAuthors [data-bs-apage]');
    if (!btn || btn.disabled) return;
    const n = parseInt(btn.getAttribute('data-bs-apage'), 10);
    if (!n) return;
    page = n;
    sync(true);
    const top = host && host.querySelector('.bsearch-authors');
    if (top) top.scrollIntoView({ block: 'start' });
  });

  load();
  soon();
}());
