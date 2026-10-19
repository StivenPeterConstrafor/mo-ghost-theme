/* COMMENTARY AND RECEPTION BESIDE THE TEXT (2026-10-18; owner: "make reading the bible and looking at these landmark commentaries as
   seamless as logos"; 10-19: "this should be THE go to resource for reception history for every scripture … just fix it").
   On the Scripture page by default (?pane=0 turns it off for the tab).

   The chapter's own text on the left; beside it one rail, half the width, with three views of the verse being read, in this order
   (10-19, owner: Citations first, "design wise, it should be like the citation"; every view is set like the Citations view: a small
   label over a large heading, thin-ruled rows, italic work titles over a muted author and century line, no box that scrolls):
     Citations   every use of the verse (the site's own verse panel), filterable by kind. The rail opens here.
     Commentary  one chosen commentary, following the reader: the verse at the reading line (or the verse clicked) brings it to
                 ITS note on that verse, read from its page, the note marked (commentary-anchor.js: never the place where the
                 commentary merely prints the verse); else its next note, or its closest earlier one, said plainly.
     Reception   the verse's reception history from the pages: how many works cite it and from when, the century strip, the
                 commentaries with a note on it (each opens in the Commentary view), then each era's witnesses, oldest first.

   Where the places come from (nothing here guesses):
     - own notes: the chapter file's exegesis rows (v1/bible/all/<book>/<ch>.json.gz, "Its note on this verse");
     - chapter openings: the commentary map (v1/devotion.json.gz, `an`: chapter → page);
     - collections not on the map as verse notes (the Critici Sacri, 1698): v1/bible/commentary-overlay.json;
     - the reception history: v1/reception/scripture/<book>/<ch>.json (runs/reception_1015), every page that cites the verse. */
