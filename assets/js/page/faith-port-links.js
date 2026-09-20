/* Source-library addresses belong to the Ghost library after the port.
 * Keep query parameters and fragments, including column IDs with colons.
 * Unknown external references are citations, and are left alone.
 */
(function (root) {
  'use strict';
  if (root.FRPortLinks) return;
  const prefix = '/the-faith-received/';
  const routes = {index:'all-works', library:'all-works', read:'read', reader:'reader', readen:'readen', review:'review', search:'search', ask:'ask', authors:'author', fathers:'author', topics:'topics', compare:'compare', pins:'pins', desk:'desk', bible:'bible', web:'web', dtc:'dictionary'};
  function localURL(raw, origin) {
    let u;
    try { u = new URL(raw, origin); } catch (_) { return raw; }
    const source = u.origin === 'https://thefaithreceived.vercel.app';
    if (!source && u.origin !== origin) return raw;
    let path = u.pathname;
    if([prefix,prefix.slice(0,-1),prefix+'all-works/',prefix+'library/'].includes(path)&&!u.search&&!u.hash)return prefix+'all-works/?collection=all';
    if (path === prefix + 'reader/' || path === prefix + 'reader') {
      const corpus = u.searchParams.get('c') || 'tfr';
      const work = u.searchParams.get('w');
      if (work && ['tfr','confessions','eebo','pld','pg','po'].includes(corpus)) {
        u.searchParams.set('w', ['eebo','pld','pg','po'].includes(corpus) && !work.startsWith(corpus+'-') ? corpus+'-'+work : work);
        u.searchParams.delete('c');
        return prefix + 'read/' + u.search + u.hash;
      }
    }
    if (path.startsWith(prefix)) return source ? path + u.search + u.hash : raw;
    if (!path || path === '/') {
      if (u.searchParams.has('tq')) return prefix + 'search/?m=title&q=' + encodeURIComponent(u.searchParams.get('tq'));
      if(source){if(!u.searchParams.has('collection'))u.searchParams.set('collection','all');return prefix+'all-works/'+u.search+u.hash;}return raw;
    }
    const work = /^\/read\/([^/]+?)(?:\.html)?\/?$/.exec(path);
    if (work) {
      if (!u.searchParams.has('w')) u.searchParams.set('w', decodeURIComponent(work[1]));
      return prefix + 'read/' + u.search + u.hash;
    }
    const name = path.replace(/^\//, '').replace(/\/$/, '').replace(/\.html$/, '');
    return routes[name] ? prefix + routes[name] + '/' + u.search + u.hash : raw;
  }
  root.FRPortLinks = {localURL};
  if (typeof module === 'object' && module.exports) module.exports = root.FRPortLinks;
  if (!root.document) return;
  function rewrite(node) {
    const links = node.matches?.('a[href]') ? [node] : [];
    links.push(...(node.querySelectorAll?.('a[href]') || []));
    for (const link of links) {
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith('#')) continue;
      const next = localURL(raw, root.location.origin);
      if (next !== raw) link.setAttribute('href', next);
    }
  }
  function start() {
    rewrite(document.body);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') rewrite(record.target);
        else for (const node of record.addedNodes) if (node.nodeType === 1) rewrite(node);
      }
    }).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['href']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})(typeof window === 'undefined' ? globalThis : window);
