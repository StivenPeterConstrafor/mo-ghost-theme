/* COMMENTARY BESIDE THE TEXT (prototype, 2026-10-18; owner: "make reading the bible and looking at these landmark commentaries as
   seamless as logos"). Loaded by research_shell.html only with /bible?pane=1; nothing changes for other readers.

   The chapter's own text on the left, one chosen commentary on the right, and the commentary follows the reader: the verse at the
   reading line (or the verse clicked) brings the commentary to ITS note on that verse, read from its page, with the note marked.
   Where the work has no note on the verse it says so and shows the nearest note before it, or the page its chapter opens on.

   Where the places come from (nothing here guesses):
     - own notes: the chapter file's exegesis rows (v1/bible/all/<book>/<ch>.json.gz, "Its note on this verse");
     - chapter openings: the commentary map (v1/devotion.json.gz, `an`: chapter → page);
     - works not yet on the map (the Critici Sacri, 1698): commentary-pane-overlay.json, from the frames (runs/scripture_1018). */
(function () {
  'use strict';
  // The flag: ?pane=1 in the address as the page was opened (Mere Orthodoxy's reader rewrites its address to the canonical one before
  // this runs, so the navigation entry is read too), kept for this tab; ?pane=0 turns it off.
  const opened = ((performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {}).name || '';
  const asked = (rx) => rx.test(location.search) || rx.test(opened);
  try {
    if (asked(/[?&]pane=1\b/)) sessionStorage.setItem('fr_cp_on', '1');
    if (asked(/[?&]pane=0\b/)) sessionStorage.removeItem('fr_cp_on');
  } catch (_) {}
  let on = asked(/[?&]pane=1\b/) || !!window.FR_COMMENTARY_PANE;
  try { on = on || sessionStorage.getItem('fr_cp_on') === '1'; } catch (_) {}
  if (!on || asked(/[?&]pane=0\b/)) return;
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
          return r && r.book ? { book: r.book.lib, ch: String(r.c), v: r.v || 0, name: r.book.name } : null;
        },
        read: (slug, p) => (S().sourceHref ? S().sourceHref(`/read?w=${slug}#b${p}-0`, slug, p) : `/the-faith-received/read/?w=${encodeURIComponent(slug)}#b${p}-0`),
        layout: '.sd-layout', side: '.sd-side', verses: '.bible-verse[data-v]',
        vnum: (el) => +el.dataset.v, clicked(t) { const b = t.closest('.bible-verse[data-v]'); return b ? +b.dataset.v : 0; },
        verseEl: (v) => document.querySelector(`.bible-verse[data-v="${v}"]`),
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
    for (const v of (file && file.verses) || []) {
      for (const r of v.rows || []) if (r.how === 'exegesis' && /note on this verse/i.test(r.g || '')) {
        const c = take(r.w, r.a, r.t); if (!(v.v in c.notes)) c.notes[v.v] = r.p;
      }
    }
    for (const e of ((dev && dev.books && dev.books[book]) || [])) {
      if (+ch < (e.c1 || 1) || +ch > (e.c2 || 999)) continue;
      const c = take(e.w, e.a, e.t);
      if (e.an && e.an[ch] != null) c.open = e.an[ch];
    }
    for (const [slug, w] of Object.entries((ov && ov.works) || {})) if (w.sigla) SIGLA[slug] = w.sigla;
    for (const [slug, w] of Object.entries((ov && ov.works) || {})) {
      const x = w.books && w.books[book] && w.books[book][ch]; if (!x) continue;
      const c = take(slug, w.a, w.t); c.open = x.p; Object.assign(c.notes, x.v || {}); c.overlay = true;
      if (x.c) { c.collected = x.c; for (const v of Object.keys(x.c)) if (!(v in c.notes)) c.notes[v] = x.c[v][0][1]; }
      if (x.pv) c.pv = Object.assign(c.pv || {}, x.pv); // the verse as the work prints it, where its numbering counts a psalm's title
    }
    const rank = (a) => { const i = LANDMARKS.indexOf(a); return i < 0 ? 99 : i; };
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

  // ── the pane ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const S = { list: [], cur: null, verse: null, follow: store.get('fr_cp_follow', '1') === '1', lang: store.get('fr_cp_lang', 'en'),
    shown: null, token: 0 };
  let pane, layout, observer;

  function build() {
    layout = document.querySelector(SITE.layout);
    if (!layout || layout.querySelector('.cp-pane')) return !!layout;
    document.body.classList.add('cp-on');
    pane = document.createElement('aside');
    pane.className = 'cp-pane'; pane.setAttribute('aria-label', 'Commentary beside the text');
    pane.innerHTML = `
      <div class="cp-head">
        <div class="cp-pickwrap">
          <button type="button" class="cp-pick" aria-haspopup="listbox" aria-expanded="false"><span class="cp-who">Commentary</span><span class="cp-what"></span></button>
          <ul class="cp-list" role="listbox" hidden></ul>
        </div>
        <div class="cp-lang" role="group" aria-label="Language of the commentary">
          <button type="button" data-lang="en">English</button><button type="button" data-lang="la">Latin</button>
        </div>
      </div>
      <p class="cp-where" aria-live="polite"></p>
      <div class="cp-body" tabindex="0"></div>
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
    tabs.innerHTML = '<button type="button" data-tab="c" aria-pressed="true">Commentary</button><button type="button" data-tab="s" aria-pressed="false">Who cites this verse</button>';
    pane.prepend(tabs);
    layout.addEventListener('click', (e) => {
      const b = e.target.closest('.cp-tabs [data-tab]'); if (!b) return;
      document.body.classList.toggle('cp-src', b.dataset.tab === 's');
      layout.querySelectorAll('.cp-tabs [data-tab]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tab === b.dataset.tab)));
    });
    pane.querySelector('.cp-follow input').checked = S.follow;
    pane.querySelector('.cp-follow input').onchange = (e) => { S.follow = e.target.checked; store.set('fr_cp_follow', S.follow ? '1' : '0'); if (S.follow && S.verse) show(S.verse); };
    pane.querySelectorAll('.cp-lang button').forEach((b) => { b.onclick = () => { S.lang = b.dataset.lang; store.set('fr_cp_lang', S.lang); paint(); }; });
    const pick = pane.querySelector('.cp-pick'), list = pane.querySelector('.cp-list');
    pick.onclick = () => { const open = list.hidden; list.hidden = !open; pick.setAttribute('aria-expanded', String(open)); };
    document.addEventListener('click', (e) => { if (!pane.contains(e.target)) { list.hidden = true; pick.setAttribute('aria-expanded', 'false'); } });
    list.onclick = (e) => { const li = e.target.closest('[data-slug]'); if (!li) return; choose(li.dataset.slug); list.hidden = true; pick.setAttribute('aria-expanded', 'false'); };
    pane.querySelectorAll('.cp-pages button').forEach((b) => { b.onclick = () => step(+b.dataset.step); });
    return true;
  }

  function fillList() {
    const list = pane.querySelector('.cp-list');
    const land = S.list.filter((c) => LANDMARKS.includes(c.a)), rest = S.list.filter((c) => !LANDMARKS.includes(c.a));
    const li = (c) => `<li role="option" data-slug="${esc(c.slug)}" aria-selected="${S.cur && S.cur.slug === c.slug}">
      <span class="cp-li-a">${esc(c.a || c.t)}</span><span class="cp-li-t">${esc(c.t)}</span>
      <span class="cp-li-n">${Object.keys(c.notes).length ? `${Object.keys(c.notes).length} verse notes` : 'chapter'}</span></li>`;
    list.innerHTML = (land.length ? `<li class="cp-li-h" role="presentation">Landmark commentaries</li>${land.map(li).join('')}` : '')
      + (rest.length ? `<li class="cp-li-h" role="presentation">Also on this chapter</li>${rest.map(li).join('')}` : '')
      || '<li class="cp-li-h" role="presentation">No commentary on this chapter yet</li>';
  }

  function choose(slug) {
    S.cur = S.list.find((c) => c.slug === slug) || S.list[0] || null;
    if (S.cur) store.set('fr_cp_author', S.cur.a);
    pane.querySelector('.cp-who').textContent = S.cur ? (S.cur.a || 'Commentary') : 'No commentary';
    pane.querySelector('.cp-what').textContent = S.cur ? S.cur.t : '';
    fillList();
    S.shown = null; show(S.verse || 1, true);
  }

  // the page for a verse: the work's own note, else its nearest note before the verse, else the page its chapter opens on
  function target(v) {
    const c = S.cur; if (!c) return null;
    if (c.collected) {
      if (c.collected[v]) return { p: c.collected[v][0][1], how: 'collected', v, items: c.collected[v] };
      const prev = Object.keys(c.collected).map(Number).filter((x) => x < v).sort((a, b) => b - a)[0];
      if (prev != null) return { p: c.collected[prev][0][1], how: 'collected', v: prev, items: c.collected[prev], nearest: true };
    }
    if (c.notes[v] != null) return { p: c.notes[v], how: 'note', v };
    const before = Object.keys(c.notes).map(Number).filter((x) => x < v).sort((a, b) => b - a)[0];
    if (before != null) return { p: c.notes[before], how: 'nearest', v: before };
    if (c.open != null) return { p: c.open, how: 'chapter' };
    const first = Object.keys(c.notes).map(Number).sort((a, b) => a - b)[0];
    return first != null ? { p: c.notes[first], how: 'later', v: first } : null;
  }

  async function show(v, force) {
    S.verse = +v;
    const w = where(); if (!S.cur || !w) return;
    const t = target(S.verse); if (!t) return;
    const same = S.shown && S.shown.slug === S.cur.slug && +S.shown.p === +t.p;
    S.shown = { slug: S.cur.slug, p: +t.p, t, book: w.book, ch: w.ch };
    if (same && !force) return paint(true);
    const tok = ++S.token;
    pane.querySelector('.cp-body').classList.add('cp-loading');
    try {
      if (t.how === 'collected') {
        const ns = [...new Set(t.items.map((x) => +x[1]))];
        const got = await Promise.all(ns.map((n) => page(S.cur.slug, n).catch(() => null)));
        if (tok !== S.token) return;
        S.shown.byPage = Object.fromEntries(ns.map((n, i) => [n, got[i] && got[i].p]));
        S.shown.pages = got.filter(Boolean).map((g) => g.p);
      } else {
        const [a, b] = await Promise.all([page(S.cur.slug, +t.p), page(S.cur.slug, +t.p + 1).catch(() => null)]);
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

  function paint(keepScroll) {
    const sh = S.shown, body = pane.querySelector('.cp-body'), whereEl = pane.querySelector('.cp-where');
    body.classList.remove('cp-loading');
    pane.querySelectorAll('.cp-lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
    if (!sh) { body.innerHTML = ''; whereEl.textContent = ''; return; }
    const bookName = (where() || {}).name || sh.book.replace(/-/g, ' ');
    const {t} = sh, read = SITE.read(sh.slug, sh.p);
    const say = t.how === 'note' ? `On ${bookName} ${sh.ch}:${t.v}`
      : t.how === 'nearest' ? `No note on ${sh.ch}:${S.verse}. His note on ${sh.ch}:${t.v}`
      : t.how === 'chapter' ? `Chapter ${sh.ch} opens here (no verse notes found)`
      : t.how === 'later' ? `His first note in this chapter, on ${sh.ch}:${t.v}` : 'Reading on';
    whereEl.innerHTML = `<span>${esc(say)}</span> <span class="cp-pg">p. ${sh.p}</span> <a href="${read}">Open in the reader</a>`;
    const pages = sh.pages || [];
    if (!pages.length) { body.innerHTML = '<p class="cp-empty">This page could not be loaded.</p>'; return; }
    if (t.how === 'collected') return paintCollected(sh, t, bookName, body, whereEl);
    const hasEn = pages.some((p) => p.en), lane = S.lang === 'la' || !hasEn ? 'la' : 'en';
    pane.querySelector('.cp-lang').hidden = !(hasEn && pages.some((p) => p.la));
    const printed = (S.cur && S.cur.pv && S.cur.pv[t.v]) || t.v;
    const rx = (t.how === 'note' || t.how === 'nearest' || t.how === 'later') ? noteRx(printed) : null;
    let hit = false;
    const sig = siglaOf(sh.slug);
    const withSigla = (txt) => {
      if (!sig) return { html: esc(txt), who: [] };
      const who = [];
      const html = esc(txt).replace(sig.rx, (m0, pre, k) => { const n = sig.sg[k]; if (n && !who.includes(n)) who.push(n); return `${pre}<abbr title="${esc(n)}">${k}</abbr>`; });
      return { html, who };
    };
    body.innerHTML = pages.map((p, i) => {
      const ps = paragraphs(p[lane] || p.la || p.en);
      const html = ps.map((s) => {
        const mark = rx && !hit && rx.test(s); if (mark) hit = true;
        const head = /^#{1,6}\s+/.test(s); // the page's own heads ("### CAPUT V.") are set as heads, not printed with their marks
        const x = withSigla(head ? s.replace(/^#{1,6}\s+/, '') : s);
        if (head) return `<p class="cp-h${mark ? ' cp-hit' : ''}"${mark ? ' id="cp-hit"' : ''}>${x.html}</p>`;
        return `<p${mark ? ' class="cp-hit" id="cp-hit"' : ''}>${x.html}</p>${mark && x.who.length ? `<p class="cp-sig">Critics cited: ${esc(x.who.join(', '))}</p>` : ''}`;
      }).join('') || '<p class="cp-empty">A blank page.</p>';
      return (i ? `<div class="cp-break"><span>p. ${p.n}</span></div>` : '') + html;
    }).join('');
    const h = body.querySelector('#cp-hit');
    if (h) body.scrollTop = Math.max(0, h.offsetTop - body.offsetTop - 12);
    else if (!keepScroll) body.scrollTop = 0;
    document.querySelectorAll('.cp-focus').forEach((e) => e.classList.remove('cp-focus'));
    const vEl = SITE.verseEl(S.verse); if (vEl) vEl.classList.add('cp-focus');
  }

  // a collection (the Critici Sacri): every critic's note on the verse, in the order the volume prints them
  function paintCollected(sh, t, bookName, body, whereEl) {
    const n = t.items.length, crit = new Set(t.items.map((x) => x[0])).size;
    whereEl.innerHTML = `<span>${t.nearest ? `No critic on ${sh.ch}:${S.verse}. ` : ''}${crit} ${crit === 1 ? 'critic' : 'critics'} on ${esc(bookName)} ${sh.ch}:${t.v}</span>`
      + ` <a href="${esc(SITE.read(sh.slug, t.items[0][1]))}">Open in the reader</a>`;
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
    body.scrollTop = 0;
    body.querySelectorAll('[data-cp-jump]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const s = body.querySelector(`#cp-c${a.dataset.cpJump}`); if (s) body.scrollTop = s.offsetTop - body.offsetTop - 6; }; });
    document.querySelectorAll('.cp-focus').forEach((e) => e.classList.remove('cp-focus'));
    const vEl = SITE.verseEl(S.verse); if (vEl) vEl.classList.add('cp-focus');
  }

  // ── following the reader ──────────────────────────────────────────────────────────────────────────────────────────────────
  function watch() {
    if (observer) observer.disconnect();
    const seen = new Map();
    observer = new IntersectionObserver((es) => {
      for (const e of es) seen.set(e.target, e.isIntersecting);
      if (!S.follow) return;
      const vis = [...seen].filter(([, on]) => on).map(([el]) => el).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const v = vis.length ? SITE.vnum(vis[0]) : null;
      if (v && v !== S.verse) { clearTimeout(watch.t); watch.t = setTimeout(() => show(v), 180); }
    }, { rootMargin: '-22% 0px -68% 0px' });
    document.querySelectorAll(SITE.verses).forEach((el) => observer.observe(el));
  }
  document.addEventListener('click', (e) => {
    const v = SITE.clicked(e.target); if (!v || !pane) return;
    show(v, true);
  });

  // the reader redraws its side panel on every verse: give it the switch back to the commentary each time
  function ensureTabs() {
    const side = layout && layout.querySelector(SITE.side), tabs = pane && pane.querySelector('.cp-tabs');
    if (!side || !tabs || side.querySelector('.cp-tabs')) return;
    side.prepend(tabs.cloneNode(true));
    const on = document.body.classList.contains('cp-src') ? 's' : 'c';
    layout.querySelectorAll('.cp-tabs [data-tab]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tab === on)));
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
      if (v1 && v1 !== S.firstEl) { S.firstEl = v1; watch(); paint(true); }
      return;
    }
    lastKey = key;
    S.list = await commentaries(w.book, w.ch);
    const want = store.get('fr_cp_author', 'Cornelius a Lapide');
    const c = S.list.find((x) => x.a === want) || S.list[0];
    S.verse = w.v || 1;
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