(function () {
  'use strict';
  // On unless ?pane=0 (in the address as the page was opened: Mere Orthodoxy's reader rewrites its address before this runs, so the
  // navigation entry is read too), which keeps it off for this tab; ?pane=1 turns it back on.
  const opened = ((performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {}).name || '';
  const asked = (rx) => rx.test(location.search) || rx.test(opened);
  let on = true;
  try {
    if (asked(/[?&]pane=0\b/)) sessionStorage.setItem('fr_cp_off', '1');
    if (asked(/[?&]pane=1\b/)) sessionStorage.removeItem('fr_cp_off');
    if (sessionStorage.getItem('fr_cp_off') === '1') on = false;
  } catch (_) { on = !asked(/[?&]pane=0\b/); }
  if (window.FR_COMMENTARY_PANE === false) on = false;
  if (!on) return;
  /* ONE PANE, TWO SITES (2026-10-18, owner: "yes to all and send to ian"). The same file runs on The Faith Received's Scripture page
     (/bible, hash addresses #b/<book>/<ch>) and on Mere Orthodoxy's (/the-faith-received/scripture/?ref=<book>.<ch>.<v>, the theme's
     window.MOScriptureDev); each site differs only in where its verses, layout and data are. */
  const SITE = (() => {
    const mo = window.MOScriptureDev || document.querySelector('[data-sd-reader]');
    if (mo) {
      const lm = document.querySelector('meta[name="tfr-library-base"]');
      const S = () => window.MOScriptureDev || {};
      return {
        name: 'mo',
        base: ((lm && lm.content) || 'https://mo-tfr-library.mo-podcast-feed.workers.dev').replace(/\/$/, ''),
        where() {
          const q = new URLSearchParams(location.search).get('ref');
          const r = (q && S().parseRef && S().parseRef(q)) || (S().legacyRef && S().legacyRef(location));
          return r && r.book ? { book: r.book.lib, ch: String(r.c), v: r.v || 0, name: r.book.name, bk: r.book } : null;
        },
        read: (slug, p) => (S().sourceHref ? S().sourceHref(`/read?w=${slug}#b${p}-0`, slug, p) : `/the-faith-received/read/?w=${encodeURIComponent(slug)}#b${p}-0`),
        layout: '.sd-layout', side: '.sd-side', verses: '.bible-verse[data-v]',
        vnum: (el) => +el.dataset.v, clicked(t) { const b = t.closest('.bible-verse[data-v]'); return b ? +b.dataset.v : 0; },
        verseEl: (v) => document.querySelector(`.bible-verse[data-v="${v}"]`),
        pick: (v) => document.querySelector(`.bible-verse[data-v="${v}"]`),
        heatEl: (v) => document.querySelector(`.bible-verse[data-v="${v}"]`),
      };
    }
    return {
      name: 'tfr',
      base: 'https://0ss8v4l06kodnhp0.public.blob.vercel-storage.com',
      where() {
        const m = /#b\/([a-z0-9-]+)\/(\d+)(?:\?v=(\d+))?/.exec(location.hash);
        const h = document.querySelector('.scripture-chapter-title, main h1');
        return m ? { book: m[1], ch: m[2], v: +(m[3] || 0), name: ((h && h.textContent) || '').replace(/\s+\d+\s*$/, '').trim() } : null;
      },
      read: (slug, p) => `/read?w=${encodeURIComponent(slug)}#b${p}-0`,
      layout: '.scripture-reader-layout', side: '.scripture-verse-summary', verses: '.scripture-verse-wrap[id^="v"]',
      vnum: (el) => +el.id.slice(1), clicked(t) { const b = t.closest('[data-select-verse]'); return b ? +b.dataset.selectVerse : 0; },
      verseEl: (v) => document.getElementById(`v${v}`),
      pick: (v) => document.querySelector(`[data-select-verse="${v}"]`),
      heatEl: (v) => document.getElementById(`v${v}`),
    };
  })();
  document.documentElement.classList.add(`cp-site-${SITE.name}`);
  const BASE = SITE.base;
  // The landmark sets first, in the order a reader of the tradition reaches for them; then the rest by how many verses they annotate.
  const LANDMARKS = ['Cornelius a Lapide', 'Matthew Poole', 'Critici Sacri', 'Denys the Carthusian', 'Walafrid Strabo', 'Willem van Est',
    'Abraham Calov', 'Westminster Assembly', 'John Calvin', 'Johannes Cocceius', 'Hugo Grotius', 'John Wesley', 'Adam Clarke',
    'Joseph Benson', 'John Trapp', 'Johannes Piscator', 'Thomas Coke'];
  const cache = new Map();
  // Poole's sigla ("Be." Beza, "Pi." Piscator …), from each volume's own Catalogus Auctorum, carried in the overlay
  const SIGLA = {};
  const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function siglaOf(slug) {
    const sg = SIGLA[slug]; if (!sg) return null;
    const keys = Object.keys(sg).filter((k) => k.length >= 3).sort((a, b) => b.length - a.length);
    if (!keys.length) return null;
    return { sg, rx: new RegExp(`(^|[\\s;,(\\]])(${keys.map(reEsc).join('|')})(?=[\\s;,.)\\]]|$)`, 'g') };
  }
  const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // JSON, gzipped or not: Blob serves the .json.gz bytes, Mere Orthodoxy's library worker serves them already opened
  function json(u) {
    if (cache.has(u)) return cache.get(u);
    const p = fetch(u, { credentials: 'omit' }).then(async (r) => {
      if (!r.ok) throw new Error(u);
      const buf = new Uint8Array(await r.arrayBuffer());
      const text = buf[0] === 0x1f && buf[1] === 0x8b
        ? await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
        : new TextDecoder().decode(buf);
      return JSON.parse(text);
    });
    p.catch(() => { if (cache.get(u) === p) cache.delete(u); }); // a failed fetch is tried again, not remembered
    cache.set(u, p); return p;
  }
  const gz = json;
  const where = () => SITE.where();

  // ── the commentaries on this chapter ──────────────────────────────────────────────────────────────────────────────────────
  async function commentaries(book, ch) {
    const [file, dev, ov] = await Promise.all([
      gz(`${BASE}/v1/bible/all/${book}/${ch}.json.gz`).catch(() => null),
      gz(`${BASE}/v1/devotion.json.gz`).catch(() => null),
      json(`${BASE}/v1/bible/commentary-overlay.json`).catch(() => null)]);
    const by = new Map();
    const take = (slug, a, t) => {
      if (!by.has(slug)) by.set(slug, { slug, a: a || '', t: t || slug, notes: {}, open: null });
      return by.get(slug);
    };
    const rowsBy = new Map(); // work → verse → the rows that discuss it (not the ones that merely print it): where a note can be looked for
    for (const v of (file && file.verses) || []) {
      for (const r of v.rows || []) if (r.w && !S.meta[r.w]) S.meta[r.w] = { a: r.a || '', t: r.t || r.w };
      for (const r of v.rows || []) if (r.w && (r.how === 'explicit' || r.how === 'exegesis') && +r.p > 0) {
        if (!rowsBy.has(r.w)) rowsBy.set(r.w, {});
        const byV = rowsBy.get(r.w); (byV[v.v] || (byV[v.v] = [])).push({ w: r.w, how: r.how, g: r.g, p: r.p });
      }
      for (const r of v.rows || []) if (r.how === 'exegesis' && /note on this verse/i.test(r.g || '')) {
        const c = take(r.w, r.a, r.t); if (!(v.v in c.notes)) c.notes[v.v] = r.p;
      }
    }
    for (const e of ((dev && dev.books && dev.books[book]) || [])) {
      S.meta[e.w] = { a: e.a || '', t: e.st || e.t || e.w };
      if (+ch < (e.c1 || 1) || +ch > (e.c2 || 999)) continue;
      const c = take(e.w, e.a, e.t);
      if (e.an && e.an[ch] != null) { c.open = e.an[ch]; if (e.an[String(+ch + 1)] != null) c.close = e.an[String(+ch + 1)]; }
    }
    for (const [slug, w] of Object.entries((ov && ov.works) || {})) if (w.sigla) SIGLA[slug] = w.sigla;
    for (const [slug, w] of Object.entries((ov && ov.works) || {})) {
      const x = w.books && w.books[book] && w.books[book][ch]; if (!x) continue;
      const c = take(slug, w.a, w.t); c.open = x.p; Object.assign(c.notes, x.v || {}); c.overlay = true;
      if (x.c) { c.collected = x.c; for (const v of Object.keys(x.c)) if (!(v in c.notes)) c.notes[v] = x.c[v][0][1]; }
      if (x.pv) c.pv = Object.assign(c.pv || {}, x.pv); // the verse as the work prints it, where its numbering counts a psalm's title
    }
    const rank = (a) => { const i = LANDMARKS.indexOf(a); return i < 0 ? 99 : i; };
    for (const c of by.values()) c.rows = rowsBy.get(c.slug) || {};
    return [...by.values()].filter((c) => Object.keys(c.notes).length || c.open != null)
      .sort((x, y) => rank(x.a) - rank(y.a) || Object.keys(y.notes).length - Object.keys(x.notes).length || x.a.localeCompare(y.a));
  }

  // ── a commentary page ─────────────────────────────────────────────────────────────────────────────────────────────────────
  async function page(slug, n) {
    const meta = await json(`${BASE}/v1/works/${slug}/meta.json`);
    const last = meta.n_pages || (meta.shards && meta.shards.length && meta.shards[meta.shards.length - 1].to);
    if (!(meta.shards || []).length && meta.has_tei) {
      // a born-digital edition (Calvin's commentaries …) is held as TEI only: its pages are the <pb n> breaks
      const lanes = await teiPages(slug, meta);
      const p = { n, en: (lanes.en.get(String(n)) || []).join('\n'), la: (lanes.la.get(String(n)) || []).join('\n') };
      return { meta, p: p.en || p.la ? p : null, last };
    }
    const shard = (meta.shards || []).find((s) => s.from <= n && n <= s.to);
    const d = shard ? await json(`${BASE}/v1/works/${slug}/${shard.file}`) : await json(`${BASE}/v1/works/${slug}/work.json`);
    const p = (d.pages || []).find((x) => +x.n === +n);
    return { meta, p, last };
  }
  function teiPages(slug, meta) {
    const k = `tei:${slug}`;
    if (!cache.has(k)) cache.set(k, (async () => {
      const read = async (lane) => {
        const m = new Map();
        try {
          const r = await fetch(`${BASE}/v1/works/${slug}/tei.${lane}.xml?v=${meta.tei_v || ''}`); if (!r.ok) return m;
          const doc = new DOMParser().parseFromString(await r.text(), 'application/xml');
          let cur = '0';
          for (const el of doc.querySelectorAll('body *')) {
            const tag = el.localName;
            if (tag === 'pb') cur = String(+el.getAttribute('n') || el.getAttribute('n'));
            else if ((tag === 'p' || tag === 'head') && !el.closest('note')) { const t = el.textContent.replace(/\s+/g, ' ').trim(); if (t) { if (!m.has(cur)) m.set(cur, []); m.get(cur).push(t); } }
          }
        } catch (_) {}
        return m;
      };
      const [en, la] = await Promise.all([read('en'), meta.en_only ? Promise.resolve(new Map()) : read('la')]);
      return { en, la };
    })());
    return cache.get(k);
  }
  const paragraphs = (t) => String(t || '').replace(/\[\^[^\]]*\]/g, '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
  // a verse's note opens its paragraph: "12. PROPTEREA…", "Vers. 12.", "V. 12", "Verse 12."
  const noteRx = (v) => new RegExp(`^(?:ver(?:s(?:e|us)?)?\\.?\\s*|v\\.\\s*)?\\(?${v}\\b\\s*[.:,)\\]]`, 'i');

  // ── the reception history of the verse ────────────────────────────────────────────────────────────────────────────────────
  const recOf = (book, ch) => json(`${BASE}/v1/reception/scripture/${book}/${ch}.json`).catch(() => null);
  const ERA = { fathers: ['The Fathers', 'to 600'], 'early-medieval': ['Early Middle Ages', '600–1100'],
    scholastic: ['High and late Middle Ages', '1100–1500'], reformation: ['Reformation', '1500–1600'],
    '17th': ['Seventeenth century', '1600–1700'], '18th': ['Eighteenth century', '1700–1800'], modern: ['Since 1800', ''] };
  const ord = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
  const fmt = (n) => Number(n || 0).toLocaleString('en-US');
  const VERB = { quotation: 'quotes it', explicit: 'cites it', allusion: 'alludes to it', exegesis: 'expounds it' };
  const rankOf = (a) => { const i = LANDMARKS.indexOf(a); return i < 0 ? 99 : i; };
  // a page's one-line gist, as the reception file carries it (cut at about 170 characters): ended where it ends, else marked as cut
  const gist = (g) => { const t = String(g || '').trim(); if (/[.!?)\]"'”’]$/.test(t)) return t; const u = t.length > 200 ? t.slice(0, 200) : t; return `${u.replace(/[\s,;:]+\S*$/, '')}…`; };
  const centuryOf = (slug) => { const n = S.cen[slug], f = (window.MOScriptureDev || {}).centuryLabel; return n && f ? f(n) : ''; };
  const dot = ' · ';

  // ── the pane ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // The rail opens on Citations (10-19, owner), and no longer remembers the last view: the old fr_cp_tab key is cleared. Below
  // 900px the page's own verse panel sits under the text and the rail is a sheet, so there the sheet has two views and opens on
  // the Commentary.
  const wide = matchMedia('(min-width: 900px)');
  const firstTab = () => (SITE.name === 'mo' && wide.matches ? 's' : 'c');
  try { localStorage.removeItem('fr_cp_tab'); } catch (_) {}
  const S = { list: [], cur: null, verse: null, follow: store.get('fr_cp_follow', '1') === '1', lang: store.get('fr_cp_lang', 'en'),
    shown: null, token: 0, meta: {}, cen: {}, rec: null, pin: false, tab: firstTab() };
  const A = window.FRCommentaryAnchor;
  let pane, layout, observer;

  function build() {
    layout = document.querySelector(SITE.layout);
    if (!layout || layout.querySelector('.cp-pane')) return !!layout;
    document.body.classList.add('cp-on');
    pane = document.createElement('aside');
    pane.className = 'cp-pane'; pane.setAttribute('aria-label', 'Commentary beside the text');
    pane.innerHTML = `
      <header class="cp-top"><p class="cp-eyebrow">Commentary</p><h2 class="cp-ref"></h2></header>
      <div class="cp-head">
        <div class="cp-pickwrap">
          <div class="cp-cur"><div class="cp-cur-id"><span class="cp-what"></span><span class="cp-who">Commentary</span></div>
            <button type="button" class="cp-pick" aria-expanded="false" aria-controls="cpList">Change</button></div>
          <ol class="cp-list" id="cpList" hidden></ol>
        </div>
        <div class="cp-lang" role="group" aria-label="Language of the commentary">
          <button type="button" data-lang="en">English</button><span aria-hidden="true">·</span><button type="button" data-lang="la">Latin</button>
        </div>
      </div>
      <p class="cp-where" aria-live="polite"></p>
      <div class="cp-body"></div>
      <div class="cp-rec" aria-live="polite"></div>
      <div class="cp-foot">
        <label class="cp-follow"><input type="checkbox"> Follow the text</label>
        <span class="cp-pages"><button type="button" data-step="-1">Previous page</button><button type="button" data-step="1">Next page</button></span>
      </div>`;
    layout.appendChild(pane);
    // the pane needs room: widen the column the reader sits in while it is open (the text keeps its measure)
    for (let a = layout; a && a !== document.body; a = a.parentElement) {
      const mw = parseFloat(getComputedStyle(a).maxWidth);
      if (mw && mw < 1300) { a.dataset.cpMw = a.style.maxWidth || ''; a.style.maxWidth = 'min(1380px, 100%)'; }
    }
    const tabs = document.createElement('div');
    tabs.className = 'cp-tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Beside the text');
    tabs.innerHTML = SITE.name === 'mo'
      ? '<button type="button" data-tab="s">Citations</button><button type="button" data-tab="c">Commentary</button><button type="button" data-tab="r">Reception</button>'
      : '<button type="button" data-tab="c">Commentary</button><button type="button" data-tab="r">Reception</button><button type="button" data-tab="s">Citations</button>';
    pane.prepend(tabs);
    layout.addEventListener('click', (e) => {
      const b = e.target.closest('.cp-tabs [data-tab]'); if (b) return setTab(b.dataset.tab);
      const vb = e.target.closest('.cp-rec [data-cp-verse]'); if (vb) { e.preventDefault(); return select(+vb.dataset.cpVerse); }
      const ob = e.target.closest('.cp-rec [data-cp-open]'); if (ob) { e.preventDefault(); return openNote(ob.dataset.cpOpen, +ob.dataset.cpP); }
      const more = e.target.closest('.cp-rec .cp-more');
      if (more) { more.parentElement.querySelectorAll('li[hidden]').forEach((li) => { li.hidden = false; }); more.remove(); return; }
      const ex = e.target.closest('.cp-expand');
      if (ex) { const f = ex.parentElement.querySelector(`.cp-fold[data-cp-fold="${ex.dataset.cpExpand}"]`); if (f) f.hidden = false; ex.remove(); }
    });
    pane.querySelector('.cp-follow input').checked = S.follow;
    pane.querySelector('.cp-follow input').onchange = (e) => { S.follow = e.target.checked; store.set('fr_cp_follow', S.follow ? '1' : '0'); if (S.follow && S.verse) show(S.verse); };
    pane.querySelectorAll('.cp-lang button').forEach((b) => { b.onclick = () => { S.lang = b.dataset.lang; store.set('fr_cp_lang', S.lang); paint(); }; });
    const pick = pane.querySelector('.cp-pick'), list = pane.querySelector('.cp-list');
    pick.onclick = () => { const open = list.hidden; list.hidden = !open; pick.setAttribute('aria-expanded', String(open)); pick.textContent = open ? 'Close' : 'Change'; };
    const closeList = () => { list.hidden = true; pick.setAttribute('aria-expanded', 'false'); pick.textContent = 'Change'; };
    list.onclick = (e) => { const li = e.target.closest('[data-slug]'); if (!li) return; choose(li.dataset.slug); closeList(); };
    pane.querySelectorAll('.cp-pages button').forEach((b) => { b.onclick = () => step(+b.dataset.step); });
    wide.addEventListener('change', () => setTab(S.tab, true));
    setTab(S.tab, true);
    return true;
  }

  // the rail's three views; Citations is the site's own verse panel, shown in the rail's place
  function setTab(t, quiet) {
    S.tab = t;
    pane.dataset.tab = t;
    // On a wide screen Citations is the page's sidebar, shown in the rail's place. On a phone the sidebar is not in the page: the
    // verse panel opens under the verse in the text, so there the sheet shrinks to its tabs and the panel is brought into view.
    const phone = SITE.name === 'mo' && !wide.matches;
    document.body.classList.toggle('cp-src', t === 's' && !phone);
    document.body.classList.toggle('cp-peek', t === 's' && phone);
    if (t === 's' && phone && !quiet) {
      let panel = document.querySelector('.sd-panel');
      if (!panel) { const b = SITE.pick(S.verse || 1); if (b) b.click(); panel = document.querySelector('.sd-panel'); }
      if (panel) panel.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    layout.querySelectorAll('.cp-tabs [data-tab]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tab === t)));
    head();
    if (t === 'r') paintRec();
    if (t === 's' && SITE.name === 'tfr') {
      const side = layout.querySelector(SITE.side), b = SITE.pick(S.verse || 1);
      if (side && side.hidden && b) b.click();
    }
  }
  // the label and the large heading over each view, as the Citations view sets its own: "COMMENTARY / Genesis 1:1"
  function head() {
    if (!pane) return;
    const w = where(); if (!w) return;
    const name = w.name || w.book.replace(/-/g, ' ');
    pane.querySelector('.cp-eyebrow').textContent = S.tab === 'r' ? 'Reception history' : (S.verse ? 'Commentary on this verse' : 'Commentary');
    pane.querySelector('.cp-ref').textContent = S.verse ? `${name} ${w.ch}:${S.verse}` : `${name} ${w.ch}`;
  }
  // a verse chosen from the rail: as if clicked in the text (the site's panel follows), brought to the reading line
  function select(v) {
    const b = SITE.pick(v), el = SITE.verseEl(v);
    S.pin = true;
    if (el) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (b) b.click(); else show(v, true);
  }
  // a commentary's note on the verse, from the Reception view: that commentary, at that note, in the Commentary view
  function openNote(slug, p) {
    let c = S.list.find((x) => x.slug === slug);
    if (!c) {
      const m = S.meta[slug] || {};
      c = { slug, a: m.a || '', t: m.t || slug, notes: {}, rows: {}, open: null }; S.list.push(c);
    }
    if (!(S.verse in c.notes)) c.notes[S.verse] = p;
    S.pin = true;
    setTab('c'); choose(slug);
  }

  function paintRec() {
    const box = pane && pane.querySelector('.cp-rec'), w = where(); if (!box || !w) return;
    const {rec} = S, n = S.verse || 1, rv = rec && rec.verses && rec.verses[String(n)];
    const name = w.name || w.book.replace(/-/g, ' ');
    const all = Object.entries((rec && rec.verses) || {}).map(([k, x]) => [+k, x.works || 0]);
    const most = all.slice().sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 6);
    const top = Math.max(1, ...most.map(([, x]) => x));
    // the most cited verses of the chapter: the rows the Citations view uses, a verse and a meter and a count
    const mostHTML = most.length ? `<h3 class="cp-h3">Most cited verses</h3><ol class="cp-top-list" aria-label="Most cited verses of ${esc(name)} ${esc(w.ch)}">${most.map(([k, x]) =>
      `<li><button type="button" class="cp-verse-row" data-cp-verse="${k}"${k === n ? ' aria-current="true"' : ''}><span class="cp-vr-ref">${esc(w.ch)}:${k}</span>`
      + `<span class="cp-meter" aria-hidden="true"><i style="width:${Math.max(3, Math.round((x / top) * 100))}%"></i></span><span class="cp-vr-n">${fmt(x)}</span></button></li>`).join('')}</ol>` : '';
    if (!rec) { box.innerHTML = '<p class="cp-empty">The reception history of this chapter is not yet available.</p>'; return; }
    if (!rv) { box.innerHTML = `<p class="cp-empty">No page in the library cites this verse yet.</p>${mostHTML}`; return; }
    const strip = rv.strip || [];
    const ns = Object.entries(rv.notes || {}).map(([slug, p]) => {
      const c = S.list.find((x) => x.slug === slug) || S.meta[slug] || {};
      return { slug, p, a: c.a || '', t: c.t || slug };
    }).sort((x, y) => rankOf(x.a) - rankOf(y.a) || x.a.localeCompare(y.a));
    const tiles = `<div class="cp-stats"><div class="cp-stat"><b>${fmt(rv.works)}</b><span>${rv.works === 1 ? 'work cites it' : 'works cite it'}</span></div>`
      + `<div class="cp-stat"><b>${fmt(ns.length)}</b><span>${ns.length === 1 ? 'commentary on it' : 'commentaries on it'}</span></div></div>`;
    const span = strip.length ? `<p class="cp-lede">From the ${ord(strip[0][0])} century to the ${ord(strip[strip.length - 1][0])}.</p>` : '';
    let bars = '';
    if (strip.length >= 2) {
      const max = Math.max(...strip.map(([, k]) => k)), by = new Map(strip), cols = [];
      for (let c = strip[0][0]; c <= strip[strip.length - 1][0]; c += 1) {
        const k = by.get(c) || 0, tip = `${ord(c)} century: ${fmt(k)} ${k === 1 ? 'work' : 'works'}`;
        cols.push(`<li${k ? '' : ' class="is-zero"'} style="--k:${k ? Math.max(0.08, Math.sqrt(k / max)).toFixed(3) : 0}" title="${tip}"><span class="cp-bar"></span><small aria-hidden="true">${c}</small><span class="cp-sr">${tip}</span></li>`);
      }
      bars = `<figure class="cp-rec-strip"><ol>${cols.join('')}</ol><figcaption>Works citing it, by century</figcaption></figure>`;
    }
    const notes = ns.length ? `<h3 class="cp-h3">Commentaries on this verse</h3><ol class="cp-rows">${ns.map((c) =>
      `<li class="cp-row-li"><button type="button" class="cp-row" data-cp-open="${esc(c.slug)}" data-cp-p="${esc(c.p)}" title="Read beside the text"><span class="cp-row-t">${esc(c.t)}</span><span class="cp-row-m">${esc(c.a)}</span></button>`
      + `<a class="cp-row-pg" href="${esc(SITE.read(c.slug, c.p))}" aria-label="${esc(`${c.a || c.t}, page ${c.p}, in the reader`)}">p. ${esc(c.p)}</a></li>`).join('')}</ol>` : '';
    const SHOW = 4, byYear = (a, b) => (a.y || 9999) - (b.y || 9999);
    const wit = (x, hid) => `<li class="cp-row-li cp-wit"${hid ? ' hidden' : ''}><a class="cp-row-t" href="${esc(SITE.read(x.w, x.p))}">${esc(x.t || x.w)}</a>`
      + `<span class="cp-row-m">${[x.a || x.w, x.d ? x.d : (x.y ? `fl. c. ${x.y}` : ''), `p. ${x.p}`, VERB[x.how] || 'cites it'].filter(Boolean).map(esc).join(dot)}</span>`
      + `${x.g && !(x.commentary && x.how === 'exegesis') ? `<span class="cp-w-g">${esc(gist(x.g))}</span>` : ''}</li>`;
    const eras = (rv.eras || []).map((e) => {
      const [label, years] = ERA[e.id] || [e.label, ''];
      const xs = (e.top || []).slice().sort(byYear);
      return `<li class="cp-era"><h4 class="cp-era-h">${esc(label)} <small>${years ? `${esc(years)}${dot}` : ''}${fmt(e.works)} ${e.works === 1 ? 'work' : 'works'}</small></h4>`
        + `<ul class="cp-rows">${xs.map((x, j) => wit(x, j >= SHOW)).join('')}</ul>${xs.length > SHOW ? `<button type="button" class="cp-more">Show ${fmt(xs.length - SHOW)} more</button>` : ''}`
        + `${e.more ? `<p class="cp-era-more">${fmt(e.more)} more ${e.more === 1 ? 'author' : 'authors'} in this period (Citations lists every use).</p>` : ''}</li>`;
    }).join('');
    box.innerHTML = `${tiles}${span}${bars}${notes}`
      + `${eras ? `<h3 class="cp-h3">Through the centuries</h3><ol class="cp-eras">${eras}</ol>` : ''}${mostHTML}`
      + '<p class="cp-rec-foot">Every page in the library that cites the verse, dated by its author\'s life.</p>';
  }
  // each verse number carries how much reception it has (a quiet mark in the text: four steps of the chapter's own range)
  function heat() {
    const vs = (S.rec && S.rec.verses) || {}, max = Math.max(1, ...Object.values(vs).map((x) => x.works || 0));
    for (const [k, x] of Object.entries(vs)) {
      const el = SITE.heatEl(+k); if (!el) continue;
      const r = Math.sqrt((x.works || 0) / max);
      el.dataset.cpHeat = r > 0.75 ? '4' : r > 0.5 ? '3' : r > 0.28 ? '2' : x.works ? '1' : '0';
    }
  }

  function fillList() {
    const list = pane.querySelector('.cp-list');
    const land = S.list.filter((c) => LANDMARKS.includes(c.a)), rest = S.list.filter((c) => !LANDMARKS.includes(c.a));
    const li = (c) => `<li class="cp-row-li" data-slug="${esc(c.slug)}"><button type="button" class="cp-row" aria-pressed="${!!(S.cur && S.cur.slug === c.slug)}">`
      + `<span class="cp-row-t">${esc(c.t)}</span><span class="cp-row-m">${[c.a, centuryOf(c.slug), Object.keys(c.notes).length ? `${Object.keys(c.notes).length} verse notes` : 'chapter'].filter(Boolean).map(esc).join(dot)}</span></button></li>`;
    list.innerHTML = (land.length ? `<li class="cp-li-h" role="presentation">Landmark commentaries</li>${land.map(li).join('')}` : '')
      + (rest.length ? `<li class="cp-li-h" role="presentation">Also on this chapter</li>${rest.map(li).join('')}` : '')
      || '<li class="cp-li-h" role="presentation">No commentary on this chapter yet</li>';
  }

  function nameCur() {
    pane.querySelector('.cp-who').textContent = S.cur ? [S.cur.a, centuryOf(S.cur.slug)].filter(Boolean).join(dot) || 'Commentary' : 'No commentary';
    pane.querySelector('.cp-what').textContent = S.cur ? S.cur.t : '';
  }
  function choose(slug) {
    S.cur = S.list.find((c) => c.slug === slug) || S.list[0] || null;
    if (S.cur) store.set('fr_cp_author', S.cur.a);
    nameCur();
    fillList();
    S.shown = null;
    if (!S.cur) { paint(); return; }
    show(S.verse || 1, true);
  }

  // ── where a commentary opens on a verse ───────────────────────────────────────────────────────────────────────────────────
  // In this order, and each says in the status line which it is:
  //   note     the library indexed the commentary's own note on the verse (or a collection holds it), or its page text carries one
  //            (a "Vers. 12." paragraph, never the run of numbered lines that reprints the chapter);
  //   page     the library files a page as discussing the verse, between the notes on the verses on either side, but the heading
  //            was not found: that page, said to be a page;
  //   later    the commentary's next note after the verse (within four verses);
  //   nearest  its closest note before (within twelve);   later again, within twelve;
  //   chapter  where the commentary opens the chapter, said to be only that.
  // Lapide on Genesis 1:1 used to open at vol. 1 p. 75, "the chapter's opening" by the devotion map: the first page of an essay on
  // the days of creation printed in his volume, which begins with the text of verses 24 to 28, with "no verse notes found".
  const paraKey = (slug, n) => `para:${slug}:${n}`;
  function parasOf(slug, n) { // a page's paragraphs in both lanes: the English if it has one, and the Latin
    const k = paraKey(slug, n);
    if (!cache.has(k)) {
      // a page that is not there is remembered as empty; a page that failed to load is not (it is asked for again)
      cache.set(k, page(slug, n).then((g) => (g && g.p ? [paragraphs(g.p.en), paragraphs(g.p.la)] : [[], []])).catch(() => { cache.delete(k); return [[], []]; }));
    }
    return cache.get(k);
  }
  const resolver = A ? A.createResolver(parasOf, { verseText: (v) => { const el = SITE.verseEl(v); return el ? el.textContent : ''; } }) : null;
  // the work's own first (collected) or indexed target, with no page to read
  function quickTarget(v) {
    const c = S.cur; if (!c) return null;
    if (c.collected) {
      if (c.collected[v]) return { p: c.collected[v][0][1], how: 'collected', v, items: c.collected[v] };
      const next = Object.keys(c.collected).map(Number).filter((x) => x > v).sort((a, b) => a - b)[0];
      const prev = Object.keys(c.collected).map(Number).filter((x) => x < v).sort((a, b) => b - a)[0];
      const x = next != null ? next : prev;
      if (x != null) return { p: c.collected[x][0][1], how: 'collected', v: x, items: c.collected[x], nearest: true };
    }
    if (!resolver && c.notes[v] != null) return { p: c.notes[v], how: 'note', v, indexed: true }; // without the resolver, the library's index
    return null;
  }
  async function resolve(c, v, w) {
    if (resolver) return resolver.resolve(c, v, { name: w.name, ch: w.ch });
    return c.open != null ? { p: c.open, how: 'chapter' } : null; // without commentary-anchor.js: the map's opening, said to be only that
  }

  async function show(v, force) {
    S.verse = +v;
    head();
    if (S.tab === 'r') paintRec();
    const w = where(); if (!S.cur || !w) return;
    const tok = ++S.token, cur = S.cur;
    const bodyEl = pane.querySelector('.cp-body'), whereEl = pane.querySelector('.cp-where');
    let t = quickTarget(S.verse);
    if (!t) {
      bodyEl.classList.add('cp-loading');
      whereEl.textContent = `Looking for its note on ${w.name || w.book} ${w.ch}:${S.verse}…`;
      if (!bodyEl.textContent.trim()) bodyEl.innerHTML = '<p class="cp-empty">Looking for the note…</p>';
      try { t = await resolve(cur, S.verse, w); } catch (_) { t = null; }
      if (tok !== S.token) return;
      if (!t && cur.open != null) t = { p: cur.open, how: 'chapter' };
    }
    if (!t) { bodyEl.classList.remove('cp-loading'); S.shown = null; paint(); return; }
    const same = S.shown && S.shown.slug === cur.slug && +S.shown.p === +t.p && S.shown.t.how === t.how && S.shown.t.v === t.v;
    S.shown = { slug: cur.slug, p: +t.p, t, book: w.book, ch: w.ch };
    if (same && !force) return paint(true);
    bodyEl.classList.add('cp-loading');
    // a large volume takes a few seconds to open: say what is coming rather than show an empty page
    if (!bodyEl.textContent.trim() || !same) {
      whereEl.textContent = `Opening ${cur.a || cur.t} on ${w.name || w.book} ${w.ch}:${t.v || S.verse}, p. ${t.p}…`;
      if (!bodyEl.textContent.trim()) bodyEl.innerHTML = '<p class="cp-empty">Opening the page…</p>';
    }
    try {
      if (t.how === 'collected') {
        const ns = [...new Set(t.items.map((x) => +x[1]))];
        const got = await Promise.all(ns.map((n) => page(cur.slug, n).catch(() => null)));
        if (tok !== S.token) return;
        S.shown.byPage = Object.fromEntries(ns.map((n, i) => [n, got[i] && got[i].p]));
        S.shown.pages = got.filter(Boolean).map((g) => g.p);
      } else {
        const [a, b] = await Promise.all([page(cur.slug, +t.p), page(cur.slug, +t.p + 1).catch(() => null)]);
        if (tok !== S.token) return;
        S.shown.pages = [a.p, b && b.p].filter(Boolean); S.shown.last = a.last;
      }
    } catch (_) { if (tok === S.token) { S.shown.pages = []; } }
    paint();
  }

  function step(d) {
    if (!S.shown) return;
    const p = Math.max(1, S.shown.p + d);
    S.follow = false; pane.querySelector('.cp-follow input').checked = false; store.set('fr_cp_follow', '0');
    S.shown = { ...S.shown, p, t: { p, how: 'browse' } };
    Promise.all([page(S.cur.slug, p), page(S.cur.slug, p + 1).catch(() => null)]).then(([a, b]) => {
      S.shown.pages = [a.p, b && b.p].filter(Boolean); paint();
    });
  }

  function paint() {
    const sh = S.shown, body = pane.querySelector('.cp-body'), whereEl = pane.querySelector('.cp-where');
    body.classList.remove('cp-loading');
    pane.querySelectorAll('.cp-lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
    if (!sh) { body.innerHTML = S.cur ? '<p class="cp-empty">This commentary has nothing on the verse to show.</p>' : '<p class="cp-empty">No commentary on this chapter yet.</p>'; whereEl.textContent = ''; return; }
    const bookName = (where() || {}).name || sh.book.replace(/-/g, ' ');
    const {t} = sh, read = SITE.read(sh.slug, sh.p), ref = (n) => `${bookName} ${sh.ch}:${n}`;
    const say = t.how === 'note' ? `Its note on ${ref(t.v)}`
      : t.how === 'page' ? `Its comment on ${ref(t.v)} is on this page`
      : t.how === 'later' ? `No separate note on ${sh.ch}:${S.verse}. Its next note is on ${ref(t.v)}`
      : t.how === 'nearest' ? `No separate note on ${sh.ch}:${S.verse}. Its closest earlier note is on ${ref(t.v)}`
      : t.how === 'chapter' ? `No note on ${ref(S.verse)} was found. This is where it opens ${bookName} ${sh.ch}` : 'Reading on';
    whereEl.innerHTML = `<span>${esc(say)}</span>${dot}<span class="cp-pg">p. ${sh.p}</span>${dot}<a href="${read}">Open in the reader</a>`;
    const pages = sh.pages || [];
    if (!pages.length) { body.innerHTML = '<p class="cp-empty">This page could not be loaded.</p>'; return; }
    if (t.how === 'collected') return paintCollected(sh, t, bookName, body, whereEl);
    const hasEn = pages.some((p) => p.en), lane = S.lang === 'la' || !hasEn ? 'la' : 'en';
    pane.querySelector('.cp-lang').hidden = !(hasEn && pages.some((p) => p.la));
    const printed = (S.cur && S.cur.pv && S.cur.pv[t.v]) || t.v;
    // the pages as one run of paragraphs, so a note that crosses the page break is one note
    const all = [], pageOf = [];
    pages.forEach((p, i) => { paragraphs(p[lane] || p.la || p.en).forEach((s) => { all.push(s); pageOf.push(i); }); });
    let h = -1;
    if (t.how === 'note' || t.how === 'later' || t.how === 'nearest' || t.how === 'page') {
      if (A) h = A.findNote(all, printed, !!t.indexed);
      // a page the library indexed as holding the note keeps the older reading if the stricter one finds none
      if (h < 0 && t.indexed) h = all.findIndex((s) => noteRx(printed).test(s));
    }
    const from = h > 0 ? h : 0;
    const to = h >= 0 ? (A ? A.noteEnd(all, h, printed, 14) : Math.min(all.length, h + 8)) : (t.how === 'browse' ? all.length : Math.min(all.length, 14));
    const sig = siglaOf(sh.slug);
    const withSigla = (txt) => {
      if (!sig) return { html: esc(txt), who: [] };
      const who = [];
      const html = esc(txt).replace(sig.rx, (m0, pre, k) => { const n = sig.sg[k]; if (n && !who.includes(n)) who.push(n); return `${pre}<abbr title="${esc(n)}">${k}</abbr>`; });
      return { html, who };
    };
    const one = (s, i) => {
      const head1 = /^#{1,6}\s+/.test(s); // the page's own heads ("### CAPUT V.") are set as heads, not printed with their marks
      const x = withSigla(head1 ? s.replace(/^#{1,6}\s+/, '') : s);
      const brk = i && pageOf[i] !== pageOf[i - 1] ? `<div class="cp-break"><span>p. ${pages[pageOf[i]].n}</span></div>` : '';
      if (head1) return `${brk}<p class="cp-h">${x.html}</p>`;
      const mark = i === h;
      return `${brk}<p${mark ? ' class="cp-hit" id="cp-hit"' : i > h && h >= 0 && i < to ? ' class="cp-hit-on"' : ''}>${x.html}</p>${mark && x.who.length ? `<p class="cp-sig">Critics cited: ${esc(x.who.join(', '))}</p>` : ''}`;
    };
    const run = (a, b) => all.slice(a, b).map((s, k) => one(s, a + k)).join('');
    body.innerHTML = (from > 0 ? `<button type="button" class="cp-expand" data-cp-expand="before">Earlier on these pages</button><div class="cp-fold" data-cp-fold="before" hidden>${run(0, from)}</div>` : '')
      + (run(from, to) || '<p class="cp-empty">A blank page.</p>')
      + (to < all.length ? `<div class="cp-fold" data-cp-fold="after" hidden>${run(to, all.length)}</div><button type="button" class="cp-expand" data-cp-expand="after">Keep reading</button>` : '');
    document.querySelectorAll('.cp-focus').forEach((e) => e.classList.remove('cp-focus'));
    const vEl = SITE.verseEl(S.verse); if (vEl) vEl.classList.add('cp-focus');
  }

  // a collection (the Critici Sacri): every critic's note on the verse, in the order the volume prints them
  function paintCollected(sh, t, bookName, body, whereEl) {
    const n = t.items.length, crit = new Set(t.items.map((x) => x[0])).size;
    whereEl.innerHTML = `<span>${t.nearest ? `No critic on ${sh.ch}:${S.verse}. ` : ''}${crit} ${crit === 1 ? 'critic' : 'critics'} on ${esc(bookName)} ${sh.ch}:${t.v}</span>`
      + `${dot}<a href="${esc(SITE.read(sh.slug, t.items[0][1]))}">Open in the reader</a>`;
    const anyEn = Object.values(sh.byPage || {}).some((p) => p && p.en), lane = S.lang === 'la' || !anyEn ? 'la' : 'en';
    pane.querySelector('.cp-lang').hidden = !anyEn;
    const rxV = noteRx(t.v);
    const firstOf = new Map(); t.items.forEach(([who], i) => { if (!firstOf.has(who)) firstOf.set(who, i); });
    const idx = `<p class="cp-index">${[...firstOf].map(([who, i]) => `<a href="#cp-c${i}" data-cp-jump="${i}">${esc(who)}</a>`).join(', ')}</p>`;
    body.innerHTML = idx + t.items.map(([who, pn, k, pv], i) => {
      const rx = pv ? noteRx(pv) : rxV; // a critic's own number for the verse, where his numbering counts the psalm's title
      const p = (sh.byPage || {})[pn]; if (!p) return '';
      const pick = (ln) => paragraphs(p[ln]).filter((x) => rx.test(x))[k] || paragraphs(p[ln]).filter((x) => rx.test(x))[0];
      let note = (pick(lane) || pick(lane === 'en' ? 'la' : 'en') || '').replace(/^#{1,6}\s+/, '');
      if (note.length > 1100) note = `${note.slice(0, 1100).replace(/\s+\S*$/, '')} …`;
      return `<section class="cp-crit" id="cp-c${i}"><h4><span>${esc(who)}</span><a href="${esc(SITE.read(sh.slug, pn))}">p. ${pn}</a></h4>`
        + `<p>${note ? esc(note) : '<span class="cp-empty">The note could not be found on its page.</span>'}</p></section>`;
    }).join('');
    body.querySelectorAll('[data-cp-jump]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const s = body.querySelector(`#cp-c${a.dataset.cpJump}`); if (s) s.scrollIntoView({ block: 'start' }); }; });
    document.querySelectorAll('.cp-focus').forEach((e) => e.classList.remove('cp-focus'));
    const vEl = SITE.verseEl(S.verse); if (vEl) vEl.classList.add('cp-focus');
  }

  // ── following the reader ──────────────────────────────────────────────────────────────────────────────────────────────────
  function watch() {
    if (observer) observer.disconnect();
    const seen = new Map();
    observer = new IntersectionObserver((es) => {
      for (const e of es) seen.set(e.target, e.isIntersecting);
      if (!S.follow || S.pin) return;
      const vis = [...seen].filter(([, on]) => on).map(([el]) => el).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const v = vis.length ? SITE.vnum(vis[0]) : null;
      if (v && v !== S.verse) { clearTimeout(watch.t); watch.t = setTimeout(() => show(v), 180); }
    }, { rootMargin: '-22% 0px -68% 0px' });
    document.querySelectorAll(SITE.verses).forEach((el) => observer.observe(el));
  }
  document.addEventListener('click', (e) => {
    const v = SITE.clicked(e.target); if (!v || !pane) return;
    S.pin = true;
    show(v, true);
  });
  // the reader's own scrolling (not the page's scrolling to a chosen verse) hands the rail back to the reading line
  const unpin = (e) => { if (e.type !== 'keydown' || ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) S.pin = false; };
  ['wheel', 'touchmove', 'keydown'].forEach((t) => addEventListener(t, (e) => { if (!pane || !pane.contains(e.target)) unpin(e); }, { passive: true }));

  // the reader redraws its side panel on every verse: give it the switch back to the commentary each time
  function ensureTabs() {
    const side = layout && layout.querySelector(SITE.side), tabs = pane && pane.querySelector('.cp-tabs');
    if (!side || !tabs || side.querySelector('.cp-tabs')) return;
    side.prepend(tabs.cloneNode(true));
    layout.querySelectorAll('.cp-tabs [data-tab]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tab === S.tab)));
  }

  let lastKey = '';
  async function init() {
    const w = where(); if (!w) return;
    const fresh = !document.querySelector('.cp-pane');
    if (!build()) return;
    ensureTabs();
    const key = `${w.book}/${w.ch}`;
    if (key === lastKey && !fresh) {
      // the same chapter drawn again (another translation): follow the new verse elements
      const v1 = document.querySelector(SITE.verses);
      if (v1 && v1 !== S.firstEl) { S.firstEl = v1; watch(); paint(); heat(); }
      return;
    }
    lastKey = key;
    S.rec = null; S.pin = false; // a new chapter: the rail follows the reading line again
    const [list, rec] = await Promise.all([commentaries(w.book, w.ch), recOf(w.book, w.ch)]);
    S.list = list; S.rec = rec;
    heat();
    // the century of each commentary, from the same list the Citations view reads, so the two name a work alike
    const mo = window.MOScriptureDev;
    if (mo && mo.fetchCommentaries && w.bk) {
      mo.fetchCommentaries(w.bk, +w.ch, mo.emptyFilters()).then((d) => {
        for (const e of (d && d.items) || []) if (e.cen) S.cen[e.w] = e.cen;
        if (pane && S.list === list) { fillList(); nameCur(); }
      }).catch(() => {});
    }
    const want = store.get('fr_cp_author', 'Cornelius a Lapide');
    const c = S.list.find((x) => x.a === want) || S.list[0];
    S.verse = w.v || 1;
    head();
    choose(c ? c.slug : null);
    S.firstEl = document.querySelector(SITE.verses);
    watch();
  }
  const kick = () => { clearTimeout(kick.t); kick.t = setTimeout(init, 250); };
  window.addEventListener('hashchange', kick); window.addEventListener('popstate', kick);
  new MutationObserver((ms) => { if (ms.some((m) => !pane || !pane.contains(m.target))) kick(); })
    .observe(document.body, { childList: true, subtree: true });
  kick();
})();
