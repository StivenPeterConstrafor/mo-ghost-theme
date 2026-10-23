/* TRADITION GRAPHICS (2026-10-22, owner: "restructure /topics … i would love more graphics and ui similar to /maps"). The drawings of
   the maps page, made from plain data so that any page draws them alike (the topics now; the atlas and the shared questions next):
     eraStrip       authors (or works) on a time axis, a column for each quarter-century, stacked by tradition in the order of the
                    tradition's history, the library's eras banded behind them, the leading voices named at their years, and a
                    one-line legend whose entries switch a tradition off (hollow and grey, as on the maps)
     eraMini        the same in miniature for a row of an index: one axis for every row (AD 100 to 1950 by half-centuries), each row
                    scaled to its own busiest half-century, so the rows compare in shape and their counts say their size
     positionBlock  one position of a question as the maps draw it: its name and its share of the authors answering, that share as
                    a bar in the traditions' colours with the traditions named under it, the thesis, what it turns on and its
                    earliest holder, then its authors by tradition behind one fold, a row each with his pages
     questionMap    a subject's disputed questions as one diagram: a row for each question, its authors by century as a strip of
                    cells, its positions as one divided bar, and the doors to its map, every answer and the controversies
     scriptureBand  the chapters most cited under a subject placed along the canon (the Old Testament, the New, the deuterocanon
                    when it is cited), the most cited named over their bars, and the list of them, each opening the Bible page
     preview        the maps page's page preview: a page reference opens the page itself under its row (page-window.js)
   Each drawing is a function of plain data that returns HTML. mount(root) wires what a page has drawn inside root: the legend
   switches, the strip's readout, the label lanes, the folds and the questions. A tradition's colour is the maps' (--tg-<shelf>,
   tradition-graphics.css) and never stands alone: every dot and bar has its tradition named beside it or in the legend. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FRTraditionGraphics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('en-US');
  const ord = (n) => n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] || 'th'));
  const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
  const pct = (v) => `${(Math.round(v * 1000) / 1000)}%`;

  /* THE SHELVES, closed: the nine of the library in the order of the tradition's history, which is the order the strip stacks
     them in. A tradition named any other way (the maps' "Reformed", a shelf code) folds onto its shelf; one not named is grey. */
  const TRADITIONS = [['gf', 'Greek Fathers'], ['pl', 'Latin Fathers'], ['po', 'Eastern Fathers'], ['md', 'Medieval'], ['rc', 'Roman Catholic'],
    ['lu', 'Lutheran'], ['rf', 'Continental Reformed'], ['ed', 'English Divines'], ['hl', 'Humanism and Law']];
  const ORDER = TRADITIONS.map((t) => t[0]).concat('x');
  const NAMES = Object.fromEntries(TRADITIONS);
  const ALIAS = new Map([...TRADITIONS.flatMap(([k, l]) => [[k, k], [l.toLowerCase(), k]]), ['reformed', 'rf'], ['humanism & law', 'hl'], ['x', 'x'], ['unknown', 'x']]);
  const key = (t) => ALIAS.get(String(t || '').trim().toLowerCase()) || 'x';
  const colour = (t) => `var(--tg-${key(t)})`;
  const namer = (labels) => (k) => (labels && labels[k]) || NAMES[k] || 'Shelf not recorded';
  const dot = (k) => `<i class="tg-sw" style="--c:var(--tg-${k})" aria-hidden="true"></i>`;

  /* THE ERAS, the library's own (research-tools.js: RX.eras, cut where RX.era cuts them) */
  const ERAS = [[0, 500, 'Early patristic'], [500, 800, 'Later patristic'], [800, 1100, 'Carolingian'], [1100, 1450, 'High medieval'],
    [1450, 1600, 'Reformation'], [1600, 1700, 'Seventeenth century'], [1700, 2100, 'Later authors']];

  let SEQ = 0;
  const REG = new Map();
  const uid = (p) => `${p}-${(++SEQ).toString(36)}`;

  /* AUTHOR DATES (2026-10-22, owner: "date authors please"). v1/enrich/author_dates.json (tools/topic_graphics/
     build_author_dates.py) gives a year for every author the library can date, keyed by the names the surfaces spell, with
     his other spellings as aliases: y (the year to draw him at, by the catalogue's rule: his birth, else his floruit, else his
     death), born, died, circa, fl, prec ("century"), dates (the line of text), basis. The module loads it once, on the first
     item that comes without a year but with a name ({y, t, name}, or the author's own {a} or {author}), and consults it
     wherever an item has no year: bin() for the strips, a holder's dates beside his name and his place in a position's order.
     A strip drawn before the key arrives is drawn again when it does; dates.ready resolves when the key is in (true) or
     cannot be had (false), so a page may wait for it before drawing. A name the library cannot date stays undated. */
  const BLOB = 'https://mo-tfr-library.mo-podcast-feed.workers.dev'; // MereO: the library worker (R2), never Vercel
  const DATES = { by: null, fold: null, ready: null, done: false };
  const fold = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const goodYear = (y) => { const v = Number(y); return v > 0 && v < 2100 ? v : 0; };
  const nameOf = (it) => (it ? it.name || it.author || it.a || '' : '');
  function loadDates() {
    if (DATES.ready) return DATES.ready;
    const w = typeof window !== 'undefined' ? window : null;
    if (!w || typeof fetch !== 'function') {
      DATES.done = true;
      DATES.ready = Promise.resolve(false);
      return DATES.ready;
    }
    const base = String(w.__FR_BLOB_BASE__ || BLOB).replace(/\/$/, '');
    DATES.ready = fetch(`${base}/v1/enrich/author_dates.json?v=${encodeURIComponent(w.__FR_VER || '1')}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const all = d && d.authors;
        if (!all) return false;
        const f = new Map();
        for (const [n, r] of Object.entries(all)) for (const x of [n].concat(r.aliases || [])) { const k = fold(x); if (k && !f.has(k)) f.set(k, r); }
        DATES.by = all;
        DATES.fold = f;
        return true;
      })
      .catch(() => false)
      .then((ok) => { DATES.done = true; if (ok) redraw(); return ok; });
    return DATES.ready;
  }
  /* the key's record for a name: the name as the page spells it, else the same letters without accents or stops, else an alias */
  function dateOf(name) {
    if (!name) return null;
    if (!DATES.by) { loadDates(); return null; }
    return DATES.by[name] || DATES.fold.get(fold(name)) || null;
  }
  /* an item's year: its own, else the key's for its name (0 when neither dates it) */
  const yearOf = (it) => goodYear(it && it.y) || goodYear((dateOf(nameOf(it)) || {}).y);

  /* RUNS. items [{y, t, name}] (y a year, missing or 0 when undated; t a tradition or a shelf code; name the author's, by which
     the author dates give a year the item lacks) become {size, b, u, n}: for each shelf the run of its bins from the first to
     the last that holds anyone, [first bin, n, n, …] (bin = year / size), and the undated counted apart.
     v1/enrich/topic_graphics.json stores each topic in the same shape (size 50). */
  function bin(items, size = 25) {
    const by = new Map();
    const u = {};
    let n = 0;
    let wait = false;
    for (const it of items || []) {
      const k = key(it.t);
      const y = yearOf(it);
      n += 1;
      if (!(y > 0 && y < 2100)) {
        if (!DATES.done && nameOf(it)) wait = true;
        u[k] = (u[k] || 0) + 1;
        continue;
      }
      if (!by.has(k)) by.set(k, new Map());
      const m = by.get(k);
      const b = Math.floor(y / size);
      m.set(b, (m.get(b) || 0) + 1);
    }
    const b = {};
    for (const [k, m] of by) {
      const lo = Math.min(...m.keys());
      const hi = Math.max(...m.keys());
      b[k] = [lo];
      for (let i = lo; i <= hi; i += 1) b[k].push(m.get(i) || 0);
    }
    const data = { size, b, u, n };
    /* the items wait, out of sight, for the author dates still on their way: the strip drawn from them is drawn again on arrival */
    if (wait) {
      Object.defineProperty(data, 'items', { value: items, enumerable: false });
      Object.defineProperty(data, 'wait', { value: true, enumerable: false, writable: true });
    }
    return data;
  }
  /* a strip drawn before the author dates came is drawn again, in place, with them (the same figure, its legend reset) */
  function redraw() {
    if (typeof document === 'undefined') return;
    for (const [id, r] of [...REG]) {
      if (r.kind !== 'era' || !r.data || !r.data.wait) continue;
      r.data.wait = false;
      const fig = document.getElementById(id);
      if (!fig) { REG.delete(id); continue; }
      const data = bin(r.data.items, r.data.size || 25);
      const und = (d) => Object.values(d.u || {}).reduce((s, v) => s + v, 0);
      if (und(data) === und(r.data)) continue;
      const tmp = document.createElement('div');
      tmp.innerHTML = eraStrip(data, { ...r.opts, _id: id });
      const next = tmp.firstElementChild;
      if (!next) continue;
      fig.replaceWith(next);
      layout(next.parentElement || next);
    }
  }
  const at = (run, i) => (run && i >= run[0] && i < run[0] + run.length - 1 ? run[i - run[0] + 1] : 0);
  const runTotal = (run) => (run ? run.slice(1).reduce((s, v) => s + v, 0) : 0);
  const totals = (data) => {
    const t = {};
    for (const k of ORDER) {
      const n = runTotal(data.b && data.b[k]) + ((data.u && data.u[k]) || 0);
      if (n) t[k] = n;
    }
    return t;
  };
  const yearSpan = (i, size) => `${i * size}–${i * size + size - 1}`;

  /* ── (a) THE ERA STRIP ──────────────────────────────────────────────────────────────────────────────────────────────── */
  function eraBars(r) {
    const { data, from, to, off } = r;
    const size = data.size || 25;
    const b0 = Math.floor(from / size);
    const b1 = Math.ceil(to / size);
    const span = to - from;
    const W = 1000;
    const H = 100;
    const keys = ORDER.filter((k) => data.b[k] && !off.has(k));
    const tot = [];
    let max = 0;
    for (let i = b0; i < b1; i += 1) {
      let s = 0;
      for (const k of keys) s += at(data.b[k], i);
      tot.push(s);
      if (s > max) max = s;
    }
    r.tot = tot; r.max = max; r.b0 = b0; r.b1 = b1;
    const w = size / span * W;
    const gap = Math.min(w * 0.16, 2.4);
    const base = new Array(b1 - b0).fill(0);
    let bands = '';
    ERAS.forEach(([a, z], i) => {
      const lo = Math.max(a, from);
      const hi = Math.min(z, to);
      if (hi > lo && i % 2 === 1) bands += `<rect class="tg-band" x="${((lo - from) / span * W).toFixed(2)}" y="0" width="${((hi - lo) / span * W).toFixed(2)}" height="${H}"/>`;
    });
    let grid = '';
    for (let c = Math.ceil(from / 100) * 100; c <= to; c += 100) grid += `<line class="tg-grid" x1="${((c - from) / span * W).toFixed(2)}" x2="${((c - from) / span * W).toFixed(2)}" y1="0" y2="${H}"/>`;
    let paths = '';
    for (const k of keys) {
      let d = '';
      for (let i = b0; i < b1; i += 1) {
        const v = at(data.b[k], i);
        if (!v || !max) continue;
        const x = (i * size - from) / span * W + gap / 2;
        const h = v / max * (H - 2);
        const y = H - base[i - b0] - h;
        base[i - b0] += h;
        d += `M${x.toFixed(2)} ${y.toFixed(2)}h${(w - gap).toFixed(2)}v${h.toFixed(2)}h${(gap - w).toFixed(2)}z`;
      }
      if (d) paths += `<path d="${d}" fill="var(--tg-${k})" data-k="${k}"/>`;
    }
    return `${bands}${grid}${paths}<line class="tg-base" x1="0" x2="${W}" y1="${H}" y2="${H}"/>`;
  }

  /* data {size, b, u, n} (bin() or the key); opts: unit ("author"), units ("authors"), labels {code: name}, title (the figure's
     name for a screen reader), marks [{y, label, sub}] (the names written over the strip at their years) */
  function eraStrip(data, opts = {}) {
    const size = data.size || 25;
    const keys = ORDER.filter((k) => data.b && data.b[k]);
    if (!keys.length) return '';
    const lo = Math.min(...keys.map((k) => data.b[k][0])) * size;
    const hi = Math.max(...keys.map((k) => (data.b[k][0] + data.b[k].length - 1) * size));
    const from = Math.max(0, Math.floor(lo / 100) * 100);
    const to = Math.min(2100, Math.ceil((hi + size) / 100) * 100);
    const id = opts._id || uid('tg-era');
    const name = namer(opts.labels);
    const r = { kind: 'era', data, from, to, off: new Set(), opts, name };
    REG.set(id, r);
    const bars = eraBars(r);
    const span = to - from;
    const t = totals(data);
    const units = opts.units || 'authors';
    const undated = Object.values(data.u || {}).reduce((s, v) => s + v, 0);
    const peak = r.tot.indexOf(r.max);
    const peakSpan = yearSpan(r.b0 + peak, size);
    const centuries = [];
    for (let c = Math.ceil(from / 100) * 100; c < to; c += 100) {
      const n = c / 100 + 1;
      centuries.push(`<span class="tg-c${n % 2 ? '' : ' e2'}${n % 4 ? '' : ' e4'}" style="left:${pct((c + 50 - from) / span * 100)}">${ord(n)}</span>`);
    }
    const eras = ERAS.map(([a, z, label]) => {
      const l = Math.max(a, from);
      const h = Math.min(z, to);
      return h > l ? `<span style="left:${pct((l - from) / span * 100)};width:${pct((h - l) / span * 100)}" title="${esc(label)}">${esc(label)}</span>` : '';
    }).join('');
    const marks = (opts.marks || []).filter((m) => m.y >= from && m.y < to).map((m, i) => `<span class="tg-mk" data-x="${((m.y - from) / span * 100).toFixed(3)}" data-p="${m.p != null ? m.p : i}"><i aria-hidden="true"></i><b>${esc(m.label)}</b>${m.sub ? ` <small>${esc(m.sub)}</small>` : ''}</span>`).join('');
    const legend = keys.concat(Object.keys(data.u || {}).filter((k) => !data.b[k])).filter((k, i, a) => a.indexOf(k) === i && t[k]);
    const sr = (() => {
      const rows = [];
      for (let c = Math.floor(from / 100); c < Math.ceil(to / 100); c += 1) {
        const cells = keys.map((k) => {
          let s = 0;
          for (let i = Math.ceil(c * 100 / size); i < Math.ceil((c + 1) * 100 / size); i += 1) s += at(data.b[k], i);
          return s;
        });
        if (cells.some(Boolean)) rows.push(`<tr><th scope="row">${ord(c + 1)} century</th>${cells.map((v) => `<td>${v}</td>`).join('')}</tr>`);
      }
      return `<table class="tg-sr"><caption>${esc(opts.title || 'Through time')}: ${esc(units)} by century and tradition${undated ? `; ${fmt(undated)} undated` : ''}</caption><thead><tr><th scope="col">Century</th>${keys.map((k) => `<th scope="col">${esc(name(k))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
    })();
    const summary = `${fmt(data.n)} ${units} by quarter-century and tradition, from the ${ord(Math.floor(from / 100) + 1)} century to the ${ord(Math.ceil(to / 100))}; most in ${peakSpan} (${fmt(r.max)})${undated ? `; ${fmt(undated)} undated` : ''}`;
    return `<figure class="tg tg-era" id="${id}" data-tg="era">
      ${marks ? `<div class="tg-mks" aria-hidden="true">${marks}</div>` : ''}
      <div class="tg-plot" tabindex="0" role="img" aria-label="${esc(summary)}">
        <span class="tg-max" aria-hidden="true">${plural(r.max, opts.unit || 'author', units)}</span>${undated ? `<span class="tg-und" aria-hidden="true">${fmt(undated)} undated, not drawn</span>` : ''}
        <svg class="tg-bars" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${bars}</svg>
        <span class="tg-hi" hidden></span><div class="tg-tip" role="status" aria-live="polite" hidden></div>
      </div>
      <div class="tg-ax" aria-hidden="true">${centuries.join('')}</div>
      <div class="tg-eras" aria-hidden="true">${eras}</div>
      <figcaption class="tg-lgrow"><span class="tg-lg" role="group" aria-label="${esc(opts.legendLabel || 'Traditions shown')}">${legend.map((k) => data.b[k]
        ? `<button type="button" data-tg-k="${k}" aria-pressed="true">${dot(k)}${esc(name(k))}<span class="tg-ct">${fmt(t[k])}</span></button>`
        : `<span class="tg-lg-u">${dot(k)}${esc(name(k))}<span class="tg-ct">${fmt(t[k])} undated</span></span>`).join('')}${undated ? `<span class="tg-lg-u tg-und-lg" aria-hidden="true">${fmt(undated)} undated, not drawn</span>` : ''}</span></figcaption>
      <div id="${id}-sr" class="tg-srw">${sr}</div>
    </figure>`;
  }

  /* the readout of one column: its years, its count, the traditions in it */
  function eraTip(fig, r, i) {
    const tip = fig.querySelector('.tg-tip');
    const hi = fig.querySelector('.tg-hi');
    if (i == null || i < 0 || i >= r.tot.length) { tip.hidden = true; hi.hidden = true; r.cur = null; return; }
    r.cur = i;
    const size = r.data.size || 25;
    const b = r.b0 + i;
    const span = r.to - r.from;
    const rows = ORDER.filter((k) => r.data.b[k] && !r.off.has(k)).map((k) => [k, at(r.data.b[k], b)]).filter((x) => x[1]).sort((a, z) => z[1] - a[1]);
    tip.innerHTML = `<b>${yearSpan(b, size)}</b> <span class="tg-ct">${plural(r.tot[i], r.opts.unit || 'author', r.opts.units || 'authors')}</span>${rows.length ? `<span class="tg-tip-r">${rows.slice(0, 6).map(([k, n]) => `<span>${dot(k)}${esc(r.name(k))} <span class="tg-ct">${fmt(n)}</span></span>`).join('')}${rows.length > 6 ? `<span class="tg-ct">and ${plural(rows.length - 6, 'other', 'others')}</span>` : ''}</span>` : ''}`;
    const left = (b * size - r.from) / span * 100;
    const width = size / span * 100;
    hi.style.left = pct(left); hi.style.width = pct(width); hi.hidden = false;
    tip.hidden = false;
    const plot = fig.querySelector('.tg-plot');
    const pw = plot.clientWidth;
    const x = (left + width / 2) / 100 * pw;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.max(0, Math.min(pw - tw, x - tw / 2))}px`;
  }

  /* ── (a') THE MINIATURE ─────────────────────────────────────────────────────────────────────────────────────────────── */
  /* data {size, b, u, n}; opts: from (AD 100), to (1950), only (one shelf), label (a screen reader's name; without it the
     miniature is hidden from one, as an index row's counts say what it holds) */
  function eraMini(data, opts = {}) {
    const size = data.size || 50;
    const from = opts.from != null ? opts.from : 100;
    const to = opts.to != null ? opts.to : 1950;
    const keys = (opts.only ? [key(opts.only)] : ORDER).filter((k) => data.b && data.b[k]);
    const W = 300;
    const H = 40;
    const b0 = Math.floor(from / size);
    const b1 = Math.ceil(to / size);
    const tot = [];
    let max = 0;
    for (let i = b0; i < b1; i += 1) {
      let s = 0;
      for (const k of keys) s += at(data.b[k], i);
      tot.push(s);
      if (s > max) max = s;
    }
    const span = to - from;
    const w = size / span * W;
    const gap = Math.min(w * 0.18, 1.6);
    const base = new Array(b1 - b0).fill(0);
    let paths = '';
    for (const k of keys) {
      let d = '';
      for (let i = b0; i < b1; i += 1) {
        const v = at(data.b[k], i);
        if (!v || !max) continue;
        const h = Math.max(1.2, v / max * (H - 1));
        const x = (i * size - from) / span * W + gap / 2;
        const y = H - base[i - b0] - h;
        base[i - b0] += h;
        d += `M${x.toFixed(1)} ${y.toFixed(1)}h${(w - gap).toFixed(1)}v${h.toFixed(1)}h${(gap - w).toFixed(1)}z`;
      }
      if (d) paths += `<path d="${d}" fill="var(--tg-${k})"/>`;
    }
    let ticks = '';
    for (const c of [500, 1000, 1500]) if (c > from && c < to) ticks += `<line class="tg-grid" x1="${((c - from) / span * W).toFixed(1)}" x2="${((c - from) / span * W).toFixed(1)}" y1="0" y2="${H}"/>`;
    const peak = tot.indexOf(max);
    const label = opts.label ? ` role="img" aria-label="${esc(`${opts.label}: most in ${yearSpan(b0 + peak, size)}`)}"` : ' aria-hidden="true"';
    return `<svg class="tg-mini" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" focusable="false"${label}>${ticks}${paths}<line class="tg-base" x1="0" x2="${W}" y1="${H}" y2="${H}"/></svg>`;
  }
  /* the axis an index of miniatures shares, for its head: the centuries a miniature spans and the eras under them */
  function miniAxis(opts = {}) {
    const from = opts.from != null ? opts.from : 100;
    const to = opts.to != null ? opts.to : 1950;
    const span = to - from;
    return `<span class="tg tg-mini-ax" aria-hidden="true"><span class="a0">AD ${from}</span>${[500, 1000, 1500].filter((c) => c > from + 150 && c < to - 150).map((c) => `<span style="left:${pct((c - from) / span * 100)}">${c}</span>`).join('')}<span class="a1">${to}</span></span>`;
  }

  /* ── (b) THE POSITION BLOCK ─────────────────────────────────────────────────────────────────────────────────────────── */
  const yrOf = (h) => h.dates || (Number(h.y) > 0 && Number(h.y) < 9999 ? String(h.y) : '') || ((dateOf(nameOf(h)) || {}).dates || '');
  const citedOf = (h) => h.cited || (h.cite ? [h.cite] : []);
  const SHOWN = 6;
  function byTradition(hs) {
    const by = new Map();
    for (const h of hs) {
      const k = key(h.tradition || h.t);
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(h);
    }
    return [...by.entries()].sort((a, z) => z[1].length - a[1].length || ORDER.indexOf(a[0]) - ORDER.indexOf(z[0]))
      .map(([k, xs]) => [k, xs.slice().sort((a, z) => (yearOf(a) || 9999) - (yearOf(z) || 9999))]);
  }
  /* the pages an answer stands on, a line a work; each opens the reader, and the line's Preview opens its first page here */
  function pagesHTML(cited, o) {
    const by = new Map();
    for (const [w, p, t] of cited) {
      if (!by.has(w)) by.set(w, { t: t || w, ps: [] });
      const g = by.get(w);
      if (!g.ps.includes(p)) g.ps.push(p);
    }
    const pv = o.preview || (() => '');
    return [...by.entries()].map(([w, { t, ps }]) => (ps.length === 1
      ? `<span class="tg-pp"><a class="tg-pg" href="${esc(o.read(w, ps[0]))}" target="_blank" rel="noopener" title="${esc(t)}" aria-label="${esc(t)}, page ${esc(ps[0])}, opens the reader">p. ${esc(ps[0])}</a>${pv(w, ps[0])}</span>`
      : `<span class="tg-pp" title="${esc(t)}">pp. ${ps.map((p) => `<a class="tg-pg" href="${esc(o.read(w, p))}" target="_blank" rel="noopener" aria-label="${esc(t)}, page ${esc(p)}, opens the reader">${esc(p)}</a>`).join(', ')}${pv(w, ps[0], '', ps)}</span>`)).join('');
  }
  function rowHTML(h, i, o) {
    const c = citedOf(h);
    const works = [...new Set(c.map((x) => x[2] || x[0]))];
    return `<li class="tg-hr"${i >= SHOWN ? ' hidden' : ''}${h.line ? ` data-tg-pv-hl="${esc(String(h.line).slice(0, 400))}"` : ''}><span class="tg-h-who">${esc(h.author)}${yrOf(h) ? `<small>${esc(yrOf(h))}</small>` : ''}</span><span class="tg-h-line">${esc(h.line || '')}${works.length ? `<small class="tg-h-src">${works.map(esc).join('; ')}</small>` : ''}</span><span class="tg-h-pg">${pagesHTML(c, o)}</span></li>`;
  }
  function holdersHTML(hs, o, name, level) {
    return byTradition(hs).map(([k, xs]) => {
      const lid = uid('tg-hl');
      return `<section class="tg-tg" data-tg-k="${k}"><h${level} class="tg-tg-h">${dot(k)}${esc(name(k))}<span class="tg-ct"><span class="tg-sr">, </span>${fmt(xs.length)}</span></h${level}><ol class="tg-hl" id="${lid}">${xs.map((h, i) => rowHTML(h, i, o)).join('')}</ol>${xs.length > SHOWN ? `<button type="button" class="tg-more" aria-expanded="false" aria-controls="${lid}" data-n="${xs.length}">Show all ${fmt(xs.length)}</button>` : ''}</section>`;
    }).join('');
  }
  /* the share of the authors as a bar in the traditions' colours, the traditions named under it with their counts */
  function shareHTML(hs, total, name) {
    const tr = byTradition(hs);
    const share = total ? hs.length / total : 1;
    return `<div class="tg-pf"><span class="tg-pf-bar" role="img" aria-label="${esc(`${fmt(hs.length)} of ${fmt(total)} authors: ${tr.map(([k, xs]) => `${name(k)} ${xs.length}`).join(', ')}`)}"><span class="tg-pf-fill" style="width:${Math.max(1.5, Math.min(1, share) * 100).toFixed(1)}%">${tr.map(([k, xs]) => `<i style="flex-grow:${xs.length};--c:var(--tg-${k})"></i>`).join('')}</span></span>
      <p class="tg-pf-tr">${tr.map(([k, xs]) => `<span>${dot(k)}${esc(name(k))}<span class="tg-ct">${fmt(xs.length)}</span></span>`).join('')}</p></div>`;
  }
  /* p {id, label, holders [{author, tradition, y, dates, line, cited [[work, page, title]]}], summary, distinction, first};
     o {total, read(work, page) -> address, preview(work, page, hl, pages) -> HTML, labels, level (the heading's: 3), note (said
     in place of a thesis), open (the fold)} */
  function positionBlock(p, o = {}) {
    const hs = p.holders || [];
    const n = hs.length;
    const total = o.total || n;
    const level = o.level || 3;
    const name = namer(o.labels);
    const id = uid('tg-pos');
    const read = o.read || ((w, pg) => `/read?w=${encodeURIComponent(w)}#b${encodeURIComponent(pg)}-0`);
    REG.set(id, { kind: 'pos', hs, o: { ...o, read }, name, level: Math.min(6, level + 1), drawn: false });
    const first = p.first && p.first.author ? `<div><dt>Earliest</dt><dd>${esc(p.first.author)}${yrOf(p.first) ? `<span class="tg-muted">, ${esc(yrOf(p.first))}</span>` : ''}</dd></div>` : '';
    const turns = p.distinction ? `<div><dt>Turns on</dt><dd>${esc(p.distinction)}</dd></div>` : '';
    const open = o.open != null ? o.open : n <= SHOWN;
    return `<section class="tg tg-pos" id="${id}" aria-labelledby="${id}-h">
      <header class="tg-pos-h"><h${level} id="${id}-h">${esc(p.label)}</h${level}><span class="tg-ct">${fmt(n)} of ${plural(total, 'author', 'authors')}</span></header>
      ${shareHTML(hs, total, name)}
      ${p.summary ? `<p class="tg-thesis">${esc(p.summary)}</p>` : o.note ? `<p class="tg-thesis tg-muted">${esc(o.note)}</p>` : ''}
      ${turns || first ? `<dl class="tg-lab">${turns}${first}</dl>` : ''}
      ${n ? `<details class="tg-hold" data-tg-hold="${id}"${open ? ' open' : ''}><summary>${n === 1 ? 'The author' : `The ${fmt(n)} authors`}, by tradition</summary><div class="tg-hold-b">${open ? holdersHTML(hs, { ...o, read }, name, Math.min(6, level + 1)) : ''}</div></details>` : ''}
    </section>`;
  }
  /* the compact form ("Across the tradition"): a row for each position, its name, a bar of its share and its count */
  function positionRows(positions, o = {}) {
    const tot = positions.reduce((s, x) => s + (x[1] || 0), 0) || 1;
    return `<ol class="tg tg-across">${positions.map(([l, n]) => `<li><span class="tg-ac-l">${esc(l)}</span><span class="tg-ac-bar" aria-hidden="true"><i style="width:${Math.max(2, Math.round(n / tot * 100))}%"></i></span><span class="tg-ct">${fmt(n)}</span></li>`).join('')}</ol>`;
  }

  /* ── (c) THE QUESTION MAP ───────────────────────────────────────────────────────────────────────────────────────────── */
  /* qs [{id, q, authors, positions [[label, n]], first (a year), centuries [first century index, n, n, …] (index = year / 100),
     undated, links [{href, label, title}]}]; o {selected (an id), from and to (century indexes; the questions' own by default),
     caption}. A question's row is a button: choosing it raises "tg:question" on the map with its id. */
  function questionMap(qs, o = {}) {
    if (!qs.length) return '';
    const id = uid('tg-qm');
    const runs = qs.map((q) => q.centuries).filter((c) => c && c.length > 1);
    const c0 = o.from != null ? o.from : runs.length ? Math.min(...runs.map((c) => c[0])) : 1;
    const c1 = o.to != null ? o.to : runs.length ? Math.max(...runs.map((c) => c[0] + c.length - 2)) : 19;
    const cells = c1 - c0 + 1;
    let max = 0;
    for (const c of runs) for (let i = 1; i < c.length; i += 1) max = Math.max(max, c[i]);
    REG.set(id, { kind: 'qm' });
    const head = runs.length ? `<div class="tg-qm-ax" aria-hidden="true" style="--cells:${cells}">${Array.from({ length: cells }, (_, i) => {
      const n = c0 + i + 1;
      return `<span class="${n % 2 ? '' : 'e2'}${n % 4 ? '' : ' e4'}">${ord(n)}</span>`;
    }).join('')}</div>` : '';
    const row = (q) => {
      const c = q.centuries;
      const pos = (q.positions || []).slice().sort((a, z) => z[1] - a[1]);
      const placed = pos.reduce((s, x) => s + x[1], 0);
      let peak = -1;
      let pk = 0;
      const strip = c && c.length > 1 ? Array.from({ length: cells }, (_, i) => {
        const ci = c0 + i;
        const v = ci >= c[0] && ci < c[0] + c.length - 1 ? c[ci - c[0] + 1] : 0;
        if (v > pk) { pk = v; peak = ci; }
        return `<i${v ? ` style="--a:${(0.14 + 0.86 * Math.sqrt(v / max)).toFixed(3)}"` : ''} title="${ord(ci + 1)} century: ${plural(v, 'author', 'authors')}"></i>`;
      }).join('') : '';
      const answered = c && c.length > 1 ? `answered from the ${ord(c[0] + 1)} century${peak >= 0 ? `, most in the ${ord(peak + 1)} (${fmt(pk)})` : ''}` : (Number(q.first) > 0 && Number(q.first) < 9999 ? `answered from the ${ord(Math.floor(Number(q.first) / 100) + 1)} century` : '');
      const shares = pos.length ? `<span class="tg-qm-split" role="img" aria-label="${esc(`${plural(pos.length, 'position', 'positions')}: ${pos.map(([l, n]) => `${l} ${n}`).join('; ')}`)}">${pos.map(([l, n], i) => `<i style="flex-grow:${n};--a:${Math.max(0.2, 1 - i * 0.24).toFixed(2)}" title="${esc(`${l}: ${plural(n, 'author', 'authors')}`)}"></i>`).join('')}</span>` : '<span class="tg-qm-split tg-qm-none" aria-hidden="true"></span>';
      return `<li class="tg-qm-row${q.id === o.selected ? ' is-on' : ''}" data-tg-q="${esc(q.id)}">
        <button type="button" class="tg-qm-q" data-tg-q="${esc(q.id)}" aria-pressed="${String(q.id === o.selected)}"${o.controls ? ` aria-controls="${esc(o.controls)}"` : ''}>${esc(q.q)}</button>
        ${strip ? `<span class="tg-qm-time" style="--cells:${cells}" role="img" aria-label="${esc(answered)}">${strip}</span>` : `<span class="tg-qm-time tg-muted">${esc(answered)}</span>`}
        <span class="tg-qm-pos">${shares}<span class="tg-ct">${pos.length ? `${plural(pos.length, 'position', 'positions')} · ${plural(placed || q.authors || 0, 'author', 'authors')}` : q.authors ? plural(q.authors, 'author', 'authors') : ''}</span></span>
        <span class="tg-qm-go">${(q.links || []).map((l) => `<a href="${esc(l.href)}"${l.title ? ` aria-label="${esc(l.title)}"` : ''}>${esc(l.label)}</a>`).join('')}</span>
      </li>`;
    };
    return `<div class="tg tg-qm" id="${id}" data-tg="qm">
      <div class="tg-qm-head" aria-hidden="true"><span>${esc(o.caption || 'Question')}</span>${head ? `<span>${esc(o.timeLabel || 'Authors answering, by century')}</span>` : '<span></span>'}<span>${esc(o.splitLabel || 'Positions, largest first')}</span><span></span></div>
      ${head ? `<div class="tg-qm-axrow" aria-hidden="true"><span></span>${head}<span></span><span></span></div>` : ''}
      <ol class="tg-qm-list">${qs.map(row).join('')}</ol>
    </div>`;
  }

  /* ── (d) THE SCRIPTURE BAND ─────────────────────────────────────────────────────────────────────────────────────────── */
  /* the canon as the library's Bible page names it (v1/bible/all/books.json): slug, name, chapters, the short name a label uses */
  const CANON = [['genesis', 'Genesis', 50, 'Gen'], ['exodus', 'Exodus', 40, 'Exod'], ['leviticus', 'Leviticus', 27, 'Lev'], ['numbers', 'Numbers', 36, 'Num'],
    ['deuteronomy', 'Deuteronomy', 34, 'Deut'], ['joshua', 'Joshua', 24, 'Josh'], ['judges', 'Judges', 21, 'Judg'], ['ruth', 'Ruth', 4, 'Ruth'],
    ['i-samuel', 'I Samuel', 31, 'I Sam'], ['ii-samuel', 'II Samuel', 24, 'II Sam'], ['i-kings', 'I Kings', 22, 'I Kgs'], ['ii-kings', 'II Kings', 25, 'II Kgs'],
    ['i-chronicles', 'I Chronicles', 29, 'I Chr'], ['ii-chronicles', 'II Chronicles', 36, 'II Chr'], ['ezra', 'Ezra', 10, 'Ezra'], ['nehemiah', 'Nehemiah', 13, 'Neh'],
    ['esther', 'Esther', 10, 'Esth'], ['job', 'Job', 42, 'Job'], ['psalms', 'Psalms', 150, 'Ps'], ['proverbs', 'Proverbs', 31, 'Prov'],
    ['ecclesiastes', 'Ecclesiastes', 12, 'Eccl'], ['song-of-solomon', 'Song of Solomon', 8, 'Song'], ['isaiah', 'Isaiah', 66, 'Isa'], ['jeremiah', 'Jeremiah', 52, 'Jer'],
    ['lamentations', 'Lamentations', 5, 'Lam'], ['ezekiel', 'Ezekiel', 48, 'Ezek'], ['daniel', 'Daniel', 12, 'Dan'], ['hosea', 'Hosea', 14, 'Hos'],
    ['joel', 'Joel', 3, 'Joel'], ['amos', 'Amos', 9, 'Amos'], ['obadiah', 'Obadiah', 1, 'Obad'], ['jonah', 'Jonah', 4, 'Jonah'], ['micah', 'Micah', 7, 'Mic'],
    ['nahum', 'Nahum', 3, 'Nah'], ['habakkuk', 'Habakkuk', 3, 'Hab'], ['zephaniah', 'Zephaniah', 3, 'Zeph'], ['haggai', 'Haggai', 2, 'Hag'],
    ['zechariah', 'Zechariah', 14, 'Zech'], ['malachi', 'Malachi', 4, 'Mal'],
    ['matthew', 'Matthew', 28, 'Matt'], ['mark', 'Mark', 16, 'Mark'], ['luke', 'Luke', 24, 'Luke'], ['john', 'John', 21, 'John'], ['acts', 'Acts', 28, 'Acts'],
    ['romans', 'Romans', 16, 'Rom'], ['i-corinthians', 'I Corinthians', 16, 'I Cor'], ['ii-corinthians', 'II Corinthians', 13, 'II Cor'], ['galatians', 'Galatians', 6, 'Gal'],
    ['ephesians', 'Ephesians', 6, 'Eph'], ['philippians', 'Philippians', 4, 'Phil'], ['colossians', 'Colossians', 4, 'Col'], ['i-thessalonians', 'I Thessalonians', 5, 'I Thess'],
    ['ii-thessalonians', 'II Thessalonians', 3, 'II Thess'], ['i-timothy', 'I Timothy', 6, 'I Tim'], ['ii-timothy', 'II Timothy', 4, 'II Tim'], ['titus', 'Titus', 3, 'Titus'],
    ['philemon', 'Philemon', 1, 'Phlm'], ['hebrews', 'Hebrews', 13, 'Heb'], ['james', 'James', 5, 'Jas'], ['i-peter', 'I Peter', 5, 'I Pet'], ['ii-peter', 'II Peter', 3, 'II Pet'],
    ['i-john', 'I John', 5, 'I John'], ['ii-john', 'II John', 1, 'II John'], ['iii-john', 'III John', 1, 'III John'], ['jude', 'Jude', 1, 'Jude'],
    ['revelation-of-john', 'Revelation of John', 22, 'Rev'],
    ['tobit', 'Tobit', 14, 'Tob'], ['judith', 'Judith', 16, 'Jdt'], ['wisdom', 'Wisdom', 19, 'Wis'], ['sirach', 'Sirach', 51, 'Sir'], ['baruch', 'Baruch', 6, 'Bar'],
    ['i-maccabees', 'I Maccabees', 16, 'I Macc'], ['ii-maccabees', 'II Maccabees', 15, 'II Macc']];
  const BOOK = new Map(CANON.map((b, i) => [b[0], { slug: b[0], name: b[1], ch: b[2], abbr: b[3], i }]));
  const TESTAMENTS = [['Old Testament', 0, 39, ['genesis', 'deuteronomy', 'psalms', 'isaiah', 'jeremiah', 'ezekiel']],
    ['New Testament', 39, 66, ['matthew', 'luke', 'john', 'acts', 'romans', 'hebrews', 'revelation-of-john']],
    ['Deuterocanon', 66, 73, ['wisdom', 'sirach', 'i-maccabees']]];
  const chapterName = (b, c) => (b.slug === 'psalms' ? `Psalm ${c}` : `${b.name} ${c}`);
  const chapterShort = (b, c) => `${b.abbr} ${c}`;
  /* rows [[book slug, chapter, n]], most cited first; o {href(slug, chapter) -> the Bible page, list (how many to list: 10),
     named (how many to name over their bars: 6), unit ("citations")} */
  function scriptureBand(rows, o = {}) {
    const good = (rows || []).map(([s, c, n]) => [BOOK.get(s), Number(c), Number(n) || 0]).filter(([b, c, n]) => b && c >= 1 && c <= b.ch && n > 0);
    if (!good.length) return '';
    const id = uid('tg-sb');
    const href = o.href || ((s, c) => `/bible#b/${encodeURIComponent(s)}/${c}`);
    const max = Math.max(...good.map((r) => r[2]));
    const top = good.slice().sort((a, z) => z[2] - a[2]);
    const named = new Set(top.slice(0, o.named != null ? o.named : 6).map(([b, c]) => `${b.slug}.${c}`));
    const unit = o.unit || 'citations';
    REG.set(id, { kind: 'sb' });
    const panels = TESTAMENTS.map(([label, a, z, ticks]) => {
      const books = CANON.slice(a, z);
      const total = books.reduce((s, b) => s + b[2], 0);
      const mine = good.filter(([b]) => b.i >= a && b.i < z);
      if (!mine.length && label === 'Deuterocanon') return '';
      const off = new Map();
      let acc = 0;
      for (const b of books) { off.set(b[0], acc); acc += b[2]; }
      const W = 1000;
      const H = 100;
      const unitW = W / total;
      const bw = Math.max(unitW * 0.82, 3);
      let bounds = '';
      acc = 0;
      for (const b of books) { if (acc) bounds += `<line class="tg-grid" x1="${(acc * unitW).toFixed(2)}" x2="${(acc * unitW).toFixed(2)}" y1="${H - 12}" y2="${H}"/>`; acc += b[2]; }
      const bars = mine.map(([b, c, n]) => {
        const x = (off.get(b.slug) + c - 0.5) * unitW;
        const h = Math.max(2, n / max * (H - 2));
        return `<rect class="tg-sb-b${named.has(`${b.slug}.${c}`) ? ' is-named' : ''}" x="${(x - bw / 2).toFixed(2)}" y="${(H - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}"><title>${esc(`${chapterName(b, c)}: ${fmt(n)} ${unit}`)}</title></rect>`;
      }).join('');
      const labels = mine.filter(([b, c]) => named.has(`${b.slug}.${c}`)).map(([b, c, n]) => `<a class="tg-mk" data-x="${(((off.get(b.slug) + c - 0.5) * unitW) / W * 100).toFixed(3)}" data-p="${top.findIndex((r) => r[0] === b && r[1] === c)}" href="${esc(href(b.slug, c))}" aria-label="${esc(`${chapterName(b, c)}, ${fmt(n)} ${unit}`)}"><i aria-hidden="true"></i><b>${esc(chapterShort(b, c))}</b></a>`).join('');
      const tickLabels = ticks.map((s) => BOOK.get(s)).map((b) => `<span style="left:${pct((off.get(b.slug) + b.ch / 2) / total * 100)}">${esc(b.abbr)}</span>`).join('');
      return `<div class="tg-sb-p${label === 'Deuterocanon' ? ' is-dc' : ''}"><span class="tg-sb-pl">${esc(label)}</span>
        ${labels ? `<div class="tg-mks">${labels}</div>` : '<div class="tg-mks"></div>'}
        <svg class="tg-sb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${bounds}${bars}<line class="tg-base" x1="0" x2="${W}" y1="${H}" y2="${H}"/></svg>
        <div class="tg-sb-ax" aria-hidden="true">${tickLabels}</div></div>`;
    }).join('');
    const list = top.slice(0, o.list != null ? o.list : 10);
    return `<div class="tg tg-sb" id="${id}" data-tg="sb">
      <div class="tg-sb-ps">${panels}</div>
      <ol class="tg-sb-list" aria-label="${esc(o.listLabel || 'The chapters most cited')}">${list.map(([b, c, n]) => `<li><a href="${esc(href(b.slug, c))}">${esc(chapterName(b, c))}</a><span class="tg-ct">${fmt(n)}</span></li>`).join('')}</ol>
    </div>`;
  }

  /* ── THE PAGE PREVIEW (maps.html's PVW, lifted) ─────────────────────────────────────────────────────────────────────── */
  /* A page reference keeps its link to the reader and gains a Preview that opens the page itself under its row: the page window
     (page-window.js) shows the cited page with the passage marked, the pages before and after, and the English, the source or both.
     A Father in Migne or an EEBO book, which the page window cannot read, is read by the Scripture page's reader of them
     (FRCommentaryText, commentary-pane.js, loaded on the first such preview with its pane left off); failing both, the button turns
     into the reader link. One preview a column (cfg.col): opening another there closes it; Escape closes it. One controller a page. */
  let PV = null;
  function preview(cfg = {}) {
    if (PV) return PV;
    const FAMILY = /^(?:pld|pg|po|eebo)-\d+$/;
    const NONE = new Set();
    const OPEN = [];
    const read = cfg.read || ((w, p) => `/read?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`);
    let seq = 0;
    let text = null;
    const at2 = (w, p) => `${/^(?:pld|pg)-/.test(w) ? 'col.' : 'p.'} ${p}`;
    const can = (w) => !FAMILY.test(w) || !!cfg.text;
    const reader = () => text || (text = window.FRCommentaryText ? Promise.resolve(window.FRCommentaryText) : new Promise((res) => {
      window.FR_COMMENTARY_PANE = false;
      const s = document.createElement('script');
      s.src = cfg.text;
      s.onload = () => res(window.FRCommentaryText || null);
      s.onerror = () => res(null);
      document.head.appendChild(s);
    }));
    async function fill(el, w, p, hl) {
      try {
        if (FAMILY.test(w)) { const T = cfg.text ? await reader() : null; return T ? await T.fill(el, { slug: w, page: p }) : false; }
        return window.FRPageWindow ? await window.FRPageWindow.fill(el, { slug: w, page: p, hl }) : false;
      } catch (_) { return false; }
    }
    const link = (w, p) => `<a class="tg-pvb" href="${esc(read(w, p))}" target="_blank" rel="noopener">Open in the reader</a>`;
    function btn(w, p, hl, ps) {
      if (!w || p == null || p === '') return '';
      if (!can(w) || NONE.has(`${w}|${p}`)) return link(w, p);
      return `<button type="button" class="tg-pvb" data-tg-pv="${esc(w)}|${esc(p)}"${ps && ps.length > 1 ? ` data-tg-pv-pages="${esc(ps.join(','))}"` : ''} aria-expanded="false" aria-label="Preview ${esc(at2(w, p))}">Preview</button>`;
    }
    function close(box, focus) {
      if (!box) return false;
      const i = OPEN.indexOf(box);
      if (i >= 0) OPEN.splice(i, 1);
      const t = box._t;
      const was = box.isConnected;
      box.remove();
      if (t && t.isConnected) { t.removeAttribute('aria-controls'); t.setAttribute('aria-expanded', 'false'); if (focus) t.focus(); }
      return was;
    }
    async function show(box, w, p) {
      const t = box._t;
      const hl = ((t.closest('[data-tg-pv-hl]') || {}).dataset || {}).tgPvHl || '';
      const body = document.createElement('div');
      body.className = 'tg-pvw-body';
      body.innerHTML = '<p class="pw-wait" role="status">Loading the page…</p>';
      box.querySelector('.tg-pvw-body').replaceWith(body);
      box.querySelector('.tg-pvw-at').textContent = at2(w, p);
      box.querySelector('.tg-pvw-open').href = read(w, p);
      box.querySelectorAll('[data-tg-pv-page]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tgPvPage === String(p))));
      const ok = await fill(body, w, p, hl);
      if (!body.isConnected) return;
      if (ok) { box.scrollIntoView({ block: 'nearest' }); return; }
      NONE.add(`${w}|${p}`);
      if (t.tagName === 'BUTTON' && !box.querySelector('[data-tg-pv-page]')) {
        const a = document.createElement('a');
        const had = box.contains(document.activeElement) || document.activeElement === t;
        a.className = 'tg-pvb'; a.href = read(w, p); a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Open in the reader';
        close(box, false); t.replaceWith(a); if (had) a.focus();
        return;
      }
      body.innerHTML = `<p class="pw-wait">This page cannot be shown here. <a href="${esc(read(w, p))}" target="_blank" rel="noopener">Open ${esc(at2(w, p))} in the reader</a></p>`;
    }
    function open(t) {
      const [w, p] = t.dataset.tgPv.split('|');
      const host = t.closest(cfg.host || '.tg-hr') || t.closest('div,section,article,li,figure') || t.parentElement;
      const col = t.closest(cfg.col || '.tg-pos');
      const was = OPEN.some((b) => b.isConnected && b._t === t);
      for (const b of OPEN.slice()) if (!b.isConnected || b.closest(cfg.col || '.tg-pos') === col) close(b, false);
      if (was) return;
      const ps = (t.dataset.tgPvPages || '').split(',').filter(Boolean);
      const box = document.createElement('div');
      box.className = 'tg-pvw';
      box.id = `tg-pvw-${++seq}`;
      box._t = t;
      box.innerHTML = `<div class="tg-pvw-head"><span class="tg-pvw-at"></span>${ps.length > 1 ? `<span class="tg-pvw-pp" role="group" aria-label="The pages cited">${ps.map((x) => `<button type="button" data-tg-pv-page="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join('')}</span>` : ''}<a class="tg-pvw-open" target="_blank" rel="noopener">Open in the reader</a><button type="button" class="tg-pvw-x" data-tg-pv-close>Close preview</button></div><div class="tg-pvw-body"></div>`;
      host.appendChild(box);
      t.setAttribute('aria-expanded', 'true');
      t.setAttribute('aria-controls', box.id);
      OPEN.push(box);
      show(box, w, p);
    }
    document.addEventListener('click', (e) => {
      const x = e.target.closest('[data-tg-pv-close]');
      if (x) { close(x.closest('.tg-pvw'), true); return; }
      const n = e.target.closest('[data-tg-pv-page]');
      if (n) { const box = n.closest('.tg-pvw'); if (box && box._t && box._t.dataset.tgPv) show(box, box._t.dataset.tgPv.split('|')[0], n.dataset.tgPvPage); return; }
      const t = e.target.closest('[data-tg-pv]');
      if (!t || (t.tagName === 'A' && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0))) return;
      e.preventDefault();
      open(t);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const a = document.activeElement;
      const box = (a && a.closest && a.closest('.tg-pvw')) || OPEN.filter((b) => b.isConnected).pop();
      if (close(box, true)) e.preventDefault();
    });
    PV = { btn, can };
    return PV;
  }

  /* ── MOUNT: what a page has drawn inside root comes alive ───────────────────────────────────────────────────────────── */
  /* label lanes: each name over the bars at its x, in the lowest lane where it meets no other, the rest hidden; a name keeps a
     hairline down to its own x when the edge of the figure moves it aside */
  function lanes(box, maxLanes) {
    const marks = [...box.querySelectorAll(':scope > .tg-mk')];
    const W = box.clientWidth;
    if (!marks.length || !W) return 0;
    const placed = [];
    let used = 0;
    marks.sort((a, z) => Number(a.dataset.p || 0) - Number(z.dataset.p || 0));
    for (const m of marks) {
      m.hidden = false;
      const x = Number(m.dataset.x) / 100 * W;
      const w = m.offsetWidth;
      const left = Math.max(0, Math.min(W - w, x - w / 2));
      const right = left + w;
      /* a name keeps clear of the names in its lane; its hairline, which runs down through the lanes below, keeps clear of the
         names there; and the hairlines of the names above keep clear of it */
      const free = (lane) => placed.every((p) => (p.lane === lane ? right + 10 <= p.a || left >= p.z + 10
        : p.lane < lane ? !(x > p.a - 4 && x < p.z + 4) : !(p.x > left - 4 && p.x < right + 4)));
      let lane = 0;
      while (lane < maxLanes && !free(lane)) lane += 1;
      if (lane >= maxLanes) { m.hidden = true; continue; }
      placed.push({ lane, a: left, z: right, x });
      used = Math.max(used, lane + 1);
      m.style.left = `${left}px`;
      m.style.setProperty('--lane', lane);
      m.style.setProperty('--tick', `${Math.round(x - left)}px`);
    }
    box.style.setProperty('--lanes', used || 1);
    return used;
  }
  /* a label that does not fit its span (an era, a century, a book) stays out of sight rather than overrun its neighbour */
  function fit(row, overlap) {
    let last = -Infinity;
    for (const s of row.children) {
      s.style.visibility = '';
      const r = s.getBoundingClientRect();
      if (!r.width) continue;
      const over = s.scrollWidth > s.clientWidth + 1 || (overlap && r.left < last + 6);
      if (over) s.style.visibility = 'hidden'; else last = r.right;
    }
  }
  function layout(rootEl) {
    /* a legend that would wrap by an entry or two draws its entries closer; one that wraps anyway (a phone) keeps its air */
    rootEl.querySelectorAll('.tg-era .tg-lg').forEach((lg) => {
      lg.classList.remove('is-tight');
      const items = [...lg.children].filter((c) => c.offsetParent !== null);
      if (items.length < 2) return;
      const wraps = () => items[items.length - 1].offsetTop > items[0].offsetTop + 2;
      if (wraps()) { lg.classList.add('is-tight'); if (wraps()) lg.classList.remove('is-tight'); }
    });
    rootEl.querySelectorAll('.tg-era').forEach((fig) => {
      const mk = fig.querySelector('.tg-mks');
      if (mk) lanes(mk, 3);
      fig.querySelectorAll('.tg-eras').forEach((row) => fit(row, false));
    });
    rootEl.querySelectorAll('.tg-sb').forEach((sb) => {
      const boxes = [...sb.querySelectorAll('.tg-sb-p .tg-mks')];
      const most = Math.max(1, ...boxes.map((mk) => lanes(mk, 2)));
      /* side by side, the panels keep one baseline */
      const tops = new Set(boxes.map((mk) => Math.round(mk.getBoundingClientRect().top)));
      if (tops.size === 1) boxes.forEach((mk) => mk.style.setProperty('--lanes', most));
      sb.querySelectorAll('.tg-sb-ax').forEach((row) => fit(row, true));
    });
  }
  const eraOf = (fig) => REG.get(fig.id);
  function binAt(fig, r, clientX) {
    const plot = fig.querySelector('.tg-plot');
    const rect = plot.getBoundingClientRect();
    const year = r.from + (clientX - rect.left) / rect.width * (r.to - r.from);
    return Math.floor(year / (r.data.size || 25)) - r.b0;
  }
  function mount(rootEl) {
    if (!rootEl || rootEl.__tg) return rootEl;
    rootEl.__tg = true;
    rootEl.addEventListener('click', (e) => {
      const go = e.target.closest('[data-tg-go]');
      if (go) {
        const t = document.getElementById(go.dataset.tgGo);
        if (!t) return;
        t.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        const h = t.matches('h1,h2,h3,summary') ? t : t.querySelector('h2,h3,summary');
        if (h) { if (!h.matches('summary') && !h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
        return;
      }
      const k = e.target.closest('.tg-lg button[data-tg-k]');
      if (k) {
        const fig = k.closest('.tg-era');
        const r = eraOf(fig);
        if (!r) return;
        const all = [...fig.querySelectorAll('.tg-lg button[data-tg-k]')].map((b) => b.dataset.tgK);
        if (r.off.has(k.dataset.tgK)) r.off.delete(k.dataset.tgK); else r.off.add(k.dataset.tgK);
        if (r.off.size === all.length) r.off.clear();
        fig.querySelectorAll('.tg-lg button[data-tg-k]').forEach((b) => b.setAttribute('aria-pressed', String(!r.off.has(b.dataset.tgK))));
        fig.querySelector('.tg-bars').innerHTML = eraBars(r);
        fig.querySelector('.tg-max').textContent = plural(r.max, r.opts.unit || 'author', r.opts.units || 'authors');
        if (r.cur != null) eraTip(fig, r, r.cur);
        return;
      }
      const more = e.target.closest('button.tg-more');
      if (more) {
        const opening = more.getAttribute('aria-expanded') !== 'true';
        const ol = document.getElementById(more.getAttribute('aria-controls'));
        [...ol.children].forEach((li, i) => { if (i >= SHOWN) li.hidden = !opening; });
        more.setAttribute('aria-expanded', String(opening));
        more.textContent = opening ? 'Show fewer' : `Show all ${fmt(Number(more.dataset.n))}`;
        if (!opening && more.getBoundingClientRect().top < 0) ol.scrollIntoView({ block: 'start' });
        return;
      }
      const q = e.target.closest('button.tg-qm-q');
      if (q) {
        const map = q.closest('.tg-qm');
        map.querySelectorAll('.tg-qm-row').forEach((row) => {
          const on = row.dataset.tgQ === q.dataset.tgQ;
          row.classList.toggle('is-on', on);
          row.querySelector('.tg-qm-q').setAttribute('aria-pressed', String(on));
        });
        map.dispatchEvent(new CustomEvent('tg:question', { bubbles: true, detail: { id: q.dataset.tgQ } }));
      }
    });
    rootEl.addEventListener('toggle', (e) => {
      const d = e.target;
      if (!d.matches || !d.matches('details.tg-hold') || !d.open) return;
      const r = REG.get(d.dataset.tgHold);
      const body = d.querySelector('.tg-hold-b');
      if (r && body && !body.childElementCount) body.innerHTML = holdersHTML(r.hs, r.o, r.name, r.level);
    }, true);
    rootEl.addEventListener('pointermove', (e) => {
      const plot = e.target.closest && e.target.closest('.tg-era .tg-plot');
      if (!plot) return;
      const fig = plot.closest('.tg-era');
      const r = eraOf(fig);
      if (r) eraTip(fig, r, binAt(fig, r, e.clientX));
    });
    rootEl.addEventListener('pointerout', (e) => {
      const plot = e.target.closest && e.target.closest('.tg-era .tg-plot');
      if (!plot || plot.contains(e.relatedTarget)) return;
      const fig = plot.closest('.tg-era');
      const r = eraOf(fig);
      if (r && document.activeElement !== plot) eraTip(fig, r, null);
    });
    rootEl.addEventListener('keydown', (e) => {
      const plot = e.target.closest && e.target.closest('.tg-era .tg-plot');
      if (!plot) return;
      const fig = plot.closest('.tg-era');
      const r = eraOf(fig);
      if (!r) return;
      const last = r.tot.length - 1;
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (step) {
        e.preventDefault();
        let i = r.cur == null ? (step > 0 ? -1 : last + 1) : r.cur;
        do { i += step; } while (i >= 0 && i <= last && !r.tot[i]);
        if (i >= 0 && i <= last) eraTip(fig, r, i);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        let i = e.key === 'Home' ? 0 : last;
        while (i >= 0 && i <= last && !r.tot[i]) i += e.key === 'Home' ? 1 : -1;
        eraTip(fig, r, i);
      } else if (e.key === 'Escape') eraTip(fig, r, null);
    });
    rootEl.addEventListener('focusout', (e) => {
      const plot = e.target.closest && e.target.closest('.tg-era .tg-plot');
      if (!plot) return;
      const fig = plot.closest('.tg-era');
      const r = eraOf(fig);
      if (r) eraTip(fig, r, null);
    });
    layout(rootEl);
    if (typeof ResizeObserver === 'function') {
      let raf = 0;
      const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => layout(rootEl)); });
      ro.observe(rootEl);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout(rootEl));
    return rootEl;
  }

  /* the author dates for a page's own use: dates.ready (a promise: true once the key is in), dates.get(name) (his record or null),
     dates.year(name) (the year to draw him at, 0 when undated), dates.label(name) (his dates as a line of text); year(item) is an
     item's own year, else the key's for its name */
  const dates = {
    get ready() { return loadDates(); },
    get: (name) => dateOf(name),
    year: (name) => goodYear((dateOf(name) || {}).y),
    label: (name) => (dateOf(name) || {}).dates || '',
  };

  return { TRADITIONS, ERAS, CANON, key, colour, label: (k, labels) => namer(labels)(key(k)), bin, year: yearOf, dates, eraStrip, eraMini, miniAxis, positionBlock, positionRows, questionMap, scriptureBand, preview, mount, layout, esc, fmt, ord };
});
