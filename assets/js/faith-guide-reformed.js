/* The Continental Reformed shelf guide: Ramus's braces, the Institutes growing, the Reformed International, the confessions dealt,
   Polanus's tree, the stream of generations. */
(async () => {
  const {TG} = window, D = await TG.load('data'), LAND = await TG.load('land');
  const { esc, fmt, clamp, ease, lerp } = TG, G = TG.hasG && !TG.reduce ? window.gsap : null;
  const FAMS = D.fam.map((f) => f[0]), fc = (k) => TG.css(`--f${FAMS.indexOf(k) + 1}`), famName = (k) => (D.fam.find((f) => f[0] === k) || [])[1];
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const brace = (x, y1, y2, w = 14) => { // a curly brace opening to the right, its point at (x, middle)
    if (y2 - y1 < 6) return `M${x},${(y1 + y2) / 2} L${x + w},${(y1 + y2) / 2}`;
    const m = (y1 + y2) / 2, r = Math.min(9, (y2 - y1) / 4), h = x + w / 2;
    return `M${x + w},${y1} Q${h},${y1} ${h},${y1 + r} L${h},${m - r} Q${h},${m} ${x},${m} Q${h},${m} ${h},${m + r} L${h},${y2 - r} Q${h},${y2} ${x + w},${y2}`; };
  const drawIn = (el) => { const L = el.getTotalLength(); el.style.strokeDasharray = L; el.style.strokeDashoffset = L; return el; };
  let explorer = null;
  const facts = { works: D.n_works, authors: D.authors.length, pages: D.n_pages, conf: D.conf.length };
  document.querySelectorAll('[data-count]').forEach((el) => TG.countUp(el, facts[el.dataset.count], 1.8));

  /* ---------- hero: the shelf divided in Ramus's manner ---------- */
  (function hero() {
    const svg = document.querySelector('.brace svg'), cap = document.querySelector('.brace .cap');
    const regs = D.fam.map(([k, n]) => { const A = D.authors.filter((a) => a.f === k); return { k, n, A, top: A.slice().sort((a, b) => b.p - a.p).slice(0, 3), p: A.reduce((t, a) => t + a.p, 0) }; }).filter((r) => r.A.length);
    const leaves = regs.flatMap((r) => r.top.map((a) => ({ a, r }))), H = 600, top = 26, step = (H - 2 * top) / (leaves.length - 1 + (regs.length - 1) * 0.55);
    let y = top; regs.forEach((r, i) => { if (i) y += step * 0.55; r.ys = r.top.map(() => { const v = y; y += step; return v; }); y -= step; y += step; r.y = (r.ys[0] + r.ys[r.ys.length - 1]) / 2; });
    const midY = (regs[0].y + regs[regs.length - 1].y) / 2;
    const g0 = mk('g', {}, svg);
    const rootT = mk('text', { x: 0, y: midY - 4, class: 'root' }, g0); rootT.textContent = 'The shelf';
    const rootS = mk('text', { x: 1, y: midY + 16, class: 'root2' }, g0); rootS.textContent = `${fmt(D.n_works)} works`;
    const b1 = mk('path', { class: 'br', d: brace(140, regs[0].y, regs[regs.length - 1].y, 16) }, svg);
    const regEls = regs.map((r) => { const g = mk('g', {}, svg); const t = mk('text', { x: 162, y: r.y - 2, class: 'reg', fill: fc(r.k) }, g); t.textContent = r.n;
      const s = mk('text', { x: 163, y: r.y + 14, class: 'regn' }, g); s.textContent = `${r.A.length} ${r.A.length === 1 ? 'writer' : 'writers'} · ${fmt(r.p)} pp.`; return g; });
    const b2 = regs.map((r) => mk('path', { class: 'br', d: brace(352, r.ys[0] - 4, r.ys[r.ys.length - 1] + 4, 12) }, svg));
    const leafEls = []; regs.forEach((r) => r.top.forEach((a, i) => { const g = mk('g', {}, svg);
      const t = mk('text', { x: 372, y: r.ys[i] + 4, class: 'leaf', tabindex: 0, role: 'button' }, g); t.textContent = a.n;
      const pw = mk('text', { x: 638, y: r.ys[i] + 4, class: 'lp', 'text-anchor': 'end' }, g); pw.textContent = `${fmt(a.p)} pp.`;
      const show = () => { cap.textContent = `${a.full || a.n}, ${a.d || TG.yr(a)} · ${a.w.length} works on the shelf`; };
      t.addEventListener('mouseenter', show); t.addEventListener('focus', show);
      t.addEventListener('click', () => explorer && explorer.show(a.n)); t.addEventListener('keydown', (e) => { if (e.key === 'Enter') explorer && explorer.show(a.n); });
      leafEls.push(g); }));
    cap.textContent = 'The shelf divided as Ramus divided a subject: by where its writers taught, then the three with the most pages in each.';
    if (!G) return;
    const tl = gsap.timeline({ delay: 0.3 });
    tl.from([rootT, rootS], { opacity: 0, x: -14, duration: 0.7, ease: 'power2.out', stagger: 0.1 })
      .to(drawIn(b1), { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, '-=0.2')
      .from(regEls, { opacity: 0, x: -12, duration: 0.55, ease: 'power2.out', stagger: 0.09 }, '-=0.35')
      .to(b2.map(drawIn), { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut', stagger: 0.09 }, '-=0.3')
      .from(leafEls, { opacity: 0, x: -10, duration: 0.45, ease: 'power2.out', stagger: 0.04 }, '-=0.45');
  })();

  /* ---------- 1. the Institutes: six chapters become eighty ---------- */
  (function institutes() {
    const I = D.inst, stage = document.getElementById('tg-inst-stage'), nEl = document.getElementById('tg-inst-n'), tip = document.getElementById('tg-inst-tip');
    document.getElementById('tg-inst-read').href = TG.read(I.slug, I.books[0].p);
    const eds = document.getElementById('tg-eds');
    eds.innerHTML = I.editions.map(([y, pl, n, note]) => `<li><b>${y}</b><span>${esc(pl)}</span><small>${n} chapters</small><p>${esc(note)}</p></li>`).join('');
    const edLis = [...eds.children];
    const SHORT = ['God the Creator', 'God the Redeemer', 'The grace of Christ', 'The church'];
    const cells = [], hot = new Map();
    I.books.forEach((b, bi) => b.ch.forEach(([n, t, p]) => { const a = document.createElement('a'); a.className = 'cell'; a.href = TG.read(I.slug, p); a.target = '_blank'; a.rel = 'noopener';
      a.innerHTML = `<b>${n}</b><span>${esc(t)}</span>`; a.dataset.k = `${bi}.${n}`; a.title = t; a.setAttribute('aria-label', `Book ${['I', 'II', 'III', 'IV'][bi]}, chapter ${n}: ${t}`);
      a.addEventListener('mouseenter', () => { tip.textContent = `Book ${['I', 'II', 'III', 'IV'][bi]}, chapter ${n}: ${t}${hot.get(a.dataset.k) ? `. In 1536: ${hot.get(a.dataset.k)}` : ''}`; });
      stage.appendChild(a); cells.push({ a, bi, n }); }));
    I.first.forEach(([lab, tg]) => tg.forEach(([b, n]) => hot.set(`${b}.${n}`, lab)));
    const heads = I.books.map((b, i) => { const h = document.createElement('div'); h.className = 'bkh'; h.innerHTML = `<b>Book ${['I', 'II', 'III', 'IV'][i]}</b>${esc(SHORT[i])}`; stage.appendChild(h); return h; });
    const keyLab = document.createElement('p'); keyLab.className = 'keylab'; keyLab.textContent = 'The six chapters of 1536'; stage.appendChild(keyLab);
    const firsts = I.first.map(([lab], i) => { const d = document.createElement('div'); d.className = 'first'; d.innerHTML = `<i>${i + 1}</i>${esc(lab)}`; stage.appendChild(d); return d; });
    let cur = -1, W = 0;
    function layout(k) { // target boxes for every element in edition k
      W = stage.clientWidth; const Hh = stage.clientHeight, out = { cells: [], firsts: [], heads: [] }, N = I.editions[k][2];
      const colW = Math.min(330, W * 0.46), colX = W - colW - 4, top = k === 4 ? 122 : 96;
      if (k === 0) {
        cells.forEach(() => out.cells.push({ x: colX + colW / 2 - 10, y: top + 240, w: 20, h: 8, o: 0 }));
        firsts.forEach((_, i) => out.firsts.push({ x: colX, y: top + i * 70, w: colW, h: 56, o: 1, fs: 17 }));
      } else if (k < 4) {
        const hh = Math.min(26, (Hh - top - 30 - (N - 1) * 3) / N);
        cells.forEach((c, i) => out.cells.push(i < N ? { x: colX, y: top + i * (hh + 3), w: colW, h: hh, o: 1 } : { x: colX, y: top + N * (hh + 3), w: colW, h: 4, o: 0 }));
        const kw = Math.max(120, colX - 30);
        firsts.forEach((_, i) => out.firsts.push({ x: 0, y: top + 96 + i * 34, w: Math.min(kw, 260), h: 28, o: 1, fs: 13 }));
      } else {
        const gap = W < 600 ? 4 : 10, cw = (W - 3 * gap) / 4, ch = Math.min(17, (Hh - top - 40 - 24 * 2) / 25), y0 = top + 40;
        cells.forEach((c) => out.cells.push({ x: c.bi * (cw + gap), y: y0 + (c.n - 1) * (ch + 2), w: cw, h: ch, o: 1 }));
        I.first.forEach(([, tg], i) => { const [b, n] = tg[0]; out.firsts.push({ x: b * (cw + gap), y: y0 + (n - 1) * (ch + 2), w: cw, h: ch, o: 0, fs: 11 }); });
        heads.forEach((h, i) => { out.heads.push({ x: i * (cw + gap), y: top - 6, w: cw }); h.classList.toggle('narrow', W < 600); });
      }
      return out;
    }
    function step(k, instant) {
      if (k === cur && !instant) return; const prev = cur; cur = k; const L = layout(k), dur = instant || !G ? 0 : 0.85;
      edLis.forEach((li, i) => { li.classList.toggle('now', i === k); li.classList.toggle('past', i < k); });
      const n = I.editions[k][2];
      if (G && !instant && prev >= 0) { const o = { v: +nEl.firstChild.textContent || 6 }; gsap.to(o, { v: n, duration: 0.8, ease: 'power2.out', onUpdate() { nEl.firstChild.textContent = Math.round(o.v); } }); }
      else nEl.firstChild.textContent = n;
      nEl.querySelector('small').textContent = k === 4 ? 'chapters in four books' : 'chapters';
      cells.forEach((c, i) => {
        const b = L.cells[i], isHot = k === 4 && hot.has(c.a.dataset.k);
        c.a.classList.toggle('hot', isHot); c.a.style.pointerEvents = k === 4 ? 'auto' : 'none'; c.a.tabIndex = k === 4 ? 0 : -1;
        if (dur) gsap.to(c.a, { left: b.x, top: b.y, width: b.w, height: b.h, opacity: b.o, duration: dur, ease: 'power3.inOut', delay: k === 4 ? (c.bi * 0.08 + c.n * 0.006) : i * 0.008 });
        else Object.assign(c.a.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, opacity: b.o });
        const sp = c.a.querySelector('span'); if (dur) gsap.to(sp, { opacity: k === 4 ? 1 : 0, duration: 0.4, delay: k === 4 ? 0.7 : 0 }); else sp.style.opacity = k === 4 ? 1 : 0;
      });
      firsts.forEach((f, i) => { const b = L.firsts[i];
        if (dur) gsap.to(f, { left: b.x, top: b.y, width: b.w, height: b.h, opacity: b.o, fontSize: b.fs, duration: k === 4 ? 1.1 : dur, ease: 'power3.inOut', delay: k === 4 ? 0.15 + i * 0.07 : 0 });
        else Object.assign(f.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, opacity: b.o, fontSize: `${b.fs}px` }); });
      heads.forEach((h, i) => { const b = L.heads[i]; if (b) Object.assign(h.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px` });
        if (dur) gsap.to(h, { opacity: k === 4 ? 1 : 0, y: k === 4 ? 0 : 8, duration: 0.5, delay: k === 4 ? 0.5 + i * 0.08 : 0 }); else h.style.opacity = k === 4 ? 1 : 0; });
      if (dur) gsap.to(keyLab, { opacity: k > 0 && k < 4 ? 1 : 0, duration: 0.4 }); else keyLab.style.opacity = k > 0 && k < 4 ? 1 : 0;
      tip.textContent = k === 4 ? 'The six chapters of 1536 are marked where they stand in 1559. Every chapter opens in the reader.' : k === 0 ? 'The first edition: a catechism’s order, Law, Creed, Prayer, sacraments.' : '';
    }
    step(0, true);
    TG.chapter('#tg-inst', 3400, (p, fin) => step(fin ? 4 : Math.min(4, Math.floor(p * 5)), fin), { scrub: true });
    let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(stage.clientWidth - W) > 2) step(cur, true); }, 120); }).observe(stage);
  })();

  /* ---------- 2. the Reformed International ---------- */
  (function road() {
    const box = document.getElementById('tg-map'), M = TG.map(box, LAND, [[-4.8, 40.6], [23.9, 56.2]], { parallels: [42, 54] });
    const cv = TG.canvas(box.querySelector('canvas')), {ctx} = cv, P = D.places;
    const ACAD = new Set(D.acad.map((a) => a[0]));
    const J = D.journeys.map((j) => { const pts = j.s.map(([p, y]) => ({ p, y, ll: P[p] })), born = pts.length > 2 && !ACAD.has(pts[0].p); return { ...j, pts, from: born ? pts[1].y - 4 : pts[0].y }; });
    const acad = D.acad.map(([p, y, what]) => ({ p, y, what, ll: P[p] }));
    const LBL = { Leiden: [-7, -6, 'right'], Utrecht: [7, 12, 'left'], Franeker: [-7, -6, 'right'], Geneva: [-7, 12, 'right'], Lausanne: [-7, -4, 'right'],
                  Bern: [7, 12, 'left'], Basel: [-7, -6, 'right'], Zurich: [7, -6, 'left'], Herborn: [7, -6, 'left'], Marburg: [7, 10, 'left'], Heidelberg: [7, 12, 'left'], Strasbourg: [-7, 12, 'right'], Sedan: [-7, -6, 'right'], Bremen: [7, 12, 'left'], 'Alba Iulia': [-7, -6, 'right'], Groningen: [7, -8, 'left'], Saumur: [-7, -6, 'right'] };
    const chron = TG.chronicle(document.getElementById('tg-chron'), D.events, ([y, e, w]) => `<li><span class="d">${y}</span><span class="e">${esc(e)}</span><span class="w">${esc(w)}</span></li>`);
    document.getElementById('tg-legend').innerHTML = `${D.fam.filter(([k]) => J.some((j) => j.f === k)).map(([k, n]) => `<span><i style="background:${fc(k)}"></i>${esc(n)}</span>`).join('')}<span><i style="background:transparent;border:1.5px solid var(--ink);border-radius:1px"></i>an academy, with its year</span>`;
    const ribbon = document.getElementById('tg-ribbon'); let year = 1500, last = '';
    const curve = (a, b, t) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], k = 0.18, cx = mx - dy * k, cy = my + dx * k, u = 1 - t; return [u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]; };
    function at(j, Y) {
      const pts = j.pts.map((s) => ({ ...s, xy: M.xy(s.ll) })); if (Y < j.from) return null;
      const trail = [pts[0].xy]; let pos = pts[0].xy, moving = false;
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1];
        if (Y >= b.y) { for (let s = 1; s <= 16; s++) trail.push(curve(a.xy, b.xy, s / 16)); pos = b.xy; continue; }
        if (Y > a.y) { const span = Math.max(1, b.y - a.y), tr = Math.min(span, 3), t = clamp((Y - (b.y - tr)) / tr, 0, 1), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2)**2 / 2;
          for (let s = 1; s <= 16 * e; s++) trail.push(curve(a.xy, b.xy, s / 16)); pos = curve(a.xy, b.xy, e); moving = t > 0 && t < 1; }
        break; }
      return { pos, trail, alive: Y <= pts[pts.length - 1].y + 0.5, moving };
    }
    function render(Y) {
      year = Y; ctx.clearRect(0, 0, cv.W, cv.H); const ink = TG.css('--ink'), body = TG.css('--body'), disp = TG.css('--display');
      for (const s of acad) { if (s.y > Y) continue; const [x, y] = M.xy(s.ll), pop = clamp((Y - s.y) / 5, 0, 1), sz = 5 + 3 * (1 - pop);
        if (pop < 1) { ctx.globalAlpha = 0.35 * (1 - pop); ctx.fillStyle = TG.css('--rubric'); ctx.beginPath(); ctx.arc(x, y, 6 + 18 * pop, 0, 6.283); ctx.fill(); }
        ctx.globalAlpha = 0.3 + 0.6 * pop; ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.strokeRect(x - sz / 2, y - sz / 2, sz, sz);
        const [dx, dy, al] = LBL[s.p] || [7, -6, 'left']; ctx.textAlign = al; ctx.font = `italic 12px ${disp}`; ctx.fillStyle = ink; ctx.globalAlpha = 0.8 * pop;
        if (cv.W < 600) ctx.font = `italic 10px ${disp}`; ctx.fillText(cv.W < 600 ? s.p : `${s.p} ${s.y}`, x + dx, y + dy); ctx.textAlign = 'left'; }
      ctx.globalAlpha = 1; const live = [], boxes = [];
      for (const j of J) { const r = at(j, Y); if (!r) continue; const c = fc(j.f);
        ctx.strokeStyle = c; ctx.lineWidth = r.alive ? 1.8 : 1.1; ctx.globalAlpha = r.alive ? 0.55 : 0.15; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); r.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        if (r.alive) live.push({ j, r, c }); else { ctx.globalAlpha = 0.35; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(r.pos[0], r.pos[1], 1.8, 0, 6.283); ctx.fill(); } }
      for (const { r, c } of live) { const [x, y] = r.pos; ctx.globalAlpha = 0.18; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r.moving ? 10 : 7, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 6.283); ctx.fill(); ctx.strokeStyle = TG.css('--card'); ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.font = `600 11.5px ${body}`;
      for (const { j, r, c } of live.sort((a, b) => a.r.pos[1] - b.r.pos[1])) { const [x, y] = r.pos, w = ctx.measureText(j.a).width; let lx = x + 8, ly = y + 4;
        const hit = (bx, by) => boxes.some((b) => bx < b[0] + b[2] && bx + w > b[0] && by - 10 < b[1] + 4 && by + 2 > b[1] - 10);
        if (lx + w > cv.W - 4 || hit(lx, ly)) lx = x - 8 - w; if (hit(lx, ly)) { lx = Math.min(x + 8, cv.W - w - 4); ly = y + 16; } if (hit(lx, ly)) continue;
        boxes.push([lx, ly, w]); ctx.fillStyle = TG.css('--land'); ctx.globalAlpha = 0.85; ctx.fillRect(lx - 2, ly - 11, w + 4, 14); ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.fillText(j.a, lx, ly); }
      ctx.globalAlpha = 1;
      document.getElementById('tg-year').textContent = Math.round(Y);
      document.getElementById('tg-yearbar').style.width = `${(Y - 1500) / (1725 - 1500) * 100}%`;
      chron(Y);
      const names = live.map(({ j }) => j.a).join('|');
      if (names !== last) { last = names; ribbon.innerHTML = live.map(({ j, c }) => `<span><i style="background:${c}"></i>${esc(j.a)}</span>`).join('') || '<span class="small" style="border:0;background:none">No writer on this shelf is yet at work.</span>'; }
    }
    M.onfit = () => { cv.size(); render(year); };
    TG.chapter('#tg-road', 4600, (p) => render(lerp(1500, 1725, p)), { scrub: 0.4 });
  })();

  /* ---------- 3. the confessions, dealt ---------- */
  (function confessions() {
    const deck = document.getElementById('tg-deck'), svg = deck.querySelector('svg'), card = document.getElementById('tg-bigcard'), tip = deck.querySelector('.tip');
    document.getElementById('tg-conf-n').textContent = D.conf.length;
    const ORDER = ['Swiss', 'Genevan/French', 'German/Palatinate', 'Dutch', 'English', 'Scottish', 'Hungarian/Transylvanian', 'Polish/Lithuanian', 'Bohemian', 'Waldensian', 'Italian/Iberian', 'Greek', 'Other'];
    const COL = { Swiss: 'swiss', 'Genevan/French': 'french', 'German/Palatinate': 'german', Dutch: 'dutch', English: 'british', Scottish: 'british' };
    const regColor = (r) => COL[r] ? fc(COL[r]) : r === 'Hungarian/Transylvanian' ? TG.css('--f7') : r === 'Polish/Lithuanian' ? TG.css('--f8') : TG.css('--muted');
    const lanes = ORDER.filter((r) => D.conf.some((c) => c[1] === r)), Y0 = 1520, Y1 = 1700;
    document.getElementById('tg-conf-legend').innerHTML = `${lanes.slice(0, 8).map((r) => `<span><i style="background:${regColor(r)}"></i>${esc(r)}</span>`).join('')}<span><i style="background:var(--muted)"></i>others</span>`;
    let W = 0, cards = [], flags = [];
    function build() {
      W = svg.clientWidth; const H = 300, top = 72, lh = (H - top - 26) / lanes.length, sx = (y) => 104 + (y - Y0) / (Y1 - Y0) * (W - 112);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = '';
      const ax = mk('g', {}, svg);
      for (let y = 1525; y <= 1700; y += 25) { mk('line', { x1: sx(y), x2: sx(y), y1: top - 4, y2: H - 20, stroke: TG.css('--rule-2') }, ax); const t = mk('text', { x: sx(y), y: H - 6, class: 'tick', 'text-anchor': 'middle' }, ax); t.textContent = y; }
      lanes.forEach((r, i) => { const t = mk('text', { x: 98, y: top + i * lh + lh * 0.72, class: 'lane', 'text-anchor': 'end' }, ax); t.textContent = r.replace('Hungarian/Transylvanian', 'Hungarian').replace('Polish/Lithuanian', 'Polish').replace('German/Palatinate', 'German').replace('Genevan/French', 'Genevan, French').replace('Italian/Iberian', 'Italian, Spanish'); });
      const seen = {}; cards = D.conf.slice().sort((a, b) => a[0] - b[0]).map((c) => { const li = lanes.indexOf(c[1]), key = `${li}.${c[0]}`, k = seen[key] = (seen[key] || 0) + 1;
        const a = mk('a', { href: TG.read(c[3]), target: '_blank' }, svg);
        const rc = mk('rect', { class: 'c', x: sx(c[0]) - 3 + (k - 1) * 4.5, y: top + li * lh + lh * 0.15, width: 4, height: lh * 0.72, rx: 1, fill: regColor(c[1]) }, a);
        rc.addEventListener('mousemove', (e) => { const b = deck.getBoundingClientRect(); tip.innerHTML = `${esc(c[2])}<small>${esc(c[1])} · ${esc(c[5])} · ${c[4]} pp. · open it</small>`; tip.hidden = false;
          tip.style.left = `${Math.min(e.clientX - b.left + 12, b.width - 240)}px`; tip.style.top = `${e.clientY - b.top - 40}px`; });
        rc.addEventListener('mouseleave', () => { tip.hidden = true; });
        return { c, a, rc }; });
      // the great confessions become flags above the lanes once dealt
      const rows = [6, 18, 30, 42, 54].map((v) => v * (top / 64)), lastX = rows.map(() => -1e9), narrow = W < 600;
      const SH = { 'rc-001': 'Sixty-Seven Articles', 'rc-016': 'First Helvetic', 'rc-027': 'Tigurinus', 'rc-046': 'French', 'rc-057': 'Belgic', 'rc-061': 'Heidelberg', 'rc-063': 'Second Helvetic', 'rc-097': 'Remonstrance', 'rc-105': 'Dort', 'rc-125': 'Consensus' };
      flags = D.big.map((b) => { const x = sx(b.y), g = mk('g', { class: 'flag', opacity: 0 }, svg), lab = narrow ? '' : (SH[b.s.slice(0, 6)] || b.t);
        let r = 0; const w = lab.length * 6.6 + 8; while (r < rows.length - 1 && x - 4 < lastX[r]) r++; lastX[r] = x + w;
        mk('line', { x1: x, x2: x, y1: rows[r] + 4, y2: top - 2 }, g); mk('circle', { cx: x, cy: rows[r] + 4, r: 2.5, fill: TG.css('--rubric') }, g);
        const t = mk('text', { x: x + 5, y: rows[r] + 8 }, g); t.textContent = lab; return { b, g }; });
    }
    let year = -1, curBig = -2;
    function render(Y, instant) {
      year = Y;
      cards.forEach(({ c, rc }) => { const on = c[0] <= Y; if (rc._on === on) return; rc._on = on;
        if (G && !instant) gsap.to(rc, { opacity: on ? 1 : 0, y: on ? 0 : -16, duration: 0.45, ease: 'power2.out' }); else { rc.style.opacity = on ? 1 : 0; rc.style.transform = on ? 'none' : 'translateY(-16px)'; } });
      let bi = -1; D.big.forEach((b, i) => { if (b.y <= Y) bi = i; });
      flags.forEach((f, i) => { const on = i < bi || (instant && i <= bi); if (f._on === on) return; f._on = on; if (G && !instant) gsap.to(f.g, { opacity: on ? 1 : 0, duration: 0.5 }); else f.g.setAttribute('opacity', on ? 1 : 0); });
      if (bi !== curBig) { const dir = bi > curBig; curBig = bi; deal(bi, dir, instant); }
    }
    function deal(i, fwd, instant) {
      const b = D.big[Math.max(0, i)];
      const html = i < 0 ? `<p class="pl">The first Reformed confession</p><h3>Scroll to deal the cards</h3><p>From Zwingli’s theses of 1523 to the last Swiss formula of 1675.</p>`
        : `<span class="y">${b.y}</span><h3>${esc(b.t)}</h3><span class="pl">${esc(b.place)}</span><p>${esc(b.note)}</p>
          <div class="who">${b.who.length ? `On the shelf: ${b.who.map((w) => `<button type="button" data-w="${esc(w)}">${esc(w)}</button>`).join('')}` : ''}</div>
          <p class="rd" style="margin:8px 0 0"><a href="${TG.read(b.s)}" target="_blank" rel="noopener">Read the ${esc(b.t.replace(/^The /, ''))}</a> <span class="small">${b.p} pp.</span></p>`;
      const swap = () => { card.innerHTML = html; card.querySelectorAll('button[data-w]').forEach((x) => x.addEventListener('click', () => explorer && explorer.show(x.dataset.w))); };
      if (!G || instant) { swap(); return; }
      gsap.timeline().to(card, { y: fwd ? 40 : -30, xPercent: fwd ? -44 : -56, rotation: fwd ? 4 : -4, opacity: 0, duration: 0.28, ease: 'power2.in' })
        .add(swap).fromTo(card, { y: fwd ? -60 : 40, xPercent: fwd ? -64 : -36, rotation: fwd ? -7 : 5, opacity: 0 }, { y: 0, xPercent: -50, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.4)' });
    }
    if (G && TG.pinOK()) { card.style.transform = 'none'; gsap.set(card, { xPercent: -50 }); }
    build(); render(TG.pinOK() ? Y0 : Y1, true);
    TG.chapter('#tg-conf', 3800, (p, fin) => render(fin ? Y1 : lerp(Y0, 1690, p), fin), { scrub: 0.4 });
    if (!TG.pinOK()) card.style.transform = 'none';
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(svg.clientWidth - W) > 2) { build(); const y = year; year = -1; cards.forEach((c) => { c.rc._on = undefined; }); flags.forEach((f) => { f._on = undefined; }); render(y, true); } }, 150); });
  })();

  /* ---------- 4. divide, and divide again: Polanus's tree ---------- */
  (function ramus() {
    const stage = document.getElementById('tg-ramus-stage'), svg = stage.querySelector('svg'), steps = document.getElementById('tg-rsteps');
    const MAIN = new Set(['Christian theology', 'True theology', 'Ectypal', 'Of wayfarers', 'Supernatural', 'Its parts']);
    const nodes = []; let leaves = 0, maxD = 0;
    (function walk(n, d, parent) { const o = { en: n[0], la: n[1], gl: n[2], ref: n[3], kids: [], d, parent }; nodes.push(o); maxD = Math.max(maxD, d);
      if (!n[4].length) o.leaf = leaves++; n[4].forEach((k) => o.kids.push(walk(k, d + 1, o))); return o; })(D.tree, 0, null);
    const STEPS = [
      ['Theology is false or true', 'Book I, chapters I and II.'],
      ['True theology is archetypal or ectypal', 'God’s own knowledge of himself, and the copy of it he gives to creatures (chapters III and IV), a distinction Polanus took from Junius.'],
      ['Ectypal theology is of union, of vision, or of wayfarers', 'In the human soul of Christ, in the blessed in heaven, and in us on the way (chapters VII to IX).'],
      ['Ours is natural or supernatural', 'What nature teaches, and what God has revealed and we could not know otherwise (chapters X and XI).'],
      ['Revealed theology has its principle and its parts', 'Its principle is Scripture, which fills the rest of Book I; its parts open Book II.'],
      ['Its parts are faith and good works', 'What is to be believed, and what is to be done.'],
      ['Faith is of God and his works; good works are worship', 'God in himself and in his works, Books II to VII; immediate worship of God and mediate worship toward our neighbour, the two tables of the law, Books IX and X.'],
    ];
    steps.innerHTML = STEPS.map(([b, p]) => `<li><b>${esc(b)}</b><p>${esc(p)}</p></li>`).join('');
    const sl = [...steps.children];
    document.getElementById('tg-polbooks').innerHTML = D.polbooks.map(([r, t, s, n]) => `<a href="${TG.read(s)}" target="_blank" rel="noopener" title="${esc(t)}, ${n} pages"><b>${r}</b>${esc(t.replace(/^On (the )?/, '').replace(/ or the Works of.*$/, '').replace(/, and His Divine Attributes|and the Divine Persons|, Decree, and Predestination| of All Things|, Sin, Christ, Covenant.*$| and Ecclesiastical Government| and Good Works/g, ''))}</a>`).join('');
    const COLW = 196, X0 = 22, totalW = X0 + maxD * COLW + 210;
    let H = 0, W = 0, TH = 0, built = false, groups = [];
    function build() {
      W = stage.clientWidth; H = stage.clientHeight; const top = 40, rh = Math.max(84, (H - top * 2) / (leaves - 1)); TH = top * 2 + rh * (leaves - 1);
      (function place(o) { if (o.leaf !== undefined) o.y = top + o.leaf * rh; else { o.kids.forEach(place); o.y = (o.kids[0].y + o.kids[o.kids.length - 1].y) / 2; } o.x = X0 + o.d * COLW; })(nodes[0]);
      svg.setAttribute('width', totalW); svg.setAttribute('height', TH); svg.style.height = `${TH}px`; svg.setAttribute('viewBox', `0 0 ${totalW} ${TH}`); svg.innerHTML = '';
      groups = [];
      nodes.forEach((o) => {
        const g = mk('g', {}, svg); const isMain = MAIN.has(o.en);
        let br = null;
        if (o.kids.length) br = mk('path', { class: `br${isMain ? ' main' : ''}`, d: brace(o.kids[0].x - 22, o.kids[0].y - 12, o.kids[o.kids.length - 1].y - 12, 14) }, g);
        const a = mk('a', { href: TG.read(o.ref[0], o.ref[1]), target: '_blank', class: `nd${isMain ? ' main' : ''}` }, g);
        const ttl = mk('title', {}, a); ttl.textContent = `${o.en}: ${o.gl || ''} (${o.ref[2]})`;
        const la = mk('text', { x: o.x, y: o.y - 12, class: 'la' }, a); la.textContent = o.d === 0 ? 'Theologia' : `${o.la}`;
        const en = mk('text', { x: o.x, y: o.y + 4, class: 'en' }, a); en.textContent = o.en;
        const cp = mk('text', { x: o.x, y: o.y + 17, class: 'cp' }, a); cp.textContent = o.ref[2];
        groups.push({ o, g, br, a });
      });
      built = true;
    }
    let last = -1;
    function render(p, fin) {
      if (!built) build();
      const d = fin ? maxD + 0.999 : p * (maxD + 0.999);
      groups.forEach(({ o, a, br }) => {
        const vis = clamp((d - o.d) * 1.6 + 0.2, 0, 1); a.style.opacity = o.d === 0 ? 1 : vis; a.style.transform = `translateX(${(1 - vis) * -10}px)`;
        if (br) { const L = br._L || (br._L = br.getTotalLength()); br.style.strokeDasharray = L; br.style.strokeDashoffset = L * (1 - clamp((d - o.d) * 1.4, 0, 1)); }
      });
      const focus = (i) => { const rel = nodes.filter((o) => o.parent && MAIN.has(o.parent.en) && (o.d === i || o.d === i + 1)); if (!rel.length) return nodes[0].y;
        const ys = rel.map((o) => o.y); return (Math.min(...ys) + Math.max(...ys)) / 2; };
      const i0 = Math.floor(d), f = clamp(d - i0, 0, 1), fy = lerp(focus(i0), focus(i0 + 1), ease(f));
      const tx = fin && !TG.pinOK() ? 0 : -clamp(X0 + d * COLW - W * 0.62, 0, Math.max(0, totalW - W));
      const ty = fin && !TG.pinOK() ? 0 : -clamp(fy - H * 0.5, 0, Math.max(0, TH - H));
      svg.style.transform = `translate(${tx}px, ${ty}px)`;
      const si = clamp(Math.floor(d) - 1, 0, STEPS.length - 1); if (si !== last) { last = si; sl.forEach((li, i) => { li.classList.toggle('now', i === si); }); }
    }
    if (!TG.pinOK()) {
      const li = (o) => `<li><a href="${TG.read(o.ref[0], o.ref[1])}" target="_blank" rel="noopener" class="${MAIN.has(o.en) ? 'main' : ''}"><i>${esc(o.d === 0 ? 'Theologia' : o.la)}</i> ${esc(o.en)} <small>${esc(o.ref[2])}</small></a>${o.kids.length ? `<ul>${o.kids.map(li).join('')}</ul>` : ''}</li>`;
      stage.classList.add('outline'); stage.innerHTML = `<ul>${li(nodes[0])}</ul>`; sl.forEach((x) => x.classList.add('now')); return; }
    TG.chapter('#tg-ramus', 3600, render, { scrub: 0.5 });
    let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(stage.clientWidth - W) > 2 || Math.abs(stage.clientHeight - H) > 2) { built = false; render(0); } }, 120); }).observe(stage);
  })();

  /* ---------- 5. the stream of generations ---------- */
  (function stream() {
    const host = document.getElementById('tg-stream'), svg = d3.select(host.querySelector('svg')), tip = host.querySelector('.tip');
    const Y0 = 1480, Y1 = 1790, BIN = 5, bins = d3.range(Y0, Y1 + 1, BIN);
    const active = (a) => { const coll = /^The |Synod|theses/.test(a.n) || /^fl\./.test(a.d || ''); return [coll ? a.y0 : Math.min(a.y0 + 24, a.y1), a.y1]; };
    const rows = bins.map((y) => { const r = { y }; FAMS.forEach((k) => { r[k] = 0; }); D.authors.forEach((a) => { const [s, e] = active(a); if (s <= y + BIN / 2 && e >= y - BIN / 2) r[a.f] += 1; }); return r; });
    const names = (y, k) => D.authors.filter((a) => { const [s, e] = active(a); return a.f === k && s <= y && e >= y; }).map((a) => a.n);
    const series = d3.stack().keys(FAMS).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(rows);
    document.getElementById('tg-stream-legend').innerHTML = D.fam.map(([k, n]) => `<span><i style="background:${fc(k)}"></i>${esc(n)}</span>`).join('');
    const EV = [[1536, 'Institutes'], [1559, 'Geneva Academy'], [1563, 'Heidelberg Catechism'], [1575, 'Leiden'], [1618, 'Dort'], [1634, 'Amyraut'], [1648, 'Cocceius on the covenant'], [1675, 'Formula Consensus'], [1685, 'the Revocation']];
    const PER = [[1517, 1565, 'Reformation'], [1565, 1640, 'Early orthodoxy'], [1640, 1725, 'High orthodoxy'], [1725, 1790, 'Late orthodoxy']];
    let W = 0, reveal = null, nowT = null, nowL = null, evs = [], sx;
    function build() {
      W = host.clientWidth; const H = svg.node().clientHeight, top = 52, bot = H - 54;
      sx = d3.scaleLinear([Y0, Y1], [0, W]); const ext = [d3.min(series, (s) => d3.min(s, (d) => d[0])), d3.max(series, (s) => d3.max(s, (d) => d[1]))];
      const sy = d3.scaleLinear(ext, [bot, top]);
      svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
      const defs = svg.append('defs'); const clip = defs.append('clipPath').attr('id', 'tg-ref-clip'); reveal = clip.append('rect').attr('x', 0).attr('y', 0).attr('height', H).attr('width', 0);
      const per = svg.append('g').attr('class', 'per');
      PER.forEach(([a, b, n], i) => { per.append('rect').attr('x', sx(a)).attr('y', bot + 22).attr('width', sx(b) - sx(a) - 2).attr('height', 3).attr('opacity', i % 2 ? 0.6 : 1);
        per.append('text').attr('x', sx(a) + 2).attr('y', bot + 40).text(W < 600 ? ['Reform.', 'Early', 'High', 'Late'][i] : n); });
      const ax = svg.append('g').attr('class', 'ax');
      for (let y = 1500; y <= 1775; y += 25) { ax.append('line').attr('x1', sx(y)).attr('x2', sx(y)).attr('y1', top - 8).attr('y2', bot + 6).attr('stroke', TG.css('--rule-2')); ax.append('text').attr('x', sx(y)).attr('y', bot + 17).attr('text-anchor', 'middle').text(y); }
      const area = d3.area().x((d) => sx(d.data.y)).y0((d) => sy(d[0])).y1((d) => sy(d[1])).curve(d3.curveBasis);
      const g = svg.append('g').attr('clip-path', 'url(#tg-ref-clip)');
      g.selectAll('path.s').data(series).join('path').attr('class', 's').attr('d', area).attr('fill', (s) => fc(s.key)).attr('opacity', 0.9)
        .on('mousemove', (e, s) => { const [mx] = d3.pointer(e, host), y = Math.round(sx.invert(mx) / 5) * 5, n = names(y, s.key); const b = host.getBoundingClientRect();
          tip.innerHTML = `${esc(famName(s.key))}, about ${y}<small>${n.length ? esc(n.slice(0, 8).join(', ')) + (n.length > 8 ? ` and ${n.length - 8} more` : '') : 'none at work'}</small>`; tip.hidden = false;
          tip.style.left = `${Math.min(mx + 14, b.width - 260)}px`; tip.style.top = `${d3.pointer(e, host)[1] - 20}px`; })
        .on('mouseleave', () => { tip.hidden = true; });
      const evg = svg.append('g').attr('class', 'ev'); const lanes = [12, 27, 42], lastX = lanes.map(() => -1e9), narrow = W < 600;
      evs = EV.filter(([y]) => !narrow || [1536, 1618, 1685].includes(y)).map(([y, t]) => { const x = sx(y); let r = 0; while (r < lanes.length - 1 && x - 4 < lastX[r]) r++; lastX[r] = x + t.length * 6.4 + 12;
        const gg = evg.append('g').attr('opacity', 0); gg.append('line').attr('x1', x).attr('x2', x).attr('y1', lanes[r] + 4).attr('y2', bot);
        gg.append('text').attr('x', x + 4).attr('y', lanes[r]).text(t); return { y, gg }; });
      nowL = svg.append('line').attr('y1', top - 10).attr('y2', bot + 6).attr('stroke', TG.css('--rubric')).attr('stroke-width', 1.2);
      nowT = svg.append('text').attr('class', 'now').attr('y', bot - 8);
    }
    let cur = 1;
    function render(p) {
      cur = p; const Y = lerp(Y0 + 10, Y1, p), x = sx(Y);
      reveal.attr('width', x); nowL.attr('x1', x).attr('x2', x).attr('opacity', p < 1 ? 1 : 0);
      nowT.attr('x', Math.min(x + 8, W - 100)).text(p < 1 ? Math.round(Y) : '').attr('text-anchor', 'start');
      evs.forEach((e) => e.gg.attr('opacity', e.y <= Y ? 1 : 0));
    }
    build();
    TG.chapter('#tg-gen', 2800, render, { scrub: 0.5 });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(host.clientWidth - W) > 2) { build(); render(cur); } }, 150); });
  })();

  /* ---------- explore ---------- */
  explorer = TG.explorer(document.getElementById('tg-explorer'), D, { range: [1470, 1790], first: 'John Calvin', placeholder: 'Calvin, Voetius, covenant…', label: 'Lifelines of the writers on the Continental Reformed shelf' });
  TG.reveal('.tg .reveal');
})();
