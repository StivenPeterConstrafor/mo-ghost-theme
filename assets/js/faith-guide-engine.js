/* The shelf guides' shared engine (10-10). Each guide's own scenes live in its page; this file only gives them the common parts:
   reader links, pinned scroll chapters (GSAP ScrollTrigger; stacked and static on phones or with reduced motion), count-ups,
   reveal-on-scroll, a conic map of Europe and the Mediterranean, and the lifelines explorer every shelf ends with. */
window.TG = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasG = !!(window.gsap && window.ScrollTrigger);
  if (hasG) gsap.registerPlugin(ScrollTrigger);
  const root = document.querySelector('.tg');
  // reader links: absolute in the stand-alone previews, relative on MereO itself (the theme sets data-base="")
  const BASE = root && root.dataset.base != null ? root.dataset.base : 'https://mereorthodoxy.com';
  // on MereO the masthead and the rail stay on screen: pinned chapters start under them
  // (MereO hides its masthead on scroll and keeps the TFR rail: the rail's height is what stays on screen)
  const pinTop = () => !root?.dataset.pinBelow ? 0 : [...document.querySelectorAll(root.dataset.pinBelow)].filter((e) => /sticky|fixed/.test(getComputedStyle(e).position)).reduce((t, e) => t + e.getBoundingClientRect().height, 0);
  if (root) root.style.setProperty('--tg-pin', `${pinTop()}px`);
  // refresh the pins when the page above them changes height (a hero that rearranges itself, a fold that opens)
  if (root && hasG && 'ResizeObserver' in window) { let h0 = 0, rt; new ResizeObserver(() => { const h = root.offsetHeight; if (Math.abs(h - h0) < 40) return; h0 = h; clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); }).observe(root); }
  const TG = {
    reduce, hasG,
    pinOK: () => hasG && !reduce && innerWidth > 860,
    esc: (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])),
    read: (slug, n) => `${BASE}/the-faith-received/read/?w=${encodeURIComponent(slug)}${n ? `#b${n}-0` : ''}`,
    href: (path) => `${BASE}/the-faith-received/${path}`,
    css: (n) => getComputedStyle(root).getPropertyValue(n).trim(),
    fmt: (n) => Number(n).toLocaleString('en-US'),
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    ease: (t) => 1 - (1 - t)**3,
    lerp: (a, b, t) => a + (b - a) * t,
  };
  // data: inline <script type="application/json" id="tg-<name>"> in the stand-alone page, or the theme's asset URL in data-<name>
  TG.load = (name) => {
    const el = document.getElementById(`tg-${name}`);
    const got = el ? Promise.resolve(JSON.parse(el.textContent)) : fetch(root.dataset[name]).then((r) => r.json());
    if (name === 'data') got.then((D) => { if (D && D.keys) setTimeout(() => TG.keynames(D), 0); });
    return got;
  };
  TG.yr = (a) => (a.y0 && a.y1 ? (a.y0 === a.y1 ? `${a.y0}` : `${a.y0}–${a.y1}`) : a.d || '');
  // count a number up when it scrolls into view
  TG.countUp = (el, to, dur = 1.6) => {
    if (!hasG || reduce) { el.textContent = TG.fmt(to); return; }
    const o = { v: 0 }; el.textContent = '0';
    gsap.to(o, { v: to, duration: dur, ease: 'power2.out', onUpdate() { el.textContent = TG.fmt(Math.round(o.v)); }, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  };
  TG.reveal = (sel) => {
    const els = [...document.querySelectorAll(sel)];
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    els.forEach((e) => io.observe(e));
  };
  // a pinned chapter: onUpdate(progress 0..1) while it is scrubbed; on phones and with reduced motion it gets its last state once
  TG.chapter = (sel, length, onUpdate, opts = {}) => {
    const el = document.querySelector(sel);
    if (!TG.pinOK()) { onUpdate(1, true); return null; }
    onUpdate(0, false);
    return ScrollTrigger.create({ trigger: el, start: () => `top top+=${pinTop()}`, end: `+=${length}`, pin: true, scrub: opts.scrub ?? 0.6, anticipatePin: 1,
      onUpdate: (st) => onUpdate(st.progress, false) });
  };
  // the chronicle beside a map: which entry is "now"
  TG.chronicle = (ul, events, render) => {
    ul.innerHTML = events.map(render).join('');
    const lis = [...ul.children];
    return (year) => {
      let now = -1; events.forEach((e, i) => { if (e[0] <= year) now = i; });
      lis.forEach((li, i) => { li.classList.toggle('now', i === now); li.classList.toggle('past', i < now); });
      if (now >= 0 && TG.pinOK()) { const li = lis[now]; ul.scrollTop = Math.max(0, li.offsetTop - ul.clientHeight * 0.3); }
      return now;
    };
  };
  // Europe and the Mediterranean: Lambert conformal conic fitted to a lon/lat box; the land is drawn once into an SVG
  TG.map = (box, land, extent, opts = {}) => {
    const svg = d3.select(box.querySelector('svg')); let proj, W, H;
    const fit = () => {
      W = box.clientWidth; H = box.clientHeight;
      const [[x0, y0], [x1, y1]] = extent;
      proj = d3.geoConicConformal().parallels(opts.parallels || [38, 56]).rotate([-(x0 + x1) / 2, 0])
        .fitExtent([[6, 6], [W - 6, H - 6]], { type: 'MultiPoint', coordinates: [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [(x0 + x1) / 2, y1 + 1.5]] });
      svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
      const g = svg.append('g');
      g.append('path').datum({ type: 'Feature', geometry: land }).attr('d', d3.geoPath(proj)).attr('fill', TG.css('--land')).attr('stroke', TG.css('--coast')).attr('stroke-width', 0.8);
      const grat = d3.geoGraticule().step([10, 10]).extent([[x0 - 10, y0 - 10], [x1 + 10, y1 + 10]]);
      g.append('path').datum(grat()).attr('d', d3.geoPath(proj)).attr('fill', 'none').attr('stroke', TG.css('--rule')).attr('stroke-width', 0.4).attr('stroke-dasharray', '2 3').lower();
      M.proj = proj; M.W = W; M.H = H; if (M.onfit) M.onfit();
    };
    const M = { fit, xy: (lonlat) => proj([lonlat[1], lonlat[0]]) };
    fit(); let t; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (Math.abs(box.clientWidth - W) > 2 || Math.abs(box.clientHeight - H) > 2) fit(); }, 120); }).observe(box);
    return M;
  };
  TG.canvas = (cv) => { const c = { cv, ctx: cv.getContext('2d') }; c.size = () => { const d = devicePixelRatio || 1; c.W = cv.clientWidth; c.H = cv.clientHeight; cv.width = c.W * d; cv.height = c.H * d; c.ctx.setTransform(d, 0, 0, d, 0, 0); }; c.size(); return c; };

  /* ---------- the finder every guide ends with (owner 10-10: "the previous dropdown selection tools … add that same capability elsewhere"):
     one search over authors and titles, the family chips, and three ways in, each a tab:
       By author  — the centuries as folds, each author a fold of its own that opens to the works (links into the reader)
       By century — every life as a line, an author card under it
       By title   — the works A to Z, each letter a fold, filled when opened
     Authors without dates sit in their own fold; a life that runs past the chart's range is clipped with an arrow. ---------- */
  TG.explorer = (host, D, opt) => {
    const fams = D.fam, famColor = (k) => TG.css(`--f${fams.findIndex((f) => f[0] === k) + 1}`), {esc} = TG, {fmt} = TG;
    const AU = D.authors.concat((D.undated || []).filter((u) => !D.authors.includes(u)).map((u) => ({ ...u, w: u.w || [] })));
    const ORD = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
    const fl = (a) => (a.y0 ? Math.round(a.y0 + Math.min(40, ((a.y1 || a.y0) - a.y0) * 0.6)) : null), CENT = (y) => Math.floor((y - 1) / 100) + 1;
    const nW = AU.reduce((t, a) => t + a.w.length, 0);
    host.innerHTML = `<div class="fx-top"><label class="fx-search"><span>Find</span><input type="search" placeholder="${esc(opt.placeholder || 'An author or a title')}" autocomplete="off" aria-label="Find an author or a title on this shelf"></label><span class="fams"></span></div>
      <p class="fx-count small" aria-live="polite"></p>
      <div class="fx-tabs" role="tablist" aria-label="Ways into the shelf"><button type="button" role="tab" data-t="author" aria-selected="true">By author</button><button type="button" role="tab" data-t="century" aria-selected="false">By century</button><button type="button" role="tab" data-t="title" aria-selected="false">By title</button><span class="fx-ink" aria-hidden="true"></span></div>
      <section class="fx-panel" data-p="author" role="tabpanel"><div class="fx-folds"></div></section>
      <section class="fx-panel" data-p="century" role="tabpanel" hidden><div class="instrument"><div style="position:relative;overflow-x:auto"><svg class="lives" role="img" aria-label="${esc(opt.label || 'Lifelines of every author on the shelf')}"></svg><div class="tip" hidden></div></div>
        <p class="small hint" style="margin:6px 0 0">${esc(opt.hint || 'Each line is a life. Choose one to see the works on the shelf.')}</p></div><div class="card pick" style="margin-top:14px" aria-live="polite"></div></section>
      <section class="fx-panel" data-p="title" role="tabpanel" hidden><div class="fx-tfolds"></div></section>`;
    const $ = (s2) => host.querySelector(s2), svg = $('svg.lives'), tip = $('.tip'), input = $('input'), pick = $('.pick'), folds = $('.fx-folds'), tfolds = $('.fx-tfolds'), count = $('.fx-count');
    let on = new Set(fams.map((f) => f[0])), q = '', cur = null, tab = 'author';
    $('.fams').innerHTML = fams.filter((f) => AU.some((a) => a.f === f[0])).map(([k, n]) => `<button type="button" class="chip" aria-pressed="true" data-f="${k}"><i style="background:var(--f${fams.findIndex((x) => x[0] === k) + 1})"></i>${esc(n)}</button>`).join('');
    host.querySelectorAll('.chip[data-f]').forEach((b) => { b.onclick = () => {
      const k = b.dataset.f, all = on.size === fams.length;
      if (all) { on = new Set([k]); } else if (on.has(k)) { on.delete(k); if (!on.size) on = new Set(fams.map((f) => f[0])); } else on.add(k);
      host.querySelectorAll('.chip[data-f]').forEach((c) => c.setAttribute('aria-pressed', on.has(c.dataset.f) ? 'true' : 'false')); refresh(true); }; });
    const hitW = (w) => !q || w[0].toLowerCase().includes(q);
    const match = (a) => !q || a.n.toLowerCase().includes(q) || a.full?.toLowerCase().includes(q) || a.w.some(hitW);
    const mark = (t) => (q ? esc(t).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`) : esc(t));
    const works = (a, all) => { const ws = all || !q || a.n.toLowerCase().includes(q) || a.full?.toLowerCase().includes(q) ? a.w : a.w.filter(hitW);
      return `<ul class="wlist">${ws.map((w) => `<li><a href="${TG.read(w[1], w[3])}" target="_blank" rel="noopener">${mark(w[0])}</a><small>${w[2] ? `${fmt(w[2])} pp.` : ''}</small></li>`).join('')}</ul>`; };
    // the tabs, with an ink rule that slides to the chosen one
    const tabs = [...host.querySelectorAll('.fx-tabs [role=tab]')], ink = $('.fx-ink');
    const moveInk = (instant) => { const b = tabs.find((t) => t.dataset.t === tab); if (!b) return; const to = { x: b.offsetLeft, width: b.offsetWidth };
      if (hasG && !reduce && !instant) gsap.to(ink, { ...to, duration: 0.45, ease: 'power3.out' }); else if (window.gsap) gsap.set(ink, to); else Object.assign(ink.style, { transform: `translateX(${to.x}px)`, width: `${to.width}px` }); };
    function setTab(t, instant) {
      tab = t; tabs.forEach((b) => b.setAttribute('aria-selected', b.dataset.t === t ? 'true' : 'false'));
      let pane = null; host.querySelectorAll('.fx-panel').forEach((p2) => { p2.hidden = p2.dataset.p !== t; if (!p2.hidden) pane = p2; });
      moveInk(instant); if (t === 'century') draw(!instant); if (t === 'title') titles();
      if (hasG && !reduce && !instant && pane) gsap.fromTo(pane, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,transform' });
    }
    tabs.forEach((b) => { b.onclick = () => setTab(b.dataset.t); });
    new ResizeObserver(() => moveInk(true)).observe($('.fx-tabs'));
    // By author: the centuries as folds, each author a fold
    function authors(anim) {
      const A = AU.filter((a) => on.has(a.f) && match(a)), by = new Map();
      A.forEach((a) => { const k = a.y0 ? CENT(fl(a)) : 0; if (!by.has(k)) by.set(k, []); by.get(k).push(a); });
      const keys = [...by.keys()].sort((x, y) => (x || 99) - (y || 99));
      const spark = (k, as) => { const x = (y) => ((y - (k - 1) * 100) / 100 * 100).toFixed(2), mx = Math.max(...as.map((a) => a.w.length), 1);
        return `<svg class="fx-spark" viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true">${as.map((a) => `<line x1="${x(fl(a))}" x2="${x(fl(a))}" y1="${(16 - 13 * Math.sqrt(a.w.length / mx)).toFixed(1)}" y2="16" stroke="${famColor(a.f)}" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`; };
      folds.innerHTML = keys.length ? keys.map((k, i) => { const as = by.get(k).sort((x, y) => (x.y0 || 0) - (y.y0 || 0)), nw = as.reduce((t, a) => t + (q ? a.w.filter(hitW).length || a.w.length : a.w.length), 0);
        return `<details class="fx-cent" data-k="${k}"${q || i === 0 ? ' open' : ''}><summary><b>${k ? `${ORD(k)} century` : 'Undated'}</b><span>${as.length} ${as.length === 1 ? 'author' : 'authors'} · ${fmt(nw)} ${nw === 1 ? 'work' : 'works'}</span>${k ? spark(k, as) : ''}<i aria-hidden="true">›</i></summary>
          <div class="fx-who-list">${as.map((a) => `<details class="fx-who" data-i="${AU.indexOf(a)}"${q && A.length <= 6 ? ' open' : ''}><summary><i style="background:${famColor(a.f)}"></i><b>${mark(a.full || a.n)}</b><span class="d">${esc(a.d || TG.yr(a))}</span><span class="n">${a.w.length} ${a.w.length === 1 ? 'work' : 'works'}${a.p ? `, ${fmt(a.p)} pp.` : ''}</span></summary>
            <div class="fx-body">${a.aff ? `<p class="small" style="margin:0 0 4px">${esc(a.aff)}</p>` : ''}${works(a)}<p class="small" style="margin:6px 0 0"><a href="${TG.href(`author/?a=${encodeURIComponent(a.full || a.n)}`)}" target="_blank" rel="noopener">${esc(a.full || a.n)} in the library</a></p></div></details>`).join('')}</div></details>`; }).join('')
        : `<p class="small">Nothing on this shelf matches “${esc(q)}”.</p>`;
      if (anim && hasG && !reduce) gsap.fromTo(folds.querySelectorAll('.fx-spark'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1, stagger: 0.05, ease: 'power2.inOut', clearProps: 'clipPath' });
      count.textContent = q ? `${A.length} ${A.length === 1 ? 'author' : 'authors'} and ${fmt(A.reduce((t, a) => t + a.w.filter(hitW).length, 0))} titles match “${input.value.trim()}”.` : `${AU.length} authors and ${fmt(nW)} works on this shelf.`;
    }
    folds.addEventListener('toggle', (ev) => { const d = ev.target; if (!d.open || !hasG || reduce) return;
      if (d.classList.contains('fx-cent')) gsap.from(d.querySelectorAll(':scope > .fx-who-list > .fx-who'), { opacity: 0, y: 8, duration: 0.35, stagger: 0.02, ease: 'power2.out', clearProps: 'opacity,transform' });
      if (d.classList.contains('fx-who')) gsap.from(d.querySelectorAll('.wlist li'), { opacity: 0, x: -6, duration: 0.3, stagger: 0.012, ease: 'power2.out', clearProps: 'opacity,transform' }); }, true);
    // By title: every work A to Z, a fold per letter, filled when it opens
    let tDone = '';
    function titles() {
      const key = `${q}|${[...on].join()}`; if (tDone === key) return; tDone = key;
      const W = []; AU.forEach((a) => { if (on.has(a.f)) a.w.forEach((w) => { if (hitW(w) || (q && (a.n.toLowerCase().includes(q) || a.full?.toLowerCase().includes(q)))) W.push([w, a]); }); });
      const L = (t) => { const c = t.replace(/^(The|A|An|On|Of)\s+/i, '').normalize('NFD').replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase(); return c || '#'; };
      const by = new Map(); W.forEach((x) => { const k = L(x[0][0]); if (!by.has(k)) by.set(k, []); by.get(k).push(x); });
      const keys = [...by.keys()].sort();
      tfolds.innerHTML = keys.length ? keys.map((k) => `<details class="fx-cent" data-l="${k}"${q && W.length < 60 ? ' open' : ''}><summary><b>${k}</b><span>${by.get(k).length} ${by.get(k).length === 1 ? 'work' : 'works'}</span><i aria-hidden="true">›</i></summary><div class="fx-body"></div></details>`).join('') : `<p class="small">No title matches “${esc(q)}”.</p>`;
      const fill = (d) => { if (d.dataset.f) return; d.dataset.f = 1; const xs = by.get(d.dataset.l).sort((x, y) => x[0][0].localeCompare(y[0][0]));
        d.querySelector('.fx-body').innerHTML = `<ul class="wlist">${xs.map(([w, a]) => `<li><a href="${TG.read(w[1], w[3])}" target="_blank" rel="noopener">${mark(w[0])}</a><small>${esc(a.n)}${w[2] ? ` · ${fmt(w[2])} pp.` : ''}</small></li>`).join('')}</ul>`; };
      tfolds.querySelectorAll('details').forEach((d) => { if (d.open) fill(d); d.addEventListener('toggle', () => { if (d.open) { fill(d); if (hasG && !reduce) gsap.from(d.querySelectorAll('.wlist li'), { opacity: 0, y: 6, duration: 0.3, stagger: 0.008, clearProps: 'opacity,transform' }); } }); });
    }
    // By century: the lifelines and the author card
    function draw(anim) {
      if (tab !== 'century') return;
      const A = AU.filter((a) => on.has(a.f) && match(a) && a.y0);
      const w = Math.max(680, svg.parentElement.clientWidth), [Y0, Y1] = opt.range, cl = (y) => Math.max(Y0, Math.min(Y1, y)), sx = (y) => 12 + (cl(y) - Y0) / (Y1 - Y0) * (w - 24);
      const rows = []; const placed = A.map((a) => { const x0 = sx(a.y0), x1 = Math.max(sx(a.y1 || a.y0), x0 + 5), lw = a.n.length * 6.4 + 12, right = x0 > w - 170, left = right ? x1 - lw : x0;
        let r = 0; while (rows[r] !== undefined && rows[r] > left - 6) r++; rows[r] = Math.max(x1, left + lw); return { a, x0, x1, r, right, cut: (a.y1 || a.y0) > Y1 || a.y0 < Y0 }; });
      const h = Math.max(rows.length, 1) * 24 + 36; svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.setAttribute('height', h);
      let o = ''; const step = (Y1 - Y0) > 900 ? 100 : 50;
      for (let y = Math.ceil(Y0 / step) * step; y <= Y1; y += step) { const x = sx(y); o += `<line x1="${x}" x2="${x}" y1="0" y2="${h - 22}" stroke="${TG.css('--rule-2')}"/><text x="${x}" y="${h - 6}" fill="${TG.css('--muted')}" font-size="11" text-anchor="middle">${y}</text>`; }
      for (const { a, x0, x1, r, right, cut } of placed) { const y = r * 24 + 8, c = famColor(a.f), sel = cur === a;
        o += `<g class="life" data-i="${AU.indexOf(a)}" tabindex="0" role="button" aria-label="${esc(a.n)}, ${esc(TG.yr(a))}" style="cursor:pointer">
          <rect x="${x0 - 2}" y="${y - 4}" width="${Math.max(x1 - x0, right ? 0 : a.n.length * 6.4 + 10) + 4}" height="24" fill="transparent"/>
          <rect class="bar" x="${x0}" y="${y}" width="${x1 - x0}" height="${sel ? 8 : 6}" rx="3" fill="${a.u ? 'none' : c}" stroke="${a.u ? c : 'none'}" stroke-dasharray="${a.u ? '3 3' : ''}" opacity="${sel ? 1 : 0.82}"/>${cut ? `<path d="M${x1 + 2},${y - 1} l5,4 l-5,4" fill="none" stroke="${c}" stroke-width="1.5"/>` : ''}
          <text x="${right ? x1 : x0}" text-anchor="${right ? 'end' : 'start'}" y="${y + 18}" fill="${sel ? TG.css('--rubric') : TG.css('--ink')}" font-size="11.5" font-weight="${sel ? 600 : 400}">${esc(a.n)}</text></g>`; }
      svg.innerHTML = o;
      svg.querySelectorAll('g.life').forEach((g) => { const a = AU[+g.dataset.i];
        g.addEventListener('click', () => card(a)); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card(a); } });
        g.addEventListener('mousemove', (e) => { const b = svg.parentElement.getBoundingClientRect(); tip.innerHTML = `${esc(a.n)}<small>${esc(a.d || TG.yr(a))}${a.u ? ' (dates uncertain)' : ''} · ${a.w.length} ${a.w.length === 1 ? 'work' : 'works'}, ${fmt(a.p)} pages</small>`; tip.hidden = false;
          tip.style.left = `${Math.min(e.clientX - b.left + 12, b.width - 200)}px`; tip.style.top = `${e.clientY - b.top + 14}px`; });
        g.addEventListener('mouseleave', () => { tip.hidden = true; }); });
      if (anim && hasG && !reduce) gsap.from(svg.querySelectorAll('rect.bar'), { scaleX: 0, transformOrigin: 'left center', duration: 0.6, ease: 'power3.out', stagger: 0.008 });
    }
    function card(a) {
      cur = a; draw(false);
      pick.innerHTML = `<p class="eyebrow" style="margin:0 0 4px"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${famColor(a.f)};margin-right:6px"></i>${esc((fams.find((f) => f[0] === a.f) || [])[1] || '')}</p>
        <h3><a href="${TG.href(`author/?a=${encodeURIComponent(a.full || a.n)}`)}" target="_blank" rel="noopener">${esc(a.full || a.n)}</a> <span class="small">${esc(a.d || TG.yr(a))}</span></h3>
        ${a.aff ? `<p class="small" style="margin:0 0 6px">${esc(a.aff)}</p>` : ''}${a.sig ? `<p style="margin:0;max-width:52rem">${esc(a.sig)}</p>` : ''}${works(a)}`;
      if (hasG && !reduce) gsap.from(pick.querySelectorAll('.wlist li'), { opacity: 0, y: 6, duration: 0.35, stagger: 0.015, ease: 'power2.out' });
    }
    function refresh(anim) { authors(anim); tDone = ''; if (tab === 'title') titles(); draw(anim); }
    let it; input.addEventListener('input', () => { clearTimeout(it); it = setTimeout(() => { q = input.value.trim().toLowerCase(); refresh(false); const hit = AU.find((a) => on.has(a.f) && q && match(a) && a.y0); if (hit) card(hit); }, 120); });
    refresh(false); setTab('author', true);
    if (hasG && !reduce) ScrollTrigger.create({ trigger: host, start: 'top 85%', once: true, onEnter: () => authors(true) });
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => draw(false), 150); });
    const first = AU.find((a) => a.n === opt.first) || AU.find((a) => a.y0) || AU[0]; if (first) card(first);
    // a click elsewhere on the page (a pane of the rose, a bead, a spine, a card in Who's who) opens that author's fold
    const api = { show(name) { const a = AU.find((x) => x.n === name || x.full === name); if (!a) return;
      if (!on.has(a.f)) { on = new Set(fams.map((f) => f[0])); host.querySelectorAll('.chip[data-f]').forEach((c) => c.setAttribute('aria-pressed', 'true')); }
      if (q) { q = ''; input.value = ''; } refresh(false); setTab('author', true); card(a);
      const d = folds.querySelector(`.fx-who[data-i="${AU.indexOf(a)}"]`); if (!d) return; d.closest('.fx-cent').open = true; d.open = true;
      d.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      if (hasG && !reduce) gsap.fromTo(d, { backgroundColor: 'rgba(160, 124, 53, 0.28)' }, { backgroundColor: 'rgba(160, 124, 53, 0)', duration: 1.6, delay: 0.5, clearProps: 'backgroundColor' }); } };
    TG._open = api.show;
    return api;
  };

  /* ---------- the people in the conversation (owner 10-10: "key name intros … do this for all shelves", "curate the authors that are important,
     keeping in mind each guide introduces people to the conversation"). A curated cast per shelf (common/keys.json, merged into the data
     as D.keys), group by group, each person in order of time with a ruler above them; the intro is the library's own record. ---------- */
  TG.keynames = (D) => {
    if (!root || root.querySelector('#names') || !D.keys || !D.keys.length) return;
    const before = root.querySelector('#explore'); if (!before) return;
    const {esc} = TG, {fmt} = TG, fams = D.fam || [], famColor = (k) => TG.css(`--f${Math.max(0, fams.findIndex((f) => f[0] === k)) + 1}`);
    const A = D.authors || [], find = (n) => A.find((a) => a.n === n || a.full === n);
    const largest = (a) => { if (a.w && a.w.length) { const w = a.w.slice().sort((x, y) => (y[2] || 0) - (x[2] || 0))[0]; return { t: w[0], href: TG.read(w[1], w[3]) }; }
      if (D.works) { const i = A.indexOf(a), ws = D.works.filter((w) => w[5] === i); if (ws.length) { const w = ws.sort((x, y) => ((y[4] || 0) - (y[3] || 0)) - ((x[4] || 0) - (x[3] || 0)))[0]; return { t: w[0], href: TG.read(w[1], w[3]) }; } } return null; };
    const nworks = (a) => (a.w && a.w.length) || a.nw || (D.works ? D.works.filter((w) => w[5] === A.indexOf(a)).length : 0);
    // whole sentences only: a record cut short upstream must not end mid-word
    const brief = (t, n = 300) => { if (!t) return ''; const ss = t.match(/[^.!?]+[.!?]+["”’)]?(\s|$)/g) || []; let o = ''; for (const x of ss) { if ((o + x).length > n && o) break; o += x; }
      if (!o) { const cut = t.slice(0, n); o = `${cut.slice(0, cut.lastIndexOf(' '))}…`; } return o.trim(); };
    // a name is {n, as (display), note, a (a record borrowed from another shelf)}; each group reads in order of time
    const groups = D.keys.map((g) => ({ ...g, people: g.names.map((e) => { const a = e.a || find(e.n); return a ? { ...a, sig: a.sig || e.bio || '', kn: e.as || a.n, knote: e.note || '', cross: !!e.a } : null; })
      .filter(Boolean).sort((x, y) => (x.y0 || 9999) - (y.y0 || 9999)) })).filter((g) => g.people.length);
    groups.forEach((g) => { const home = g.people.filter((p) => !p.cross).map((p) => p.f); const f = home.sort((a, b) => home.filter((x) => x === b).length - home.filter((x) => x === a).length)[0];
      g.people.forEach((p) => { if (p.cross) p.f = f; }); }); // a writer borrowed from another shelf takes his group's colour
    if (!groups.length) return;
    const sec = document.createElement('section'); sec.className = 'tool gut'; sec.id = 'names'; sec.setAttribute('aria-labelledby', 'tg-h-names');
    sec.innerHTML = `<div class="wrap"><p class="eyebrow">Who’s who</p><h2 id="tg-h-names">The people in the conversation</h2>
      <p class="say" style="max-width:46rem">${esc(D.keys_say || 'Where to begin on this shelf: the writers the others read, answered and argued with, group by group and in the order they wrote.')}</p>
      <div class="kn-tabs" role="tablist" aria-label="Groups on this shelf">${groups.map((g, i) => `<button type="button" role="tab" aria-selected="${i ? 'false' : 'true'}" data-i="${i}">${esc(g.label)}</button>`).join('')}</div>
      <p class="kn-say" aria-live="polite"></p><svg class="kn-ruler" aria-hidden="true"></svg><div class="kn-grid"></div></div>`;
    before.parentNode.insertBefore(sec, before);
    const tabs = [...sec.querySelectorAll('.kn-tabs button')], say = sec.querySelector('.kn-say'), grid = sec.querySelector('.kn-grid'), ruler = sec.querySelector('.kn-ruler');
    let cur = -1;
    function drawRuler(g) {
      const P = g.people.filter((a) => a.y0), W = Math.max(320, ruler.clientWidth || grid.clientWidth), lo = Math.min(...P.map((a) => a.y0)), hi = Math.max(...P.map((a) => a.y1 || a.y0));
      const pad = Math.max(10, (hi - lo) * 0.06), Y0 = lo - pad, Y1 = hi + pad, sx = (y) => 8 + (y - Y0) / (Y1 - Y0) * (W - 16), rows = [];
      const placed = P.map((a) => { const x0 = sx(a.y0), x1 = Math.max(sx(a.y1 || a.y0), x0 + 4), lw = a.kn.replace(/ \(.*\)$/, '').length * 6.2 + 10; let r = 0; while (rows[r] !== undefined && rows[r] > x0 - 6) r++; rows[r] = Math.max(x1, x0 + lw); return { a, x0, x1, r }; });
      const H = rows.length * 22 + 24, step = (Y1 - Y0) > 600 ? 100 : (Y1 - Y0) > 250 ? 50 : 25;
      let o = ''; for (let y = Math.ceil(Y0 / step) * step; y <= Y1; y += step) o += `<line x1="${sx(y)}" x2="${sx(y)}" y1="0" y2="${H - 16}" stroke="${TG.css('--rule-2')}"/><text x="${sx(y)}" y="${H - 3}" font-size="10.5" fill="${TG.css('--muted')}" text-anchor="middle">${y}</text>`;
      o += placed.map(({ a, x0, x1, r }) => `<g data-n="${esc(a.n)}"><rect class="kn-bar" x="${x0}" y="${r * 22 + 4}" width="${x1 - x0}" height="5" rx="2.5" fill="${a.u ? 'none' : famColor(a.f)}" stroke="${famColor(a.f)}" stroke-dasharray="${a.u ? '3 3' : ''}"/><text x="${x0}" y="${r * 22 + 19}" font-size="11.5" fill="${TG.css('--ink')}">${esc(a.kn.replace(/ \(.*\)$/, ''))}</text></g>`).join('');
      ruler.setAttribute('viewBox', `0 0 ${W} ${H}`); ruler.setAttribute('height', H); ruler.innerHTML = o;
      if (hasG && !reduce) gsap.from(ruler.querySelectorAll('.kn-bar'), { scaleX: 0, transformOrigin: 'left center', duration: 0.7, stagger: 0.06, ease: 'power3.out' });
    }
    function card(a) {
      const w = largest(a), n = nworks(a);
      return `<article class="kn-card" data-n="${esc(a.n)}"><p class="kn-d">${esc(a.d || TG.yr(a))}${a.u ? ' <span class="small">(uncertain)</span>' : ''}</p>
        <h3>${esc(a.kn)}</h3>${a.knote ? `<p class="kn-note">${esc(a.knote)}</p>` : ''}${a.aff ? `<p class="kn-aff">${esc(brief(a.aff, 120))}</p>` : ''}
        ${a.sig ? `<p class="kn-sig">${esc(brief(a.sig))}</p>` : ''}
        <p class="kn-go">${w ? `<a href="${w.href}" target="_blank" rel="noopener">Start with <i>${esc(w.t)}</i></a>` : ''}${n > 1 && !a.cross ? `<button type="button" data-open="${esc(a.full || a.n)}">All ${fmt(n)} works</button>` : ''}</p></article>`;
    }
    function show(i, first) {
      if (i === cur) return; const prev = cur; cur = i; const g = groups[i];
      tabs.forEach((t, j) => t.setAttribute('aria-selected', j === i ? 'true' : 'false'));
      const fill = () => {
        say.textContent = g.say || ''; grid.innerHTML = g.people.map(card).join(''); drawRuler(g);
        grid.querySelectorAll('[data-open]').forEach((b) => { b.onclick = () => (TG._open ? TG._open(b.dataset.open) : null); });
        grid.querySelectorAll('.kn-card').forEach((c) => { const hl = (on) => { const r = ruler.querySelector(`g[data-n="${CSS.escape(c.dataset.n)}"] .kn-bar`); if (r) r.style.opacity = on ? 1 : ''; ruler.classList.toggle('dim', on); if (r) r.parentNode.classList.toggle('on', on); };
          c.addEventListener('mouseenter', () => hl(true)); c.addEventListener('mouseleave', () => hl(false)); });
        if (hasG && !reduce) gsap.fromTo(grid.children, { opacity: 0, y: 18, rotateX: -12 }, { opacity: 1, y: 0, rotateX: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out', transformPerspective: 900, clearProps: 'transform' });
      };
      if (hasG && !reduce && prev >= 0) gsap.to(grid.children, { opacity: 0, y: -10, duration: 0.18, stagger: 0.02, onComplete: fill }); else fill();
    }
    tabs.forEach((t) => { t.onclick = () => show(+t.dataset.i); });
    if (hasG && !reduce) ScrollTrigger.create({ trigger: sec, start: 'top 80%', once: true, onEnter() { cur = -1; show(0, true); } });
    show(0, true);
    let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => cur >= 0 && drawRuler(groups[cur]), 150); }).observe(grid);
    if (hasG) ScrollTrigger.refresh();
  };
  return TG;
})();
