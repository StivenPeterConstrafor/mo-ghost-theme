/* Shared presentation policy for the Ghost library. Source records stay intact.
 * This removes a withdrawn work from the UI; server/storage withdrawal remains
 * necessary to revoke direct access outside the theme.
 */
(function (root) {
  'use strict';
  const withdrawn = new Set(['westminster-assembly-minutes-vol-1']);
  const fold = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const publicWork = value => !withdrawn.has(String(typeof value === 'object' && value ? value.slug || value.id || value.w || value.work || '' : value || ''));
  let aliases = {}, keys = new Map();
  function setAliases(data) {
    aliases = data.aliases || {};
    keys = new Map(Object.entries(aliases).map(([before, after]) => [fold(before), fold(after)]));
  }
  const authorName = value => aliases[value] || String(value || '');
  const authorKey = value => keys.get(fold(value)) || fold(value);
  function normalize(works) {
    return works.filter(publicWork).map(work => ({...work, authorOriginal:work.authorOriginal || work.author, author:authorName(work.author)}));
  }
  const loaded = new Map();
  let ready = Promise.resolve();
  const api = {publicWork, authorName, authorKey, normalize, setAliases,
    load(id) {
      if (!loaded.has(id)) loaded.set(id, Promise.all([root.MOCorpora.load(id), ready]).then(([works]) => normalize(works)));
      return loaded.get(id);
    },
  };
  root.MOFaithCatalogue = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root.document || !root.location.pathname.startsWith('/the-faith-received/')) return;
  ready = fetch('/assets/data/faith-received/english-author-aliases.json?v=20260920a')
    .then(response => { if (!response.ok) throw Error('Author aliases unavailable'); return response.json(); })
    .then(setAliases).catch(error => root.console?.warn(error.message));
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
