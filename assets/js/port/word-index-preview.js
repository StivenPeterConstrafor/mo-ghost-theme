/* THE PASSAGES BEHIND A COUNT (2026-09-29). Owner: "make its easy to preview instances make sure its grouped nicely". The word
   panel (word-index-search.js) knows, for each work, every page that holds the word (the concordance); this reads those pages'
   text from the files the reader itself opens, and cuts a line around each use — the original text, not the search index's copy
   (which drops Latin and Greek function words). No server call: static files on the site's store.
     library works   v1/works/<slug>/meta.json → the page shard(s) holding the pages asked for (page n, lanes en/la/…); a TEI-only
                     work (no page files) → its tei.<lang>.xml, cut at <pb n>
     Latin/Greek/Eastern Fathers  tei/<pld|pg|po>/<id>.xml (v1/tei/… on MereO), cut at its page and column markers as the corpus module cuts it
                     (api/_corpus.mjs canonicalPages: <pb n>, <milestone unit=column|page|folio n>; in a volume whose columns are
                     'vol:col', a bare column number marks the volume, not a page) + the PG English (v1/pgen/<id>.json, by page)
     EEBO            eebo/<id>.json.gz: its sections' HTML, cut at <span class="pb" data-n>
   A word matches when it folds to one of the forms (api/_sql-util.mjs foldWord), so 'Famam', 'fámam' and 'famam' are one form.
   FRWordPreview.pages(slug, pageKeys) → Promise of Map(pageKey → text); FRWordPreview.kwic(text, forms) → {snips:[html], total}. */
