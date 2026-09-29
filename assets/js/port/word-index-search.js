/* EVERY TEXT WITH A WORD (2026-09-29). A reader: "I searched for 'suspicion' in English and 'suspicio' in Latin and came back with
   one text … the same with 'fama': only 10 texts, but it's a huge category for moral theology." Exact-word search read only the
   full-text (Pagefind) index — about 2,700 of the library's works, none of the Latin, Greek or Eastern Fathers nor EEBO — one spelling
   at a time, ten sections a page. This panel answers from the concordance instead (every word of every page of every work; a
   duplicate edition once): how many works, where, and which use the word most, with the word's own inflections (fama, famae, famam…).
   Shared by the corpus site (search.html: answered in the page by word-index-local.js, no server call) and MereO (the theme's port,
   the Ask worker's /v1/words; the same in-page engine once MereO's store serves byte ranges).

   FRWordIndex.mount(host, {query, post, readHref, title, meta})
     post(body)            → Promise of the {op:'words'} answer ({rows} or {forms, more})
     readHref(slug,page,w) → the reader URL for a page with the word highlighted
     title(slug,row)       → the work's display title (HTML-escaped)
     meta(row)             → the line under the title (HTML-escaped): author, volume, tradition */
(function () {
  'use strict';
  const STOP = new Set(('et in est non ad cum ut quod qui quae quo de sed per ab ex se si enim etiam autem quia hoc esse sunt eius nec vel uel aut ita sic tamen nam id ea eo ' +
    'the of and to in a is that it be as by for not which with this his he but are from or they we all was have so an their on him them you our shall will hath doth were').split(' '));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = w => String(w || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ſ/g, 's').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/j/g, 'i').replace(/v/g, 'u').replace(/ς/g, 'σ');
  const n = x => Number(x || 0).toLocaleString();

  /* A word's likely inflections: Latin by its ending (the common declensions), English plurals. Only the forms the library actually
     holds are shown, each with its count, and any can be unticked. */
  function inflect(w) { return forms(w).all; }
  /* {all, off}: off = forms shown but unticked at first (a 1st-declension -is also inflects other words: famis is mostly fames). The
     Latin forms carry their enclitic -que too (famaque, famamque): the same word. */
  function forms(w) {
    const out = new Set([w]), off = new Set(), add = (stem, ends) => ends.forEach(e => out.add(stem + e));
    let latin = true;
    if (/tudo$/.test(w)) add(w.slice(0, -4), ['tudo', 'tudinis', 'tudini', 'tudinem', 'tudine', 'tudines', 'tudinum', 'tudinibus']);
    else if (/io$/.test(w)) add(w.slice(0, -2), ['io', 'ionis', 'ioni', 'ionem', 'ione', 'iones', 'ionum', 'ionibus']);
    else if (/tas$/.test(w)) add(w.slice(0, -3), ['tas', 'tatis', 'tati', 'tatem', 'tate', 'tates', 'tatum', 'tatibus']);
    else if (/or$/.test(w)) add(w.slice(0, -2), ['or', 'oris', 'ori', 'orem', 'ore', 'ores', 'orum', 'oribus']);
    else if (/us$/.test(w)) add(w.slice(0, -2), ['us', 'i', 'o', 'um', 'e', 'orum', 'os', 'is', 'ui', 'u', 'uum', 'ibus']);
    else if (/um$/.test(w)) add(w.slice(0, -2), ['um', 'i', 'o', 'a', 'orum', 'is']);
    else if (/a$/.test(w)) add(w.slice(0, -1), ['a', 'ae', 'am', 'as', 'arum', 'is']);
    else if (/es$/.test(w)) add(w.slice(0, -2), ['es', 'ei', 'em', 'e', 'erum', 'ebus', 'is', 'i', 'ium', 'ibus']);
    else if (/is$/.test(w)) add(w.slice(0, -2), ['is', 'i', 'em', 'e', 'es', 'ium', 'ibus']);
    else latin = false;
    if (latin) {
      if (/a$/.test(w) && !/ia$/.test(w)) off.add(w.slice(0, -1) + 'is');
      [...out].forEach(f => { if (!/que$/.test(f)) out.add(f + 'que'); });
    } else {
      if (!/s$/.test(w)) out.add(w + 's');
      if (/(s|x|z|ch|sh)$/.test(w)) out.add(w + 'es');
      if (/[^aeiou]y$/.test(w)) out.add(w.slice(0, -1) + 'ies');
    }
    return { all: [...out].filter(f => f.length >= 2), off };
  }
  /* The words of a query worth counting (letters only, no stopwords); null for a quoted phrase or more than three words. */
  function words(query) {
    const s = String(query || '').trim();
    if (!s || /["“”]/.test(s)) return null;
    const ws = [...new Set((s.match(/[\p{L}\p{M}'’-]+/gu) || []).map(fold).map(w => w.replace(/['’-]/g, '')).filter(w => w.length >= 2 && !STOP.has(w)))];
    return ws.length && ws.length <= 3 ? ws : null;
  }

  let styled = false;
  function style() {
    if (styled) return; styled = true;
    const css = `.wix{margin:0 0 1.4rem;padding:1rem 1.1rem;border:1px solid var(--border,#ddd);border-radius:8px;background:var(--card-bg,#fff)}
.wix h3{margin:0 0 .35rem;font:600 1.02rem/1.35 var(--font-ui,inherit)}.wix .wix-sub{margin:0 0 .7rem;color:var(--muted,#666);font-size:.86rem;line-height:1.45}
.wix .wix-forms{display:flex;flex-wrap:wrap;gap:.35rem .4rem;align-items:center;margin:.2rem 0 .6rem;font-size:.84rem}
.wix .wix-forms b{font-weight:600;margin-right:.2rem}.wix label.wix-f{display:inline-flex;gap:.25rem;align-items:center;padding:.12rem .5rem;border:1px solid var(--border,#ddd);border-radius:999px;cursor:pointer}
.wix label.wix-f span{color:var(--muted,#666)}.wix .wix-more{color:var(--muted,#666)}.wix .wix-more button{border:0;background:none;padding:0 .2rem;color:inherit;text-decoration:underline;cursor:pointer;font:inherit}
.wix .wix-sum{margin:.3rem 0 .5rem;font-size:.95rem}.wix .wix-trad{display:flex;flex-wrap:wrap;gap:.35rem;margin:0 0 .7rem}
.wix .wix-trad button{padding:.18rem .6rem;border:1px solid var(--border,#ddd);border-radius:999px;background:none;color:inherit;font:inherit;font-size:.82rem;cursor:pointer}
.wix .wix-trad button[aria-pressed=true]{background:var(--fg,#222);color:var(--card-bg,#fff);border-color:var(--fg,#222)}
.wix ol{margin:0;padding:0;list-style:none}.wix li{padding:.55rem 0;border-top:1px solid var(--border,#eee)}.wix li a.wix-t{font-weight:600;color:var(--fg,#222);text-decoration:none}
.wix li a.wix-t:hover{text-decoration:underline}.wix .wix-m{color:var(--muted,#666);font-size:.84rem;margin-top:.12rem}
.wix .wix-c{font-size:.84rem;margin-top:.12rem}.wix .wix-c button{border:0;background:none;padding:0;margin-left:.5rem;color:inherit;text-decoration:underline;cursor:pointer;font:inherit}
.wix .wix-pages{display:flex;flex-wrap:wrap;gap:.25rem .6rem;margin-top:.35rem;font-size:.82rem}.wix .wix-pages a{color:inherit}
.wix .wix-go{margin-top:.7rem;padding:.35rem .8rem;border:1px solid var(--border,#ddd);border-radius:6px;background:none;color:inherit;font:inherit;cursor:pointer}
.wix-teaser{padding:.7rem 1rem;font-size:.92rem;line-height:1.5}.wix-teaser .wix-go{margin:0 0 0 .4rem;padding:.2rem .7rem}
.wix .wix-jump{white-space:nowrap;color:inherit}
.wix .wix-c button.wix-pv{margin-left:.6rem;padding:.08rem .55rem;border:1px solid var(--border,#ddd);border-radius:999px;text-decoration:none;font-size:.8rem}
.wix .wix-c button.wix-pv[aria-expanded=true]{background:var(--fg,#222);color:var(--card-bg,#fff);border-color:var(--fg,#222)}
.wix .wix-inst{margin:.55rem 0 .15rem;padding:.15rem 0 .2rem .85rem;border-left:2px solid var(--border,#ddd)}
.wix .wix-i{margin:.5rem 0;font-size:.9rem;line-height:1.55}.wix .wix-i a.wix-p{display:inline-block;min-width:3.2rem;margin-right:.5rem;font-size:.78rem;font-weight:600;color:inherit;white-space:nowrap}
.wix .wix-s{overflow-wrap:anywhere}.wix .wix-s+.wix-s{margin-left:.3em}
.wix .wix-s mark{background:color-mix(in srgb,var(--accent,#b8860b) 26%,transparent);color:inherit;padding:0 .12em;border-radius:3px}
.wix .wix-none{color:var(--muted,#666);font-style:italic;font-size:.84rem}.wix .wix-if .wix-go{margin-top:.2rem;font-size:.84rem}
.wix details.wix-all{margin:.4rem 0 .2rem}.wix details.wix-all summary{cursor:pointer;font-size:.82rem;color:var(--muted,#666)}
.wix ol.wix-vols{margin:.45rem 0 0 .2rem;padding-left:.8rem;border-left:1px solid var(--border,#ddd)}.wix ol.wix-vols>li{padding:.4rem 0}
.wix ol.wix-vols>li a.wix-t{font-weight:500}.wix .wix-plus{color:var(--muted,#666);cursor:help}
.wix .wix-note{margin:.8rem 0 0;color:var(--muted,#666);font-size:.8rem;line-height:1.45}.wix .wix-err{color:#a8462b}`;
    const el = document.createElement('style'); el.textContent = css; document.head.appendChild(el);
  }

  function mount(host, opts) {
    const ws = words(opts.query);
    host.innerHTML = '';
    if (!ws || !host) return null;
    style();
    const box = document.createElement('section');
    box.className = 'wix'; box.setAttribute('aria-live', 'polite');
    const quoted = ws.map(w => '“' + esc(w) + '”').join(' + ');
    box.innerHTML = `<h3>${quoted}${ws.length > 1 ? ' on the same page' : ''} — every text in the library</h3>
      <p class="wix-sub">Counted from the library’s word index: every page of every work, a duplicate edition once. <a href="#" class="wix-jump">Passages with excerpts ↓</a></p>
      <div class="wix-forms"></div><div class="wix-sum">Counting…</div><div class="wix-trad"></div><ol></ol><div class="wix-foot"></div>`;
    host.appendChild(box);
    const $ = s => box.querySelector(s);
    const state = { seq: 0, groups: ws.map(w => { const f = forms(w); return { word: w, cands: f.all.slice(0, Math.floor(40 / ws.length)), off: f.off, on: new Set(), counts: {}, more: [] }; }), trad: '', rows: [], shown: 0, full: false };
    const groups = () => state.groups.map(g => [...g.on]).filter(g => g.length);

    function formsHtml() {
      return state.groups.map((g, gi) => {
        const have = g.cands.filter(f => g.counts[f]).sort((a, b) => g.counts[b] - g.counts[a]);
        const chips = have.map(f => `<label class="wix-f"><input type="checkbox" data-g="${gi}" data-f="${esc(f)}"${g.on.has(f) ? ' checked' : ''}>${esc(f)} <span>${n(g.counts[f])}</span></label>`).join('');
        const extra = g.more.filter(f => !g.cands.includes(f.form)).slice(0, 8);
        const more = extra.length ? `<span class="wix-more">other words beginning “${esc(g.word)}”: ${extra.map(f => `<button type="button" data-g="${gi}" data-add="${esc(f.form)}" title="${n(f.works)} works">${esc(f.form)}</button>`).join('')}</span>` : '';
        return `<b>${esc(g.word)}</b>${chips || '<span class="wix-more">not in the word index</span>'}${more}`;
      }).join('<span style="width:100%"></span>');
    }
    async function loadForms() {
      const all = [...new Set(state.groups.flatMap(g => g.cands))];
      const r = await opts.post({ op: 'words', by: 'forms', groups: [all.slice(0, 40)], prefixes: ws });
      const counts = {}; (r.forms || []).forEach(x => { counts[x.form] = Number(x.works); });
      state.groups.forEach(g => {
        g.counts = Object.fromEntries(g.cands.filter(f => counts[f]).map(f => [f, counts[f]]));
        g.cands.forEach(f => { if (counts[f] && !g.off.has(f)) g.on.add(f); });
        g.more = (r.more || []).filter(x => x.prefix === g.word);
      });
      $('.wix-forms').innerHTML = formsHtml();
    }
    async function loadCounts() {
      const my = ++state.seq, G = groups();
      if (G.length < state.groups.length) { $('.wix-sum').textContent = 'No form of every word is in the word index.'; $('.wix-trad').innerHTML = ''; $('ol').innerHTML = ''; $('.wix-foot').innerHTML = ''; return; }
      $('.wix-sum').textContent = 'Counting every page…';
      const [sum, list] = await Promise.all([
        opts.post({ op: 'words', by: 'summary', groups: G }),
        opts.post({ op: 'words', by: 'works', groups: G, tradition: state.trad, limit: 200 })]);
      if (my !== state.seq) return;
      const rows = sum.rows || [], tot = rows.reduce((a, r) => ({ works: a.works + Number(r.works), pages: a.pages + Number(r.pages), occ: a.occ + Number(r.occurrences) }), { works: 0, pages: 0, occ: 0 });
      $('.wix-sum').innerHTML = tot.works ? `<b>${n(tot.works)}</b> works · ${n(tot.pages)} pages · ${n(tot.occ)} occurrences` : 'In no work of the library.';
      $('.wix-trad').innerHTML = rows.length > 1 ? [`<button type="button" data-t="" aria-pressed="${!state.trad}">All traditions</button>`]
        .concat(rows.filter(r => r.tradition).map(r => `<button type="button" data-t="${esc(r.tradition)}" aria-pressed="${state.trad === r.tradition}">${esc(r.tradition)} ${n(r.works)}</button>`)).join('') : '';
      state.rows = list.rows || []; state.full = !list.truncated && state.rows.length < 200; state.shown = 0;
      $('ol').innerHTML = ''; more();
    }
    const list = v => (Array.isArray(v) ? v : String(v || '').replace(/^\[|\]$/g, '').split(',')).map(s => s.trim()).filter(Boolean);
    const times = (o, p) => `${n(o)} ${Number(o) === 1 ? 'time' : 'times'} on ${n(p)} ${Number(p) === 1 ? 'page' : 'pages'}`;
    const unit = slug => (/^(pld|pg)-/.test(slug) ? 'col.' : 'p.');
    const pageLabel = (slug, p) => unit(slug) + ' ' + esc(String(p).replace(/^0+(?=\d)/, ''));
    // One entry per work; the volumes of one work (same title, same author) are one entry that opens onto its volumes.
    function grouped(rows) {
      const by = new Map(), out = [];
      for (const r of rows) {
        const k = r.author ? r.author + '\u0001' + (r.title || r.slug) : r.slug;
        let g = by.get(k);
        if (!g) { g = { rows: [], occ: 0, pages: 0 }; by.set(k, g); out.push(g); }
        g.rows.push(r); g.occ += Number(r.occurrences); g.pages += Number(r.pages);
      }
      return out.sort((a, b) => b.occ - a.occ || b.pages - a.pages);
    }
    function row(r, vol) {
      const f = list(r.forms), best = list(r.best_forms), fl = [...new Set(ws.filter(x => f.includes(x)).concat(best, f))];
      // the word to highlight: one that is ON the page the link opens, the word as typed when it is there
      const hl = best.find(x => ws.includes(x)) || best[0] || f.find(x => ws.includes(x)) || f[0] || ws[0];
      const li = document.createElement('li');
      li.innerHTML = `<a class="wix-t" href="${esc(opts.readHref(r.slug, r.best_page, hl))}">${vol ? esc(r.volume || r.title || r.slug) : opts.title(r.slug, r)}</a>
        ${vol ? '' : `<div class="wix-m">${opts.meta(r)}</div>`}
        <div class="wix-c">${times(r.occurrences, r.pages)}${fl.length ? ' · ' + esc(fl.slice(0, 4).join(', ')) + (fl.length > 4 ? ` <span class="wix-plus" title="${esc(fl.join(', '))}">+${fl.length - 4}</span>` : '') : ''}<button type="button" class="wix-pv" data-pages="${esc(r.slug)}" data-hl="${esc(hl)}" aria-expanded="false">Preview passages ▾</button></div>`;
      return li;
    }
    function entry(g) {
      if (g.rows.length === 1) return row(g.rows[0]);
      const top = g.rows[0], li = document.createElement('li');
      li.className = 'wix-g';
      const trads = [...new Set(g.rows.map(r => r.tradition).filter(Boolean))];
      li.innerHTML = `<a class="wix-t" href="${esc(opts.readHref(top.slug, top.best_page, list(top.best_forms)[0] || ws[0]))}">${opts.title(top.slug, top)}</a>
        <div class="wix-m">${[top.author, g.rows.length + ' volumes', trads.join(', ')].filter(Boolean).map(esc).join(' · ')}</div>
        <div class="wix-c">${times(g.occ, g.pages)}<button type="button" class="wix-pv" data-vols aria-expanded="false">Show the ${g.rows.length} volumes ▾</button></div>
        <ol class="wix-vols" hidden></ol>`;
      const ol = li.querySelector('.wix-vols');
      g.rows.forEach(r => ol.appendChild(row(r, true)));
      return li;
    }
    function more() {
      // ten works at first, so the passages below stay in reach; then fifty at a time
      if (!state.shown) state.groups2 = grouped(state.rows);
      const ol = $('ol'), all = state.groups2, next = all.slice(state.shown, state.shown + (state.shown ? 50 : 10));
      next.forEach(g => ol.appendChild(entry(g))); state.shown += next.length;
      const left = all.length - state.shown;
      $('.wix-foot').innerHTML = left > 0 ? `<button type="button" class="wix-go" data-more>Show ${Math.min(50, left)} more of ${n(all.length)}${state.full ? '' : '+'}</button>`
        : (!state.full ? '<button type="button" class="wix-go" data-all>Load the rest of the list</button>' : '');
    }
    // The passages of one work: its pages in book order, a line around each use, six at first.
    async function preview(li, slug, hl, btn) {
      let box = li.querySelector(':scope > .wix-inst');
      if (box) { box.hidden = !box.hidden; btn.setAttribute('aria-expanded', String(!box.hidden)); btn.textContent = box.hidden ? 'Preview passages ▾' : 'Hide passages ▴'; return; }
      box = document.createElement('div'); box.className = 'wix-inst'; box.textContent = 'Reading the pages…'; li.appendChild(box);
      btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Hide passages ▴';
      const r = await opts.post({ op: 'words', by: 'pages', groups: groups(), work: slug, limit: 2000 }).catch(fail);
      if (!r || !r.rows) { box.remove(); return; }
      const pages = r.rows, forms = [...new Set(groups().flat())], st = { shown: 0 };
      box.innerHTML = `<div class="wix-il"></div><div class="wix-if"></div>
        <details class="wix-all"><summary>All ${n(pages.length)} ${pages.length === 1 ? 'page' : 'pages'} as links</summary><div class="wix-pages">${pages.map(p => `<a href="${esc(opts.readHref(slug, p.page, hl))}">${pageLabel(slug, p.page)}${Number(p.occurrences) > 1 ? ' ×' + p.occurrences : ''}</a>`).join('')}</div></details>`;
      const il = box.querySelector('.wix-il'), foot = box.querySelector('.wix-if');
      async function next(k) {
        const batch = pages.slice(st.shown, st.shown + k); st.shown += batch.length;
        foot.innerHTML = '<span class="wix-none">Reading the pages…</span>';
        let texts = null;
        if (window.FRWordPreview) texts = await FRWordPreview.pages(slug, batch.map(p => p.page)).catch(e => { console.warn('word preview', e); return null; });
        batch.forEach(p => {
          const k2 = texts && FRWordPreview.kwic(texts.get(p.page) || '', forms), d = document.createElement('div');
          d.className = 'wix-i';
          d.innerHTML = `<a class="wix-p" href="${esc(opts.readHref(slug, p.page, hl))}">${pageLabel(slug, p.page)}</a>`
            + (k2 && k2.snips.length ? k2.snips.map(x => `<span class="wix-s">${x}</span>`).join('') : '<span class="wix-s wix-none">open the page to read it</span>');
          il.appendChild(d);
        });
        const left = pages.length - st.shown;
        foot.innerHTML = left > 0 ? `<button type="button" class="wix-go wix-im">Show ${Math.min(10, left)} more passages · ${n(left)} left</button>` : '';
        const b = foot.querySelector('button'); if (b) b.onclick = () => next(10);
      }
      await next(6);
    }
    box.addEventListener('change', e => {
      const t = e.target; if (!t.matches('input[data-f]')) return;
      const g = state.groups[+t.dataset.g]; if (t.checked) g.on.add(t.dataset.f); else g.on.delete(t.dataset.f);
      loadCounts().catch(fail);
    });
    box.addEventListener('click', async e => {
      const t = e.target;
      if (t.matches('a.wix-jump')) { e.preventDefault(); const to = document.getElementById('count') || document.getElementById('results'); if (to) to.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else if (t.matches('button[data-add]')) { const g = state.groups[+t.dataset.g]; if (!g.cands.includes(t.dataset.add)) g.cands.push(t.dataset.add); g.counts[t.dataset.add] = Number((g.more.find(x => x.form === t.dataset.add) || {}).works || 1); g.on.add(t.dataset.add); $('.wix-forms').innerHTML = formsHtml(); loadCounts().catch(fail); }
      else if (t.matches('button[data-t]')) { state.trad = t.dataset.t; loadCounts().catch(fail); }
      else if (t.matches('button[data-more]')) more();
      else if (t.matches('button[data-all]')) {
        t.disabled = true; t.textContent = 'Loading…';
        const r = await opts.post({ op: 'words', by: 'works', groups: groups(), tradition: state.trad, limit: 2000 }).catch(fail);
        if (r && r.rows) {   // regroup the whole list, keeping what was open in view
          const had = state.shown; state.rows = r.rows; state.full = true; state.groups2 = grouped(r.rows); $('ol').innerHTML = '';
          state.groups2.slice(0, had + 50).forEach(g => $('ol').appendChild(entry(g))); state.shown = Math.min(had + 50, state.groups2.length);
          const left = state.groups2.length - state.shown;
          $('.wix-foot').innerHTML = left > 0 ? `<button type="button" class="wix-go" data-more>Show ${Math.min(50, left)} more of ${n(state.groups2.length)}</button>` : '';
        }
      } else if (t.matches('button[data-vols]')) {
        const ol = t.closest('li').querySelector(':scope > .wix-vols'); ol.hidden = !ol.hidden;
        t.setAttribute('aria-expanded', String(!ol.hidden)); t.textContent = ol.hidden ? t.textContent.replace('▴', '▾').replace(/^Hide/, 'Show') : t.textContent.replace('▾', '▴').replace(/^Show/, 'Hide');
      } else if (t.matches('button[data-pages]')) {
        t.disabled = true;
        await preview(t.closest('li'), t.dataset.pages, t.dataset.hl, t).catch(fail);
        t.disabled = false;
      }
    });
    function fail(err) { $('.wix-sum').innerHTML = '<span class="wix-err">The word index could not be reached. The passages below are still searchable.</span>'; console.warn('word index', err); }
    loadForms().then(loadCounts).catch(fail);
    return { words: ws };
  }
  /* The Works tab searches titles, so a reader who types a word there sees only works NAMED by it. One line says how many works
     hold the word in their text and opens the full list (opts.open). Cached per query: the tab re-renders as headings load. */
  const memo = new Map();
  async function count(query, post) {
    const ws = words(query); if (!ws) return null;
    const key = ws.join(' ');
    if (!memo.has(key)) memo.set(key, (async () => {
      const gs = ws.map(w => forms(w)), all = [...new Set(gs.flatMap(g => g.all))].slice(0, 40);
      const r = await post({ op: 'words', by: 'forms', groups: [all] });
      const have = new Set((r.forms || []).map(x => x.form));
      const groups = gs.map(g => g.all.filter(f => have.has(f) && !g.off.has(f)));
      if (groups.some(g => !g.length)) return { ws, works: 0 };
      const sum = await post({ op: 'words', by: 'summary', groups });
      return { ws, works: (sum.rows || []).reduce((a, x) => a + Number(x.works), 0) };
    })().catch(() => { memo.delete(key); return null; }));
    return memo.get(key);
  }
  async function teaser(host, opts) {
    if (!host) return;
    const my = (host.__wixSeq = (host.__wixSeq || 0) + 1);
    const c = await count(opts.query, opts.post);
    if (my !== host.__wixSeq || !c || !c.works) return;
    style();
    host.innerHTML = `<div class="wix wix-teaser"><b>${c.ws.map(w => '“' + esc(w) + '”').join(' + ')}</b> ${c.ws.length > 1 ? 'occur together on the pages of' : 'occurs in the text of'} <b>${n(c.works)} ${c.works === 1 ? 'work' : 'works'}</b> (with ${c.ws.length > 1 ? 'their' : 'its'} other forms). The list below matches titles and headings only. <button type="button" class="wix-go">List every text</button></div>`;
    host.querySelector('button').onclick = () => opts.open();
  }
  window.FRWordIndex = { mount, teaser, count, inflect, forms, words, fold };
})();
