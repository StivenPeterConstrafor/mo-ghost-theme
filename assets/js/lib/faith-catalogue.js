/* Shared presentation policy for the Ghost library. Source records stay intact.
 * This removes a withdrawn work from the UI; server/storage withdrawal remains
 * necessary to revoke direct access outside the theme.
 */
(function (root) {
  'use strict';
  const withdrawn = new Set(['westminster-assembly-minutes-vol-1']);
  const fold = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const publicWork = value => !withdrawn.has(String(typeof value === 'object' && value ? value.slug || value.id || value.w || value.work || '' : value || ''));
  let aliases = {}, keys = new Map(), duplicates = {}, workgroups = {}, canonical = null;
  const libraryIds = ['pg','pld','po','tfr','eebo','mo'];
  const corpusOf = slug => /^(pg|pld|po|eebo)-\d+$/.exec(slug)?.[1] || 'tfr';
  function setCanonical(data) { canonical = data.works || []; }
  const workSlug = work => typeof work !== 'object' ? String(work || '') : ['eebo','pld','pg','po'].includes(work.corpus) && !String(work.id).startsWith(`${work.corpus}-`) ? `${work.corpus}-${work.id}` : String(work.slug || work.id || '');
  function setWorkIdentity(fold, groups) { duplicates = fold || {}; workgroups = groups?.works || {}; }
  const displayWork = work => publicWork(work) && (!duplicates[workSlug(work)] || Boolean(workgroups[workSlug(work)]));
  function setAliases(data) {
    aliases = data.aliases || {};
    keys = new Map(Object.entries(aliases).map(([before, after]) => [fold(before), fold(after)]));
  }
  const authorName = value => aliases[value] || String(value || '');
  const authorKey = value => keys.get(fold(value)) || fold(value);
  function normalize(works) {
    return works.filter(displayWork).map(work => ({...work, authorOriginal:work.authorOriginal || work.author, author:authorName(work.author)}));
  }
  function catalogue(corpus, original) {
    if (corpus === 'mo') return normalize(original).map(work => ({...work, supplement:true}));
    if (corpus === 'confessions' || !canonical) return normalize(original);
    const old = new Map(original.map(w => [workSlug(w), w]));
    return normalize(canonical.filter(w => corpusOf(w.slug) === corpus).map(w => {
      const previous = old.get(w.slug) || {};
      const series = /^(?:PL|PG|PO)(?:\s+Tome)?\s+(\d+)/i.exec(w.volume || '');
      const volume = series ? series[1] : String(w.volume || '');
      return {...previous, corpus, id:corpus === 'tfr' ? w.slug : w.slug.replace(`${corpus}-`, ''),
        slug:w.slug, title:w.title_en || w.title, titleLatin:w.title_en && w.title_en !== w.title ? w.title : previous.titleLatin || '',
        author:authorName(previous.author).includes(' (') ? authorName(previous.author) : w.author_en || w.author, volume, tradition:w.tradition === 'Reformed' ? 'Continental Reformed' : w.tradition, party:w.party || '',
        eyebrow:series ? w.volume : w.tradition, extent:w.n_pages || previous.extent || 0,
        order:w.po ?? previous.order, cols:w.cols || previous.cols,
        url:`/the-faith-received/read/?w=${encodeURIComponent(w.slug)}`,
      };
    }));
  }
  const loaded = new Map();
  let ready = Promise.resolve();
  const api = {publicWork, displayWork, workSlug, authorName, authorKey, normalize, setAliases, setWorkIdentity, setCanonical, catalogue, libraryIds,
    load(id) {
      if (!loaded.has(id)) loaded.set(id, Promise.all([root.MOCorpora.load(id), ready]).then(([works]) => catalogue(id, works)));
      return loaded.get(id);
    },
  };
  root.MOFaithCatalogue = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root.document || !root.location.pathname.startsWith('/the-faith-received/')) return;
  const readJSON = url => fetch(url, {cache:'no-cache'}).then(response => { if (!response.ok) throw Error('Catalogue identity unavailable'); return response.json(); });
  const libraryBase = 'https://mo-tfr-library.mo-podcast-feed.workers.dev';
  ready = Promise.all([
    readJSON('/assets/data/faith-received/english-author-aliases.json?v=20260920a'),
    readJSON(`${libraryBase}/v1/dupfold.json`),
    readJSON(`${libraryBase}/v1/workgroups.json`),
    readJSON(`${libraryBase}/v1/author_aliases.json`),
    readJSON(`${libraryBase}/v1/works-index.json`),
  ]).then(([local, fold, groups, publishedAliases, index]) => {
    setAliases({aliases:{...publishedAliases, ...local.aliases}});
    setWorkIdentity(fold, groups);
    setCanonical(index);
  }).catch(error => root.console?.warn(error.message));
  api.ready = ready;
  // Ported surfaces read the public work index directly. Apply the same
  // withdrawal there, and refuse this work's requests before downloading it.
  const originalFetch = root.fetch;
  root.fetch = function (input, init) {
    const raw = typeof input === 'string' ? input : input?.url || String(input);
    let url;
    try { url = new URL(raw, root.location.origin); } catch (_) { return originalFetch.call(this, input, init); }
    const library = url.hostname.endsWith('.mo-podcast-feed.workers.dev');
    const path = decodeURIComponent(url.pathname);
    if (library && [...withdrawn].some(slug => path.split('/').includes(slug) || path.split('/').some(part => part.startsWith(`${slug}.`)) || url.searchParams.get('w') === slug || url.searchParams.get('slug') === slug)) {
      return Promise.resolve(new Response(JSON.stringify({error:'This volume is not available in the public library.'}), {status:404, headers:{'content-type':'application/json'}}));
    }
    return originalFetch.call(this, input, init).then(async response => {
      if (!library || !response.ok || !['/v1/works-index.json','/v1/mo/index.json'].includes(path)) return response;
      const data = await response.clone().json();
      if (!Array.isArray(data.works)) return response;
      data.works = data.works.filter(publicWork);
      const headers = new Headers(response.headers);
      headers.delete('content-length'); headers.delete('content-encoding');
      return new Response(JSON.stringify(data), {status:response.status, headers});
    });
  };
})(typeof window === 'undefined' ? globalThis : window);