(function () {
  'use strict';
  const BASE = (window.__FR_BLOB_BASE__ && !/TBD/.test(String(window.__FR_BLOB_BASE__)) ? String(window.__FR_BLOB_BASE__)
    : 'https://mo-tfr-library.mo-podcast-feed.workers.dev').replace(/\/+$/, '');
  const fold = w => String(w || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ſ/g, 's').replace(/æ/g, 'ae').replace(/œ/g, 'oe')
    .replace(/j/g, 'i').replace(/v/g, 'u').replace(/ς/g, 'σ');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // a page key as the reader and the concordance share it: '0238' and 238 are one page; '87:1089B' is itself
  const key = p => { const s = String(p == null ? '' : p).trim(); return /^\d+$/.test(s) ? String(Number(s)) : s; };
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  const decode = s => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, k) => k[0] === '#' ? String.fromCodePoint(k[1].toLowerCase() === 'x' ? parseInt(k.slice(2), 16) : Number(k.slice(1))) : (ENT[k] ?? m));
  // markup out; the page files' Markdown heading and emphasis marks (### DE IVSTITIA, **Caput I**) too
  const plain = s => decode(String(s).replace(/<[^>]+>/g, ' ')).replace(/(^|\s)#{1,6}(?=\s)/g, ' ').replace(/\*\*|__/g, '').replace(/\s+/g, ' ').trim();

  const docs = new Map();   // slug → Promise of {get(pageKeys) → Promise of Map}
  async function fetchText(path) {
    const r = await fetch(BASE + '/' + path);
    if (!r.ok) throw Error(path + ' ' + r.status);
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf[0] === 0x1f && buf[1] === 0x8b) {   // a .gz the store serves as stored bytes
      const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Response(s).text();
    }
    return new TextDecoder().decode(buf);
  }
  // The Fathers' TEIs: tei/<fam>/<id>.xml on the site's Blob, v1/tei/<fam>/<id>.xml on MereO's store (whose PO copies carry the
  // original and the English only). The first that answers is remembered for the session.
  let teiDir = null;
  async function teiText(fam, id) {
    for (const d of teiDir ? [teiDir] : ['tei/', 'v1/tei/']) {
      try { const t = await fetchText(`${d}${fam}/${id}.xml`); teiDir = d; return t; } catch (e) { if (teiDir) throw e; }
    }
    throw Error(`no TEI for ${fam}-${id}`);
  }
  // Cut marked-up text at its page markers → Map(pageKey → plain text).
  function cut(xml) {
    const out = new Map(), body = xml.search(/<body[\s>]/), s = body > 0 ? xml.slice(body) : xml;
    const composite = /<milestone\b[^>]*unit="column"[^>]*\bn="[^"]*:[^"]*"/.test(s);
    const MARK = /<pb\b[^>]*?\bn="([^"]*)"[^>]*>|<milestone\b(?=[^>]*\bunit="(?:column|page|folio)")[^>]*?\bn="([^"]*)"[^>]*>|<span\b(?=[^>]*\bclass="[^"]*\bpb\b[^"]*")[^>]*?\bdata-n="([^"]*)"[^>]*>/g;
    let at = 0, cur = null, m;
    const put = (k, t) => { if (k == null) return; const x = plain(t); if (x) out.set(k, out.has(k) ? out.get(k) + ' ' + x : x); };
    while ((m = MARK.exec(s))) {
      put(cur, s.slice(at, m.index)); at = MARK.lastIndex;
      const n = decode(m[1] ?? m[2] ?? m[3]);
      if (m[2] != null && composite && !n.includes(':')) { cur = null; continue; }   // a volume's number, not a column
      cur = key(n);
    }
    put(cur, s.slice(at));
    return out;
  }
  function source(slug) {
    if (docs.has(slug)) return docs.get(slug);
    const fam = /^(pld|pg|po|eebo)-(.+)$/.exec(slug);
    let p;
    if (fam && fam[1] === 'eebo') p = fetchText(`eebo/${fam[2]}.json.gz`).then(t => {
      const d = JSON.parse(t), html = [];
      (function walk(ns) { for (const n of ns || []) { if (n.label) html.push('<h>' + esc(n.label) + '</h>'); if (n.html) html.push(n.html); walk(n.kids); } })(d.toc);
      const pages = cut('<body>' + html.join('\n')); return { get: async () => pages };
    });
    else if (fam) p = Promise.all([teiText(fam[1], fam[2]), fam[1] === 'pg' ? fetchText(`v1/pgen/${fam[2]}.json`).then(JSON.parse).catch(() => null) : null]).then(([xml, en]) => {
      const pages = cut(xml);
      if (en) for (const [k, t] of Object.entries(en)) { const kk = key(k), x = plain(t); if (x) pages.set(kk, pages.has(kk) ? pages.get(kk) + ' ' + x : x); }
      return { get: async () => pages };
    });
    else p = fetchText(`v1/works/${slug}/meta.json`).then(JSON.parse).then(async meta => {
      if (!meta.single && !(meta.shards || []).length) {   // a TEI-only work (the EEBO divines' class): tei.<lang>.xml cut at <pb n>
        const pages = new Map();
        for (const xml of await Promise.all(['en', 'la', 'grc', 'fr'].map(l => fetchText(`v1/works/${slug}/tei.${l}.xml`).catch(() => ''))))
          if (xml) cut(xml).forEach((t, k) => pages.set(k, pages.has(k) ? pages.get(k) + ' ' + t : t));
        return { get: async () => pages };
      }
      const files = meta.single ? [{ file: meta.single === true ? 'work.json' : meta.single }] : (meta.shards || []);
      const loaded = new Map();
      const load = f => loaded.get(f.file) || loaded.set(f.file, fetchText(`v1/works/${slug}/${f.file}`).then(JSON.parse).then(d => {
        const m = new Map();
        for (const pg of d.pages || []) {
          const t = ['la', 'grc', 'en', 'fr', 'de', 'it', 'es', 'nl'].map(l => pg[l]).filter(x => typeof x === 'string' && x.trim()).map(plain).join(' ');
          if (t) m.set(key(pg.n), t);
        }
        return m;
      })).get(f.file);
      return {
        async get(keys) {
          const need = files.length === 1 ? files : files.filter(f => keys.some(k => /^\d+$/.test(k) ? (+k >= f.from && +k <= f.to) : true));
          const maps = await Promise.all(need.map(load)), out = new Map();
          maps.forEach(m => m.forEach((t, k) => out.set(k, t)));
          return out;
        },
      };
    });
    p = p.catch(e => { docs.delete(slug); throw e; });
    docs.set(slug, p);
    return p;
  }
  /** The text of these pages of a work: Map(the page key as given → text or ''). */
  async function pages(slug, keys) {
    const src = await source(slug), ks = keys.map(key), got = await src.get(ks);
    return new Map(keys.map((k, i) => [k, got.get(ks[i]) || '']));
  }
  /** Lines around the uses of the forms in a text: {snips: [html with <mark>], total uses}. */
  function kwic(text, forms, { max = 2, width = 110 } = {}) {
    const set = new Set([].concat(forms).map(fold)), hits = [], re = /[\p{L}\p{M}]+/gu;
    let m;
    while ((m = re.exec(text))) if (set.has(fold(m[0]))) hits.push([m.index, m.index + m[0].length]);
    const snips = [];
    for (let i = 0; i < hits.length && snips.length < max;) {
      let a = Math.max(0, hits[i][0] - width), b = Math.min(text.length, hits[i][1] + width), j = i;
      while (j + 1 < hits.length && hits[j + 1][0] < b) { j++; b = Math.min(text.length, Math.max(b, hits[j][1] + 40)); }
      if (a > 0) { const sp = text.indexOf(' ', a); if (sp > 0 && sp < hits[i][0]) a = sp + 1; }
      if (b < text.length) { const sp = text.lastIndexOf(' ', b); if (sp > hits[j][1]) b = sp; }
      let html = a > 0 ? '… ' : '', at = a;
      for (let h = i; h <= j; h++) { html += esc(text.slice(at, hits[h][0])) + '<mark>' + esc(text.slice(hits[h][0], hits[h][1])) + '</mark>'; at = hits[h][1]; }
      html += esc(text.slice(at, b)) + (b < text.length ? ' …' : '');
      snips.push(html); i = j + 1;
    }
    return { snips, total: hits.length };
  }
  window.FRWordPreview = { pages, kwic, cut, key };
})();
