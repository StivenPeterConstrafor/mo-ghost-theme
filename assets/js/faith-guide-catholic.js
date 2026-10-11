/* The Roman Catholic shelf guide: the bookcase sorting itself into schools, the schools as streams, the colleges on the map,
   the plan of Suárez's Metaphysical Disputations opening out, and the sessions of Trent. */
(async () => {
  const {TG} = window, D = await TG.load('data'), LAND = await TG.load('land');
  const { esc, fmt, clamp, ease, lerp } = TG, G = TG.hasG && !TG.reduce ? window.gsap : null;
  const FAMS = D.fam.map((f) => f[0]), fc = (k) => TG.css(`--f${FAMS.indexOf(k) + 1}`), famName = (k) => (D.fam.find((f) => f[0] === k) || [])[1];
  const fcI = (i) => TG.css(`--f${i + 1}`);
  const NS = 'http://www.w3.org/2000/svg';
  let explorer = null;

  /* ---------- hero: facts, and the bookcase that sorts itself into the schools ---------- */
  const facts = { works: D.n_works, authors: D.n_authors, pages: D.n_pages, schools: D.fam.length };
  document.querySelectorAll('[data-count]').forEach((el) => TG.countUp(el, facts[el.dataset.count], 1.8));
  (function bookcase() {
    const host = document.getElementById('tg-case'), tip = host.querySelector('.tip'), tick = document.getElementById('tg-tick'), cap = document.getElementById('tg-case-cap');
    const B = D.books, H = (p) => Math.round(15 + 44 * Math.sqrt(Math.min(p, 2400) / 2400));
    const els = B.map((b, i) => { const a = document.createElement('a'); a.className = 'bk'; a.href = TG.read(b[2]); a.target = '_blank'; a.rel = 'noopener';
      a.style.background = fcI(b[4]); a.style.height = `${H(b[3])}px`; a.setAttribute('aria-label', `${b[1]}, ${b[0]}, ${fmt(b[3])} pages`); a.dataset.i = i; host.appendChild(a); return a; });
    let mode = 'date', deco = [];
    function layout(m) {
      const W = host.clientWidth, narrow = W < 700, gap = 1, pad = 12, rowGap = 14, LW = m === 'school' && !narrow ? 250 : 0;
      // by school, each school keeps to one shelf: the spines narrow until the largest school fits (the Jesuits wrapped at 1360px, 10-10)
      const most = Math.max(...FAMS.map((_, fi) => B.filter((b) => b[4] === fi).length));
      let bw = W < 520 ? 2 : W > 1100 ? 4 : 3;
      if (m === 'school' && !narrow) bw = Math.max(1.5, Math.min(bw, (W - pad - LW) / most - gap));
      const pos = new Array(B.length), boards = [], labels = [], cents = []; let y = 14;
      const flow = (idxs, x0) => {
        let row = [], x = x0; const rows = [];
        const flush = () => { if (!row.length) return; const top = y, mh = Math.max(...row.map((i) => H(B[i][3]))); row.forEach((i) => { pos[i].y = top + mh - H(B[i][3]); });
          boards.push(top + mh); rows.push(top); y += mh + 7 + rowGap; row = []; x = x0; };
        for (const i of idxs) { if (x + bw > W - pad && row.length) flush(); pos[i] = { x, y: 0 }; row.push(i); x += bw + gap; }
        flush(); return rows;
      };
      if (m === 'date') {
        const idx = B.map((_, i) => i); const rows = flow(idx, pad);
        let lastC = 0, lastX = -1e9, lastY = -1; idx.forEach((i) => { const c = Math.floor(B[i][5] / 100) * 100; if (c > lastC && c < 2000) { lastC = c; const sameRow = Math.abs(pos[i].y - lastY) < 70; if (!(sameRow && pos[i].x - lastX < 46)) { cents.push({ x: pos[i].x, y: pos[i].y - 22, t: c }); lastX = pos[i].x; lastY = pos[i].y; } } });
      } else {
        FAMS.forEach((k, fi) => { const idx = B.map((b, i) => [b, i]).filter(([b]) => b[4] === fi).map(([, i]) => i); if (!idx.length) return;
          if (narrow) { labels.push({ fi, n: idx.length, x: pad, y }); y += 40; flow(idx, pad); }
          else { const y0 = y; flow(idx, LW); labels.push({ fi, n: idx.length, x: 14, y: y0 + 4 }); } });
      }
      return { pos, boards, labels, cents, bw, height: y - rowGap + 6 };
    }
    function decorate(L, animate) {
      deco.forEach((d) => { if (G && animate) gsap.to(d, { opacity: 0, duration: 0.3, onComplete: () => d.remove() }); else d.remove(); }); deco = [];
      const add = (el, delay) => { host.appendChild(el); deco.push(el); if (G && animate) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.6, delay }); else el.style.opacity = 1; };
      L.boards.forEach((by) => { const d = document.createElement('div'); d.className = 'board'; d.style.top = `${by}px`; add(d, 0.7); });
      L.labels.forEach(({ fi, n, x, y }) => { const d = document.createElement('div'); d.className = 'rl'; d.style.left = `${x}px`; d.style.top = `${y}px`;
        const nA = D.authors.filter((a) => a.f === FAMS[fi]).length + D.undated.filter((a) => a.f === FAMS[fi]).length;
        d.innerHTML = `<i style="background:${fcI(fi)}"></i>${esc(D.fam[fi][1])}<small>${fmt(n)} works · ${nA} authors</small>`; add(d, 0.9 + fi * 0.08); });
      L.cents.forEach(({ x, y, t }) => { const d = document.createElement('div'); d.className = 'cent'; d.style.left = `${x}px`; d.style.top = `${Math.max(0, y)}px`; d.textContent = t; add(d, 0.2); });
    }
    function apply(m, how) { // how: 'set' | 'flip'
      mode = m; const L = layout(m); host.style.height = `${L.height}px`; els.forEach((el) => { el.style.width = `${L.bw}px`; });
      document.querySelectorAll('.tg-cat .seg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
      cap.textContent = m === 'date' ? 'Every book on the shelf in the order its author was born. A taller spine means more pages. Hover over a spine to see it. Open it to read.'
        : 'The same books grouped by school with the oldest first. The long runs are the great sets: Mansi’s councils, the Salamanca course and Suárez’s works.';
      if (how === 'flip' && G) {
        els.forEach((el, i) => gsap.to(el, { x: L.pos[i].x, y: L.pos[i].y, duration: 1.15, ease: 'power3.inOut', delay: (B[i][4] * 0.05) + (i % 40) * 0.002 }));
      } else els.forEach((el, i) => { if (window.gsap) gsap.set(el, { x: L.pos[i].x, y: L.pos[i].y, opacity: 1 }); else el.style.transform = `translate(${L.pos[i].x}px,${L.pos[i].y}px)`; });
      decorate(L, how === 'flip');
      tick.textContent = '';
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), how === 'flip' ? 1300 : 50);
    }
    document.querySelectorAll('.tg-cat .seg button').forEach((b) => b.addEventListener('click', () => { if (b.dataset.mode !== mode) apply(b.dataset.mode, 'flip'); }));
    host.addEventListener('mouseover', (e) => { const a = e.target.closest('.bk'); if (!a) return; const b = B[+a.dataset.i];
      tip.innerHTML = `${esc(b[1])}<small>${esc(b[0])} · ${fmt(b[3])} pages · ${esc(D.fam[b[4]][1])}</small>`; tip.hidden = false; });
    host.addEventListener('mousemove', (e) => { if (tip.hidden) return; const r = host.getBoundingClientRect(); tip.style.left = `${Math.min(e.clientX - r.left + 12, r.width - 250)}px`; tip.style.top = `${e.clientY - r.top + 16}px`; });
    host.addEventListener('mouseleave', () => { tip.hidden = true; });
    host.addEventListener('focusin', (e) => { const a = e.target.closest('.bk'); if (a) { const b = B[+a.dataset.i]; tip.innerHTML = `${esc(b[1])}<small>${esc(b[0])}</small>`; tip.hidden = false; tip.style.left = '12px'; tip.style.top = '8px'; } });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => apply(mode, 'set'), 160); });
    if (!G) { apply('school', 'set'); return; }
    // the intro: the books arrive in order of their authors' births, then go to their schools
    const L = layout('date'); host.style.height = `${L.height}px`; els.forEach((el) => { el.style.width = `${L.bw}px`; });
    els.forEach((el, i) => gsap.set(el, { x: L.pos[i].x, y: L.pos[i].y - 46, opacity: 0 }));
    decorate({ boards: L.boards, labels: [], cents: L.cents }, true);
    const n = els.length, per = 2.8 / n, counter = { i: 0 };
    const tl = gsap.timeline({ delay: 0.35 });
    els.forEach((el, i) => tl.to(el, { y: L.pos[i].y, opacity: 1, duration: 0.55, ease: 'back.out(1.7)' }, i * per));
    tl.to(counter, { i: n - 1, duration: n * per, ease: 'none', onUpdate() { const yv = B[Math.round(counter.i)][5]; tick.textContent = yv < 2000 ? yv : ''; } }, 0);
    tl.add(() => { tick.textContent = ''; }, '+=0.9').add(() => apply('school', 'flip'), '+=0.1');
  })();

  /* ---------- 1. the schools as streams ---------- */
  (function streams() {
    const box = document.getElementById('tg-stream-box'), svg = d3.select(box.querySelector('svg')), tip = box.querySelector('.tip');
    const W = 820, H = 480, X0 = 1450, X1 = 1980, x = d3.scaleLinear().domain([X0, X1]).range([20, W - 20]);
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    const rows = D.dec.map((dec, i) => Object.fromEntries([['dec', dec], ...FAMS.map((k) => [k, D.streams[k][i]])]));
    const series = d3.stack().keys(FAMS).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(rows);
    const lo = d3.min(series, (s) => d3.min(s, (d) => d[0])), hi = d3.max(series, (s) => d3.max(s, (d) => d[1]));
    const y = d3.scaleLinear().domain([lo, hi]).range([H - 62, 70]);
    const area = d3.area().x((d) => x(d.data.dec + 5)).y0((d) => y(d[0])).y1((d) => y(d[1])).curve(d3.curveBasis);
    const defs = svg.append('defs'), clip = defs.append('clipPath').attr('id', 'tg-sclip').append('rect').attr('x', 0).attr('y', 0).attr('height', H).attr('width', 0);
    const hatch = defs.append('pattern').attr('id', 'tg-hatch').attr('width', 6).attr('height', 6).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
    hatch.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', TG.css('--ink')).attr('stroke-opacity', 0.18).attr('stroke-width', 2);
    // axis and the turning points
    const ax = svg.append('g');
    for (let yr = 1450; yr <= 1950; yr += 50) ax.append('text').attr('class', 'ax').attr('x', x(yr)).attr('y', H - 34).attr('text-anchor', 'middle').text(yr);
    ax.append('line').attr('x1', x(X0)).attr('x2', x(X1)).attr('y1', H - 50).attr('y2', H - 50).attr('stroke', TG.css('--rule'));
    const EVS = [[1545, 1563, 'Trent'], [1597, 1607, 'De auxiliis'], [1653, 1653, 'Cum occasione'], [1682, 1682, 'Gallican Articles'], [1773, 1814, 'Jesuits suppressed'], [1879, 1879, 'Aeterni Patris']];
    const ev = svg.append('g').attr('class', 'ev');
    const evEls = EVS.map(([a, b, t], i) => { const g = ev.append('g').style('opacity', 0); const lane = i % 2 ? 36 : 16;
      if (b > a) g.append('rect').attr('x', x(a)).attr('y', lane + 8).attr('width', Math.max(2, x(b) - x(a))).attr('height', H - 58 - lane - 8).attr('fill', 'url(#tg-hatch)');
      g.append('line').attr('x1', x(a)).attr('x2', x(a)).attr('y1', lane + 6).attr('y2', H - 50);
      g.append('text').attr('x', x(a) + 4).attr('y', lane + 4).text(t); return { g, a }; });
    const g = svg.append('g').attr('clip-path', 'url(#tg-sclip)');
    g.selectAll('path').data(series).join('path').attr('d', area).attr('fill', (s) => fc(s.key)).attr('fill-opacity', 0.92).attr('stroke', TG.css('--paper')).attr('stroke-width', 0.8);
    // a label in each stream where it is widest
    const labs = series.map((s) => { let best = 0, bi = 0; s.forEach((d, i) => { const w = y(d[0]) - y(d[1]); if (w > best) { best = w; bi = i; } });
      const d = s[bi], nm = { thomist: 'Thomists', scotist: 'Scotists', jesuit: 'Jesuits', augustinian: 'Augustinians', secular: 'Seculars', history: 'Councils and historians' }[s.key];
      const lx = clamp(x(d.data.dec + 5), 70, W - 20 - nm.length * 4.2);
      return best > 14 ? { x: lx, y: (y(d[0]) + y(d[1])) / 2 + 5, t: nm, dec: d.data.dec } : null; }).filter(Boolean);
    const placed = labs.map((l) => [l.x - l.t.length * 4, l.y - 13, l.t.length * 8, 17]);
    const free = (bx) => !placed.some((q) => bx[0] < q[0] + q[2] && bx[0] + bx[2] > q[0] && bx[1] < q[1] + q[3] && bx[1] + bx[3] > q[1]);
    const labG = svg.append('g').attr('clip-path', 'url(#tg-sclip)');
    const labEls = labs.map((l) => ({ ...l, el: labG.append('text').attr('class', 'lab').attr('x', l.x).attr('y', l.y).attr('text-anchor', 'middle').text(l.t).style('opacity', 0) }));
    // the best-known writers as points in their stream
    const center = (k, yr) => { const s = series.find((q) => q.key === k), i = clamp(Math.floor((yr - 1450) / 10), 0, D.dec.length - 1), d = s[i]; return [x(yr), (y(d[0]) + y(d[1])) / 2, y(d[0]) - y(d[1])]; };
    const A = D.authors.filter((a) => a.f !== 'history' || a.p > 6000).map((a) => { const start = Math.max(1456, a.y1 - a.y0 > 30 ? a.y0 + 30 : a.y0); const [px, py, th] = center(a.f, Math.min(start, 1975)); return { a, start, px, py: py + (((a.n.length * 7) % 11) - 5) * Math.min(1, th / 30) }; });
    const top = new Set(A.slice().sort((p, q) => q.a.p - p.a.p).slice(0, 13).map((p) => p.a.n).concat(['Domingo Báñez', 'Luis de Molina', 'Cornelius Jansen', 'Jacques-Bénigne Bossuet']));
    const dots = svg.insert('g', () => labG.node());
    A.sort((p, q) => (top.has(q.a.n) - top.has(p.a.n)) || q.a.p - p.a.p);
    const dotEls = A.map((p) => { const gg = dots.append('g').style('opacity', 0).style('cursor', 'pointer');
      gg.append('circle').attr('cx', p.px).attr('cy', p.py).attr('r', top.has(p.a.n) ? 3.6 : 2.2).attr('fill', TG.css('--card')).attr('stroke', TG.css('--ink')).attr('stroke-width', 1.1);
      if (top.has(p.a.n)) { const nm = p.a.n.replace(/^(Francisco|Robert|Luis de|Domingo|Thomas|Cornelius a|Giovanni Domenico|Alfonso|Denis|Jacques-Bénigne|Cornelius|Caesar|Honoré|Emmanuel|Juan José) /, '');
        const w = nm.length * 6 + 4; for (const [dx, dy, anc] of [[6, -5, 'start'], [-6, -5, 'end'], [6, 13, 'start'], [-6, 13, 'end']]) { const bx = [anc === 'start' ? p.px + dx : p.px + dx - w, p.py + dy - 10, w, 13];
          if (free(bx) && bx[0] > 2 && bx[0] + w < W - 2) { placed.push(bx); gg.append('text').attr('class', 'who').attr('x', p.px + dx).attr('y', p.py + dy).attr('text-anchor', anc).text(nm); break; } } }
      gg.on('click', () => explorer && explorer.show(p.a.n)).on('mousemove', (e) => { const r = box.getBoundingClientRect(); tip.innerHTML = `${esc(p.a.n)}<small>${esc(TG.yr(p.a))} · ${esc(famName(p.a.f))}</small>`; tip.hidden = false; tip.style.left = `${Math.min(e.clientX - r.left + 10, r.width - 200)}px`; tip.style.top = `${e.clientY - r.top + 12}px`; }).on('mouseleave', () => { tip.hidden = true; });
      return { ...p, gg }; });
    const nowEl = document.getElementById('tg-now'), nowEv = document.getElementById('tg-now-ev'), nowWho = document.getElementById('tg-now-who');
    const NOTE = { 1450: 'The councils of the fifteenth century and the first Thomists: Gerson, Tostado and Cajetan.', };
    const ev2 = D.events; let lastKey = '';
    function render(yr) {
      clip.attr('width', x(yr));
      evEls.forEach((e) => e.g.style('opacity', yr >= e.a ? 1 : 0));
      labEls.forEach((l) => l.el.style('opacity', yr >= l.dec + 20 ? 1 : 0));
      dotEls.forEach((d) => d.gg.style('opacity', yr >= d.start ? 1 : 0));
      const dec = Math.floor(yr / 10) * 10; nowEl.textContent = `${dec}s`;
      let e = null; ev2.forEach((q) => { if (q[0] <= yr) e = q; });
      const live = D.authors.filter((a) => a.y0 + 25 <= yr && yr <= a.y1 && a.f !== 'history').sort((p, q) => q.p - p.p).slice(0, 9);
      const key = `${dec}|${e && e[0]}|${live.map((a) => a.n).join()}`; if (key === lastKey) return; lastKey = key;
      nowEv.innerHTML = e ? `<b style="font:600 .8rem var(--body);color:var(--rubric)">${e[0]}</b> ${esc(e[1])}: ${esc(e[2])}` : esc(NOTE[1450]);
      nowWho.innerHTML = live.map((a) => `<span><i style="background:${fc(a.f)}"></i>${esc(a.n)}</span>`).join('') || '<span class="small" style="border:0;background:none">No writer of the schools on this shelf is at work.</span>';
    }
    const st = TG.chapter('#tg-streams', 3800, (p, fin) => { render(lerp(1455, 1980, p)); if (fin) summary(); }, { scrub: 0.5 });
    function summary() { // phones and reduced motion: the whole river at once, and its busiest decade
      const tot = D.dec.map((dec, i) => [dec, FAMS.reduce((t, k) => t + D.streams[k][i], 0)]).sort((a, b) => b[1] - a[1])[0];
      const live = D.authors.filter((a) => a.y0 + 25 <= tot[0] + 9 && tot[0] <= a.y1 && a.f !== 'history').sort((p, q) => q.p - p.p).slice(0, 9);
      nowEl.textContent = `${tot[0]}s`; nowEv.textContent = `The busiest decade on the shelf: ${tot[1]} writers at work.`;
      nowWho.innerHTML = live.map((a) => `<span><i style="background:${fc(a.f)}"></i>${esc(a.n)}</span>`).join('');
    }
  })();

  /* ---------- 2. the colleges on the map ---------- */
  (function road() {
    const box = document.getElementById('tg-map'), M = TG.map(box, LAND, [[-10, 36.6], [25.6, 55.4]], { parallels: [38, 54] });
    const cv = TG.canvas(box.querySelector('canvas')), {ctx} = cv, P = D.places;
    const SCH = new Set(D.schools.map((s) => s[0]));
    const J = D.journeys.map((j) => { const pts = j.s.map(([p, yy]) => ({ p, y: yy, ll: P[p] })), born = pts.length > 2 && !SCH.has(pts[0].p); return { ...j, pts, from: born ? pts[1].y - 4 : pts[0].y }; });
    const schools = D.schools.map(([p, yy]) => ({ p, y: yy, ll: P[p], note: D.school_note[p] }));
    const LBL = { Alcalá: [7, 12, 'left'], Madrid: [-7, 12, 'right'], Salamanca: [-7, -6, 'right'], Coimbra: [-7, -6, 'right'], Douai: [-7, -6, 'right'], Louvain: [7, -6, 'left'], Dillingen: [-7, 12, 'right'], Ingolstadt: [7, -6, 'left'] };
    const chron = TG.chronicle(document.getElementById('tg-chron'), D.events, ([yy, e, w]) => `<li><span class="d">${yy}</span><span class="e">${esc(e)}</span><span class="w">${esc(w)}</span></li>`);
    document.getElementById('tg-legend').innerHTML = `${D.fam.filter(([k]) => J.some((j) => j.f === k)).map(([k, n]) => `<span><i style="background:${fc(k)}"></i>${esc(n)}</span>`).join('')}<span><i style="background:transparent;border:1.5px solid var(--ink);border-radius:1px"></i>a university or college</span>`;
    const ribbon = document.getElementById('tg-ribbon'); let year = 1470, lastR = '';
    const curve = (a, b, t) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], k = 0.18, cx = mx - dy * k, cy = my + dx * k, u = 1 - t; return [u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]; };
    function at(j, Y) {
      if (Y < j.from) return null; const pts = j.pts.map((s) => ({ ...s, xy: M.xy(s.ll) })); const trail = [pts[0].xy]; let pos = pts[0].xy, moving = false;
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1];
        if (Y >= b.y) { for (let s = 1; s <= 16; s++) trail.push(curve(a.xy, b.xy, s / 16)); pos = b.xy; continue; }
        if (Y > a.y) { const span = Math.max(1, b.y - a.y), travel = Math.min(span, 3), t = clamp((Y - (b.y - travel)) / travel, 0, 1), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2)**2 / 2;
          for (let s = 1; s <= 16 * e; s++) trail.push(curve(a.xy, b.xy, s / 16)); pos = curve(a.xy, b.xy, e); moving = t > 0 && t < 1; }
        break; }
      return { pos, trail, alive: Y <= pts[pts.length - 1].y + 0.5, moving };
    }
    function render(Y) {
      year = Y; ctx.clearRect(0, 0, cv.W, cv.H); const ink = TG.css('--ink');
      ctx.font = `italic 12px ${TG.css('--display')}`;
      for (const s of schools) { if (s.y > Y) continue; const [px, py] = M.xy(s.ll), pop = clamp((Y - s.y) / 6, 0, 1), sz = 5 + 2 * (1 - pop);
        ctx.globalAlpha = 0.25 + 0.6 * pop; ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.strokeRect(px - sz / 2, py - sz / 2, sz, sz);
        const [dx, dy, al] = LBL[s.p] || [7, -6, 'left']; ctx.textAlign = al; ctx.fillStyle = ink; ctx.globalAlpha = 0.75 * pop; ctx.fillText(s.p, px + dx, py + dy); ctx.textAlign = 'left'; }
      ctx.globalAlpha = 1; const live = [], boxes = [];
      for (const j of J) { const r = at(j, Y); if (!r) continue; const c = fc(j.f);
        ctx.strokeStyle = c; ctx.lineWidth = r.alive ? 1.8 : 1.1; ctx.globalAlpha = r.alive ? 0.55 : 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); r.trail.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
        if (r.alive) live.push({ j, r, c }); else { ctx.globalAlpha = 0.35; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(r.pos[0], r.pos[1], 1.8, 0, 6.283); ctx.fill(); } }
      for (const { r, c } of live) { const [px, py] = r.pos; ctx.globalAlpha = 0.18; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, r.moving ? 10 : 7, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(px, py, 4.2, 0, 6.283); ctx.fill(); ctx.strokeStyle = TG.css('--card'); ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.font = `600 11.5px ${TG.css('--body')}`;
      for (const { j, r, c } of live.sort((a, b) => a.r.pos[1] - b.r.pos[1])) { const [px, py] = r.pos, w = ctx.measureText(j.a).width; let lx = px + 8, ly = py + 4;
        const hit = (bx, by) => boxes.some((b) => bx < b[0] + b[2] && bx + w > b[0] && by - 10 < b[1] + 4 && by + 2 > b[1] - 10);
        if (hit(lx, ly)) lx = px - 8 - w; if (hit(lx, ly)) { lx = px + 8; ly = py + 16; } if (hit(lx, ly)) continue;
        boxes.push([lx, ly, w]); ctx.fillStyle = TG.css('--land'); ctx.globalAlpha = 0.85; ctx.fillRect(lx - 2, ly - 11, w + 4, 14); ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.fillText(j.a, lx, ly); }
      ctx.globalAlpha = 1;
      document.getElementById('tg-year').textContent = Math.round(Y);
      document.getElementById('tg-yearbar').style.width = `${(Y - 1470) / (1890 - 1470) * 100}%`;
      chron(Y);
      const names = live.map(({ j }) => j.a).join('|');
      if (names !== lastR) { lastR = names; ribbon.innerHTML = live.map(({ j, c }) => `<span><i style="background:${c}"></i>${esc(j.a)}</span>`).join('') || '<span class="small" style="border:0;background:none">None of these masters is yet at work.</span>'; }
    }
    M.onfit = () => { cv.size(); render(year); };
    TG.chapter('#tg-road', 4600, (p) => render(lerp(1470, 1890, p)), { scrub: 0.4 });
  })();

  /* ---------- 3. Suárez: four volumes open into fifty-four disputations ---------- */
  (function suarez() {
    const X = D.dm, box = document.getElementById('tg-dm-box'), svg = box.querySelector('svg'), tip = box.querySelector('.tip'), card = document.getElementById('tg-dm-card');
    const W = 760, H = 470, base = 340, gapG = 7, left = 18, right = 18;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const groupOf = (n) => X.groups.findIndex(([a, b]) => n >= a && n <= b);
    const nG = X.groups.length, cw = (W - left - right - gapG * (nG - 1)) / X.disp.length;
    const xs = X.disp.map((d) => left + (d.n - 1) * cw + groupOf(d.n) * gapG);
    const maxpp = Math.max(...X.disp.map((d) => d.pp)), hh = (pp) => 6 + 236 * pp / maxpp;
    const GC = ['#6b4632', '#8a5a2b', '#a07c35', '#a3382a', '#2f4a6b', '#5b6b3a', '#6d4c7d'];
    const mk = (tag, at, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); parent.appendChild(e); return e; };
    // the four volumes on the shelf
    const volMax = Math.max(...X.vols.map((v) => v.pages));
    const vols = X.vols.map((v, i) => { const x0 = xs[v.from - 1], x1 = xs[v.to - 1] + cw, h = 60 + 220 * v.pages / volMax, gg = mk('g', { class: 'vol' });
      mk('rect', { x: x0 + 2, y: base - h, width: x1 - x0 - 4, height: h, rx: 3, fill: '#5c3a2a' }, gg);
      mk('rect', { x: x0 + 8, y: base - h + 14, width: x1 - x0 - 16, height: 3, fill: '#a07c35' }, gg); mk('rect', { x: x0 + 8, y: base - 22, width: x1 - x0 - 16, height: 3, fill: '#a07c35' }, gg);
      const t = mk('text', { x: (x0 + x1) / 2, y: base - h + 46, 'text-anchor': 'middle', class: 'vl' }, gg); t.textContent = ['I', 'II', 'III', 'IV'][i];
      const s = mk('text', { x: (x0 + x1) / 2, y: base - h + 66, 'text-anchor': 'middle', class: 'vs' }, gg); s.textContent = `Disputations ${v.from}–${v.to}`;
      const s2 = mk('text', { x: (x0 + x1) / 2, y: base - h + 82, 'text-anchor': 'middle', class: 'vs' }, gg); s2.textContent = `${fmt(v.pages)} pages`;
      return gg; });
    const cols = X.disp.map((d, i) => { const gg = mk('g', { class: 'col', tabindex: 0, role: 'link', 'aria-label': `Disputation ${d.n}: ${d.s}, ${d.pp} pages` });
      const r = mk('rect', { x: xs[i] + 1, y: base - hh(d.pp), width: Math.max(2, cw - 2), height: hh(d.pp), rx: 1.5, fill: '#5c3a2a' }, gg);
      if (d.n % 5 === 0 || d.n === 1 || d.n === 54) { const t = mk('text', { x: xs[i] + cw / 2, y: base + 13, 'text-anchor': 'middle', class: 'num' }, gg); t.textContent = d.n; }
      return { gg, r, d }; });
    cols.forEach(({ gg, d }) => {
      const go = () => { const a = document.createElement('a'); a.href = TG.read(d.slug, d.page); a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); };
      gg.addEventListener('click', go); gg.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      gg.addEventListener('mousemove', (e) => { const b = box.getBoundingClientRect(); tip.innerHTML = `Disputation ${d.n}: ${esc(d.s)}<small>${esc(d.t)} · ${d.pp} pages in ${d.secs.length} sections · open it</small>`; tip.hidden = false;
        tip.style.left = `${Math.min(e.clientX - b.left + 12, b.width - 260)}px`; tip.style.top = `${e.clientY - b.top + 14}px`; });
      gg.addEventListener('mouseleave', () => { tip.hidden = true; }); });
    // the two parts and the order of the questions
    const parts = mk('g', { opacity: 0 }), pY = base - hh(maxpp) - 26;
    [[1, 27, 'Part one · being in general'], [28, 54, 'Part two · the kinds of being']].forEach(([a, b, t]) => { const x0 = xs[a - 1], x1 = xs[b - 1] + cw;
      mk('path', { d: `M${x0},${pY + 10} V${pY} H${x1} V${pY + 10}`, fill: 'none', stroke: TG.css('--ink-2'), 'stroke-width': 1 }, parts);
      const tt = mk('text', { x: (x0 + x1) / 2, y: pY - 8, 'text-anchor': 'middle', class: 'part' }, parts); tt.textContent = t; });
    const grps = mk('g', { opacity: 0 });
    const laneEnd = [-1e9, -1e9, -1e9];
    X.groups.forEach(([a, b, t], gi) => { const x0 = xs[a - 1], x1 = xs[b - 1] + cw, yb = base + 22, w = t.length * 6.4;
      mk('rect', { x: x0 + 1, y: yb, width: x1 - x0 - 2, height: 5, fill: GC[gi], rx: 1 }, grps);
      const cx = clamp((x0 + x1) / 2, left + w / 2, W - right - w / 2); let lane = 0; while (lane < 2 && cx - w / 2 < laneEnd[lane] + 8) lane++; laneEnd[lane] = cx + w / 2;
      const lab = mk('text', { x: cx, y: yb + 21 + lane * 15, 'text-anchor': 'middle', class: 'grp' }, grps); lab.textContent = t; });
    const longest = X.disp.reduce((m, d) => (d.pp > m.pp ? d : m), X.disp[0]), focus = X.disp[28];
    const ROMN = (n) => { let s = ''; for (const [v, r] of [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { s += r; n -= v; } return s; };
    const STEPS = [
      ['Four volumes', `On the shelf the Disputations fill four volumes. Together they run to ${fmt(X.vols.reduce((t, v) => t + v.pages, 0))} pages.`],
      ['Fifty-four disputations', `Each column is one disputation. Its height shows its pages. The longest is Disputation ${ROMN(longest.n)} (${longest.s}) at ${longest.pp} pages.`],
      ['Two parts', 'Suárez’s own plan has two parts. The first treats being in general with its unity, truth and goodness and its causes. The second treats the kinds of being from God down to the nine accidents.'],
      ['The order of the questions', 'The questions run from being and its properties to the four causes, God, created substance and the accidents one by one. The beings of reason come last.'],
      ['Inside a disputation', `Each disputation is cut into sections. Each section is cut into numbered paragraphs. Disputation ${ROMN(focus.n)} asks whether God can be known to exist by natural reason.`],
      ['Read it', ''],
    ];
    const stepsEl = document.getElementById('tg-dm-steps');
    stepsEl.innerHTML = STEPS.map(([b, p]) => `<li><b>${esc(b)}</b>${p ? `<p>${esc(p)}</p>` : '<p>Open any column to go to that disputation in the reader. The Latin stands beside the English.</p>'}</li>`).join('');
    const lis = [...stepsEl.children];
    const cardFor = (i) => {
      if (i === 0) return `<p class="eyebrow">Francisco Suárez · Salamanca, 1597</p><h3>Metaphysical Disputations</h3><p class="small">${X.vols.map((v, k) => `<a href="${TG.read(v.slug)}" target="_blank" rel="noopener">Volume ${k + 1}: disputations ${v.from}–${v.to}</a> · ${fmt(v.pages)} pages`).join('<br>')}</p>`;
      if (i === 1) return `<p class="eyebrow">The longest</p><h3><a href="${TG.read(longest.slug, longest.page)}" target="_blank" rel="noopener">Disputation ${ROMN(longest.n)}</a></h3><p>${esc(longest.t)}</p><p class="small">${longest.pp} pages in ${longest.secs.length} sections</p>`;
      if (i === 2) return `<p class="eyebrow">The plan</p><h3>Being, then the kinds of being</h3><p>Disputations 1 to 27 treat being as such. Disputations 28 to 53 divide it into infinite and finite and into substance and accident. The 54th treats the beings of reason. These exist only in the mind.</p>`;
      if (i === 3) return `<p class="eyebrow">The order</p><h3>From being to the nine accidents</h3><p>${X.groups.map(([a, b, t], gi) => `<span style="white-space:nowrap"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${GC[gi]};margin-right:5px"></i>${esc(t)} (${a === b ? a : `${a}–${b}`})</span>`).join(' · ')}</p>`;
      const d = focus;
      return `<p class="eyebrow">Disputation ${ROMN(d.n)} · ${d.pp} pages</p><h3><a href="${TG.read(d.slug, d.page)}" target="_blank" rel="noopener">${esc(d.t)}</a></h3><ol>${d.secs.map(([t, p]) => `<li><a href="${TG.read(d.slug, p)}" target="_blank" rel="noopener">${esc(t.replace(/^[IVXL]+\.\s*/, ''))}</a> <span class="small">p. ${p}</span></li>`).join('')}</ol>`;
    };
    let cur = -1;
    function step(i, instant) {
      if (i === cur) return; const prev = cur; cur = i; lis.forEach((li, j) => li.classList.toggle('now', j === i));
      const anim = G && !instant, T = (el, v, d = 0.6, extra = {}) => (anim ? gsap.to(el, { ...v, duration: d, ease: 'power3.out', ...extra }) : window.gsap ? gsap.set(el, v) : Object.assign(el.style, { opacity: v.opacity }));
      vols.forEach((v, k) => T(v, { opacity: i === 0 ? 1 : 0, scaleY: i === 0 ? 1 : 0.2, transformOrigin: '50% 100%' }, 0.6, { delay: i === 0 ? 0 : k * 0.04 }));
      cols.forEach(({ gg, r, d }, k) => {
        const show = i >= 1, fill = i >= 3 ? GC[groupOf(d.n)] : '#5c3a2a', dim = i >= 4 && d.n !== focus.n;
        const vi = X.vols.findIndex((v) => d.n >= v.from && d.n <= v.to), vc = (xs[X.vols[vi].from - 1] + xs[X.vols[vi].to - 1] + cw) / 2;
        if (anim && show && prev < 1) gsap.fromTo(gg, { scaleY: 0.05, opacity: 1, svgOrigin: `${xs[k] + cw / 2} ${base}`, x: (vc - xs[k]) * 0.55 },
          { scaleY: 1, x: 0, duration: 1.0, ease: 'expo.out', delay: 0.15 + (k - (X.vols[vi].from - 1)) * 0.025 + vi * 0.05 });
        else T(gg, { opacity: show ? (dim ? 0.22 : 1) : 0, scaleY: show ? 1 : 0.05, x: 0, svgOrigin: `${xs[k] + cw / 2} ${base}` }, 0.5);
        r.setAttribute('fill', i >= 4 && d.n === focus.n ? TG.css('--rubric') : fill);
      });
      T(parts, { opacity: i >= 2 ? 1 : 0 }); T(grps, { opacity: i >= 3 ? 1 : 0 });
      card.innerHTML = cardFor(instant && i === 3 ? 4 : i === 5 ? 0 : i);
      if (anim) gsap.fromTo(card.children, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05 });
    }
    TG.chapter('#tg-dm', 3000, (p, fin) => step(fin ? 3 : Math.min(5, Math.floor(p * 6)), fin), { scrub: true });
    if (!TG.pinOK()) lis.forEach((li) => li.classList.add('now'));
  })();

  /* ---------- 4. Trent: twenty-five sessions in three periods ---------- */
  (function trent() {
    const T = D.trent, svg = document.getElementById('tg-trent-svg'), W = 760, H = 330, base = 250, X0 = 1545.6, X1 = 1564.1;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const mk = (tag, at, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); parent.appendChild(e); return e; };
    // three periods; inside each the sessions stand evenly in order, the long suspensions are breaks in the line
    const PER = [[1, 10, 'Paul III', '1545–1547'], [11, 16, 'Julius III', '1551–1552'], [17, 25, 'Pius IV', '1562–1563']], GAP = 46, step = (W - 100 - 2 * GAP) / 25;
    const sx = {}; let cx0 = 24;
    PER.forEach(([a, b, pope, yrs], pi) => { const n = b - a + 1, x0 = cx0, x1 = cx0 + n * step;
      mk('rect', { x: x0, y: base - 214, width: x1 - x0, height: 232, fill: TG.css('--paper-2'), rx: 4 });
      mk('line', { x1: x0, x2: x1, y1: base, y2: base, stroke: TG.css('--ink-2'), 'stroke-width': 1 });
      for (let k = a; k <= b; k++) sx[k] = x0 + (k - a + 0.5) * step;
      const t = mk('text', { x: (x0 + x1) / 2, y: base + 32, 'text-anchor': 'middle', class: 'per' }); t.textContent = yrs;
      const t2 = mk('text', { x: (x0 + x1) / 2, y: base + 46, 'text-anchor': 'middle', class: 'per' }); t2.textContent = pope;
      if (pi < 2) { const gx = x1 + GAP / 2, txt = pi === 0 ? 'four years' : 'ten years';
        mk('path', { d: `M${x1 + 6},${base} l6,-5 l6,10 l6,-10 l6,10 l6,-5`, fill: 'none', stroke: TG.css('--muted'), 'stroke-width': 1 });
        const g1 = mk('text', { x: gx, y: base + 32, 'text-anchor': 'middle', class: 'yr' }); g1.textContent = txt; const g2 = mk('text', { x: gx, y: base + 46, 'text-anchor': 'middle', class: 'yr' }); g2.textContent = 'suspended'; }
      cx0 = x1 + GAP; });
    const nowT = mk('text', { x: W - 20, y: 22, 'text-anchor': 'end', class: 'per' }); nowT.textContent = '';
    const S = T.sessions.map(([n, d, t, pl, what]) => { const g = mk('g', { opacity: 0 }), cx = sx[n], bol = pl === 'Bologna';
      if (what && !/council (moves|resumes|reopens|is suspended|opens)/.test(what)) { const short = what.replace(/; the council closes$/, '').replace('Purgatory, the saints, images, indulgences', 'Purgatory, saints, images, indulgences');
        mk('line', { x1: cx, x2: cx, y1: base - 12, y2: base - 22, stroke: TG.css('--rule'), 'stroke-width': 1 }, g);
        const lab = mk('text', { x: cx + 2, y: base - 26, class: 'ses', transform: `rotate(-62 ${cx + 2} ${base - 26})` }, g); lab.textContent = short; }
      mk('circle', { cx, cy: base, r: 9, fill: bol ? TG.css('--gilt') : TG.css('--rubric'), stroke: TG.css('--card'), 'stroke-width': 1.5 }, g);
      const tn = mk('text', { x: cx, y: base + 3.4, 'text-anchor': 'middle', class: 'sesn' }, g); tn.textContent = n;
      const tt = mk('title', {}, g); tt.textContent = `Session ${n} · ${d}${bol ? ' (Bologna)' : ''}${what ? `: ${what}` : ''}`;
      return { g, t, cx, n, d, pl }; });
    const bigY = { set textContent(v) {} };
    const list = document.getElementById('tg-trent-list');
    const evs = T.sessions.filter((s) => s[4]).map(([n, d, t, pl, what]) => [t, n, d, pl, what]);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const human = (d) => { const [yy, m, dd] = d.split('-').map(Number); return `${dd} ${months[m - 1]} ${yy}`; };
    const chron = TG.chronicle(list, evs, ([t, n, d, pl, what]) => `<li><span class="d">Session ${n}</span><span class="e">${esc(what)}</span><span class="w">${human(d)} at ${esc(pl)}</span></li>`);
    let shown = 0;
    function render(t) {
      const n = S.filter((s) => t >= s.t).length; nowT.textContent = n ? `Session ${S[n - 1].n} · ${human(S[n - 1].d)}${S[n - 1].pl === 'Bologna' ? ' · Bologna' : ''}` : '';
      S.forEach((s, i) => { const on = i < n;
        if (on && i >= shown && G) gsap.fromTo(s.g, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' });
        else if (!on && i < shown) { if (window.gsap) { gsap.killTweensOf(s.g); gsap.set(s.g, { opacity: 0 }); } else s.g.setAttribute('opacity', 0); }
        else if (on && !G) s.g.setAttribute('opacity', 1); });
      shown = n; chron(t);
    }
    TG.chapter('#tg-trent', 3000, (p) => render(lerp(X0, X1, p)), { scrub: 0.4 });
    // the council on the shelf
    const pages = (L) => L.reduce((s, w) => s + w[2], 0), mx = Math.max(...T.acts.map((w) => w[2]), ...T.sarpi.map((w) => w[2]), ...T.pallavicino.map((w) => w[2]));
    const sp = (L, cls) => L.map((w) => `<a class="${cls}" href="${TG.read(w[1])}" target="_blank" rel="noopener" title="${esc(w[0])} · ${fmt(w[2])} pages" style="height:${(24 + 48 * w[2] / mx).toFixed(0)}px"></a>`).join('');
    document.getElementById('tg-onshelf').innerHTML = `
      <div class="card reveal"><h3>The acts of the council</h3><div class="spines">${sp(T.acts, '')}</div><p class="small" style="margin:0">${T.acts.length} volumes and ${fmt(pages(T.acts))} pages of the council’s diaries, acts, letters and treatises.</p></div>
      <div class="card reveal"><h3>Two histories and the councils entire</h3><div class="spines">${sp(T.sarpi, 's')}<span style="width:10px"></span>${sp(T.pallavicino, 'p')}</div>
        <p class="small" style="margin:0">Paolo Sarpi’s history of 1619 is hostile to the papacy. The Jesuit Pietro Sforza Pallavicino answered it in 1656–1657. Mansi’s collection of all the councils is on this shelf too. It runs to ${T.mansi.n} volumes and ${fmt(T.mansi.pages)} pages. <a href="${D.councils_guide}" target="_blank" rel="noopener">See the Councils guide</a>.</p></div>`;
  })();

  /* ---------- explore ---------- */
  explorer = TG.explorer(document.getElementById('tg-explorer'), D, { range: [1360, 1990], first: 'Francisco Suárez', placeholder: 'Suárez, Báñez, grace, Trent…', label: 'Lifelines of the writers on the Roman Catholic shelf' });
  document.getElementById('tg-undated').innerHTML = `Also on the shelf without dates in the record: ${D.undated.map((a) => `<a href="${TG.read(a.w[0][1])}" target="_blank" rel="noopener">${esc(a.n)}</a>`).join(', ')}.`;
  document.getElementById('tg-councils-link').href = D.councils_guide;
  TG.reveal('.tg .reveal');
})();
