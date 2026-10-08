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
   FRWordPreview.pages(slug, pageKeys) → Promise of Map(pageKey → text); FRWordPreview.kwic(text, forms) → {snips:[html], total}.
   THE ENGLISH BESIDE THE ORIGINAL (2026-10-03, owner: "this just shows the latin not the english pls fix"): a page's lanes are kept
   apart — FRWordPreview.lanes(slug, keys) → Map(key → {o: the original (Latin/Greek/…), e: the English}) — and
   FRWordPreview.pair({o, e}, forms, {enForms}) → every use on the page as {o, e}: the line around the use, and the English of the
   same passage (where the English holds a form or one of enForms, that line; else the English at the same place on the page).
   English: the page files' en lane; a TEI-only work's tei.en.xml; the PG English sidecar (v1/pgen); a TEI's own
   <div type="translation" xml:lang="en">. */
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
  // pOK: an English translation div that carries no page markers numbers its paragraphs by page (<p n="5" corresp="#pg1-c5">)
  function cut(xml, pOK) {
    const out = new Map(), body = xml.search(/<body[\s>]/), s = body > 0 ? xml.slice(body) : xml;
    const composite = /<milestone\b[^>]*unit="column"[^>]*\bn="[^"]*:[^"]*"/.test(s);
    const MARK = pOK && !/<pb\b|<milestone\b/.test(s) ? /<p\b[^>]*?\bn="([^"]*)"[^>]*>()()/g
      : /<pb\b[^>]*?\bn="([^"]*)"[^>]*>|<milestone\b(?=[^>]*\bunit="(?:column|page|folio)")[^>]*?\bn="([^"]*)"[^>]*>|<span\b(?=[^>]*\bclass="[^"]*\bpb\b[^"]*")[^>]*?\bdata-n="([^"]*)"[^>]*>/g;
    let at = 0, cur = null, m;
    const put = (k, t) => { if (k == null) return; const x = plain(t); if (x) out.set(k, out.has(k) ? out.get(k) + ' ' + x : x); };
    while ((m = MARK.exec(s))) {
      put(cur, s.slice(at, m.index)); at = MARK.lastIndex;
      const n = decode(m[1] || m[2] || m[3] || '');
      if (m[2] != null && composite && !n.includes(':')) { cur = null; continue; }   // a volume's number, not a column
      cur = key(n);
    }
    put(cur, s.slice(at));
    return out;
  }
  // a TEI's English translation divs apart from the rest: {orig, en} (each div taken whole, nested divs counted)
  function splitEnglish(xml) {
    const OPEN = /<div\b(?=[^>]*\bxml:lang="en")(?=[^>]*\btype="translation")[^>]*>/g, en = [];
    let orig = '', at = 0, m;
    while ((m = OPEN.exec(xml))) {
      let depth = 1, i = OPEN.lastIndex;
      const TAG = /<div\b[^>]*>|<\/div>/g; TAG.lastIndex = i;
      let t;
      while (depth && (t = TAG.exec(xml))) depth += t[0][1] === '/' ? -1 : 1;
      const end = t ? TAG.lastIndex : xml.length;
      orig += xml.slice(at, m.index); en.push(xml.slice(m.index, end)); at = end; OPEN.lastIndex = end;
    }
    orig += xml.slice(at);
    return { orig, en };
  }
  const lanesOf = (o, e) => { const out = new Map(); o.forEach((t, k) => out.set(k, { o: t, e: '' })); e.forEach((t, k) => { const x = out.get(k) || { o: '', e: '' }; x.e = x.e ? x.e + ' ' + t : t; out.set(k, x); }); return out; };
  function source(slug) {
    if (docs.has(slug)) return docs.get(slug);
    const fam = /^(pld|pg|po|eebo)-(.+)$/.exec(slug);
    let p;
    if (fam && fam[1] === 'eebo') p = fetchText(`eebo/${fam[2]}.json.gz`).then(t => {
      const d = JSON.parse(t), html = [];
      (function walk(ns) { for (const n of ns || []) { if (n.label) html.push('<h>' + esc(n.label) + '</h>'); if (n.html) html.push(n.html); walk(n.kids); } })(d.toc);
      const pages = lanesOf(cut('<body>' + html.join('\n')), new Map()); return { get: async () => pages };   // EEBO: English is the original
    });
    else if (fam) p = Promise.all([teiText(fam[1], fam[2]), fam[1] === 'pg' ? fetchText(`v1/pgen/${fam[2]}.json`).then(JSON.parse).catch(() => null) : null]).then(([xml, side]) => {
      const { orig, en } = splitEnglish(xml), o = cut(orig);
      let e = new Map();
      if (side) for (const [k, t] of Object.entries(side)) { const kk = key(k), x = plain(t); if (x) e.set(kk, e.has(kk) ? e.get(kk) + ' ' + x : x); }   // the PG English sidecar first
      else en.forEach(d => cut(d, true).forEach((t, k) => e.set(k, e.has(k) ? e.get(k) + ' ' + t : t)));
      const pages = lanesOf(o, e);
      return { get: async () => pages };
    });
    else p = fetchText(`v1/works/${slug}/meta.json`).then(JSON.parse).then(async meta => {
      if (!meta.single && !(meta.shards || []).length) {   // a TEI-only work (the EEBO divines' class): tei.<lang>.xml cut at <pb n>
        const [en, ...orig] = await Promise.all(['en', 'la', 'grc', 'fr'].map(l => fetchText(`v1/works/${slug}/tei.${l}.xml`).catch(() => '')));
        const o = new Map();
        for (const xml of orig) if (xml) cut(xml).forEach((t, k) => o.set(k, o.has(k) ? o.get(k) + ' ' + t : t));
        const pages = lanesOf(o, en ? cut(en) : new Map());
        return { get: async () => pages };
      }
      const files = meta.single ? [{ file: meta.single === true ? 'work.json' : meta.single }] : (meta.shards || []);
      const loaded = new Map();
      const load = f => loaded.get(f.file) || loaded.set(f.file, fetchText(`v1/works/${slug}/${f.file}`).then(JSON.parse).then(d => {
        const m = new Map();
        for (const pg of d.pages || []) {
          const o = ['la', 'grc', 'fr', 'de', 'it', 'es', 'nl'].map(l => pg[l]).filter(x => typeof x === 'string' && x.trim()).map(plain).join(' ');
          const e = typeof pg.en === 'string' && pg.en.trim() ? plain(pg.en) : '';
          if (o || e) m.set(key(pg.n), { o, e });
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
  async function lanes(slug, keys) {
    const src = await source(slug), ks = keys.map(key), got = await src.get(ks);
    return new Map(keys.map((k, i) => [k, got.get(ks[i]) || { o: '', e: '' }]));
  }
  async function pages(slug, keys) {
    const got = await lanes(slug, keys);
    return new Map([...got].map(([k, x]) => [k, [x.o, x.e].filter(Boolean).join(' ')]));
  }
  /** Lines around the uses of the forms in a text: {snips: [html with <mark>], total uses}. */
  function kwic(text, forms, { max = 2, width = 110 } = {}) {
    const ws = windows(text, forms, width, max);
    return { snips: ws.map(w => w.html), total: ws.total };
  }
  // the uses in a text: a word (any of its forms), or a phrase (chains: its indexed words in order, each within four words of the
  // last, the small words between skipped as the word index skips them) — [[start, end], …] in text order
  function usesOf(text, forms, chains = []) {
    const set = new Set([].concat(forms).map(fold).filter(Boolean)), toks = [], re = /[\p{L}\p{M}]+/gu, hits = [];
    let m;
    while ((m = re.exec(text))) toks.push([m.index, m.index + m[0].length, fold(m[0])]);
    toks.forEach(t => { if (set.has(t[2])) hits.push([t[0], t[1]]); });
    for (const ch of chains.map(c => [].concat(c).map(fold).filter(Boolean)).filter(c => c.length)) {
      for (let k = 0; k < toks.length; k++) {
        if (toks[k][2] !== ch[0]) continue;
        let j = k, ok = true;
        for (const w of ch.slice(1)) { const n = toks.slice(j + 1, j + 5).findIndex(t => t[2] === w); if (n < 0) { ok = false; break; } j = j + 1 + n; }
        if (ok) { hits.push([toks[k][0], toks[j][1]]); k = j; }
      }
    }
    // ONE MARK PER WORD (2026-10-08, owner: "justification repeated twice"): a word found as a form and inside a phrase (the
    // concept's "fide iustificari" around the form "iustificari") gave two overlapping ranges, and the page printed the word twice
    // ("iustificariiustificari"). Overlapping ranges are one use.
    const merged = [];
    for (const h of hits.sort((x, y) => x[0] - y[0] || y[1] - x[1])) {
      const last = merged[merged.length - 1];
      if (last && h[0] < last[1]) last[1] = Math.max(last[1], h[1]); else merged.push([h[0], h[1]]);
    }
    return merged;
  }
  // the windows round every use (overlapping ones merged): [{a, b, mid, html}], .total = uses
  function windows(text, forms, width = 110, max = Infinity, chains = []) {
    const hits = usesOf(text, forms, chains);
    const snips = [];
    snips.total = hits.length;
    // each window starts where the last one ended (10-08: a window's left context reached back into the one before, so the same
    // sentence was printed twice in a row)
    let end = 0;
    for (let i = 0; i < hits.length && snips.length < max;) {
      let a = Math.max(end, hits[i][0] - width), b = Math.min(text.length, hits[i][1] + width), j = i;
      while (j + 1 < hits.length && hits[j + 1][0] < b) { j++; b = Math.min(text.length, Math.max(b, hits[j][1] + 40)); }
      if (a > 0) { const sp = text.indexOf(' ', a); if (sp > 0 && sp < hits[i][0]) a = sp + 1; }
      if (b < text.length) { const sp = text.lastIndexOf(' ', b); if (sp > hits[j][1]) b = sp; }
      let html = a > 0 ? '… ' : '', at = a;
      for (let h = i; h <= j; h++) { html += esc(text.slice(at, hits[h][0])) + '<mark>' + esc(text.slice(hits[h][0], hits[h][1])) + '</mark>'; at = hits[h][1]; }
      html += esc(text.slice(at, b)) + (b < text.length ? ' …' : '');
      snips.push({ a, b, mid: (hits[i][0] + hits[j][1]) / 2, html, n: j - i + 1 }); end = b; i = j + 1;
    }
    return snips;
  }
  // the text round a place (a share of the way through it), cut at spaces: an English passage beside an original one
  function around(text, share, width) {
    if (!text) return '';
    const c = Math.round(Math.max(0, Math.min(1, share)) * text.length);
    let a = Math.max(0, c - width), b = Math.min(text.length, c + width);
    if (a > 0) { const sp = text.indexOf(' ', a); if (sp > 0 && sp < c) a = sp + 1; }
    if (b < text.length) { const sp = text.lastIndexOf(' ', b); if (sp > c) b = sp; }
    return (a > 0 ? '… ' : '') + esc(text.slice(a, b)) + (b < text.length ? ' …' : '');
  }
  /** Every use on a page, each with its English (or, for a use found in the English, its original): [{o, e}] of html.
      forms/chains: the words and phrases looked for (in either lane); enForms/enChains: English ones, looked for in the English. */
  function pair(lane, { forms = [], chains = [], enForms = [], enChains = [], width = 110 } = {}) {
    const o = lane.o || '', e = lane.e || '';
    const ow = windows(o, forms, width, Infinity, chains), ew = windows(e, [].concat(forms, enForms), width + 30, Infinity, [].concat(chains, enChains));
    // each original use takes the nearest English use not yet taken (by place on the page); with none left, the English there
    const used = new Set();
    const near = (list, len, share) => list.filter(w => !used.has(w)).reduce((best, w) => (!best || Math.abs(w.mid / len - share) < Math.abs(best.mid / len - share) ? w : best), null);
    if (ow.length) return ow.map(w => {
      const share = w.mid / o.length, m = ew.length ? near(ew, e.length, share) : null;
      if (m) used.add(m);
      return { o: w.html, e: m ? m.html : around(e, share, width + 60) };
    });
    if (ew.length) return ew.map(w => ({ o: o ? around(o, w.mid / e.length, width + 20) : '', e: w.html, inEnglish: true }));
    return [];
  }
  /** THE PAGE'S BEST PASSAGE (2026-10-08, owner: one passage per page, its count beside it, "not every use"): the window that holds
      the most uses, in the original where it has any, else in the English, and the other lane at the same place beside it.
      {o, e, uses} of html (uses: every use on the page), or null when neither lane holds a use. */
  function best(lane, { forms = [], chains = [], enForms = [], enChains = [], width = 140 } = {}) {
    const o = lane.o || '', e = lane.e || '';
    const ow = windows(o, forms, width, Infinity, chains), ew = windows(e, [].concat(forms, enForms), width + 30, Infinity, [].concat(chains, enChains));
    const top = list => list.reduce((b, w) => (!b || w.n > b.n ? w : b), null);
    if (ow.length) {
      const w = top(ow), share = w.mid / o.length;
      const m = ew.length ? ew.reduce((b, x) => (!b || Math.abs(x.mid / e.length - share) < Math.abs(b.mid / e.length - share) ? x : b), null) : null;
      return { o: w.html, e: m ? m.html : around(e, share, width + 60), uses: ow.total };
    }
    if (ew.length) { const w = top(ew); return { o: o ? around(o, w.mid / e.length, width + 20) : '', e: w.html, uses: ew.total, inEnglish: true }; }
    return null;
  }
  window.FRWordPreview = { pages, lanes, pair, best, kwic, cut, key };
})();
