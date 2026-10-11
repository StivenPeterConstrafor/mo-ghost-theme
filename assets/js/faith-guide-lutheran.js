/* The Lutheran shelf guide: Luther's seal with the shelf's writers, the journeys from Wittenberg, Luther's pen, the braid into the Book
   of Concord, the systems and Gerhard's loci, the explorer. */
(async () => {
  const {TG} = window, D = await TG.load('data'), LAND = await TG.load('land');
  const { esc, fmt, clamp, ease, lerp } = TG, G = TG.hasG && !TG.reduce ? window.gsap : null;
  const FAMS = D.fam.map((f) => f[0]), fc = (k) => TG.css(`--f${FAMS.indexOf(k) + 1}`), famName = (k) => (D.fam.find((f) => f[0] === k) || [])[1] || '';
  const NS = 'http://www.w3.org/2000/svg', mk = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  let explorer = null;

  /* ---------- hero: Luther's seal, with the shelf's writers as beads on its ring of gold ---------- */
  const facts = { works: D.n_works, authors: D.authors.length, pages: D.n_pages, wa: D.wa.vols + D.wa.tr };
  document.querySelectorAll('[data-count]').forEach((el) => TG.countUp(el, facts[el.dataset.count], 1.8));
  (function seal() {
    const svg = document.querySelector('.seal svg'), cap = document.querySelector('.seal .cap'), C = 300, R1 = 266, R2 = 292, RB = 279;
    const Y0 = 1480, Y1 = 1760, th = (y) => -Math.PI / 2 + 2 * Math.PI * (0.02 + 0.96 * (y - Y0) / (Y1 - Y0)), pt = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
    const defs = mk('defs', {}, svg);
    defs.innerHTML = `<radialGradient id="tg-sky" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#c7dbec"/><stop offset="1" stop-color="#86a9c9"/></radialGradient>
      <linearGradient id="tg-goldg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9b866"/><stop offset=".5" stop-color="#b98f3c"/><stop offset="1" stop-color="#d6b262"/></linearGradient>
      <radialGradient id="tg-heartg" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#c2493a"/><stop offset="1" stop-color="#8e2b20"/></radialGradient>`;
    // the ring of gold
    const band = mk('path', { d: `M${C - R2},${C} a${R2},${R2} 0 1,0 ${2 * R2},0 a${R2},${R2} 0 1,0 ${-2 * R2},0 Z M${C - R1},${C} a${R1},${R1} 0 1,1 ${2 * R1},0 a${R1},${R1} 0 1,1 ${-2 * R1},0 Z`, fill: 'url(#tg-goldg)', 'fill-rule': 'evenodd', opacity: G ? 0 : 1 }, svg);
    const rings = [mk('circle', { cx: C, cy: C, r: R2, fill: 'none', stroke: '#7d5f24', 'stroke-width': 1.6 }, svg), mk('circle', { cx: C, cy: C, r: R1, fill: 'none', stroke: '#7d5f24', 'stroke-width': 1.4 }, svg)];
    // the sky-blue field, with the years of the ring written round its edge
    const field = mk('g', {}, svg);
    mk('circle', { cx: C, cy: C, r: R1 - 2, fill: 'url(#tg-sky)' }, field);
    const ticks = mk('g', {}, field);
    for (let y = 1500; y <= 1750; y += 50) { const a = th(y), [x1, y1] = pt(R1 - 2, a), [x2, y2] = pt(R1 - 10, a), [tx, ty] = pt(R1 - 22, a);
      mk('line', { x1, y1, x2, y2, stroke: '#fff', 'stroke-width': 1.4, opacity: 0.85 }, ticks);
      const t = mk('text', { x: tx, y: ty + 4, 'text-anchor': 'middle', fill: '#fff', 'font-size': 11.5, 'font-family': TG.css('--body'), opacity: 0.95 }, ticks); t.textContent = y; }
    // the white rose: five petals round a center
    const rose = mk('g', {}, svg), RP = 74, RD = 106;
    const petals = [0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5, [px, py] = pt(RD, a), g = mk('g', {}, rose);
      mk('circle', { cx: px, cy: py, r: RP, class: 'petal' }, g);
      const a0 = a - 0.9, a1 = a + 0.9, [vx0, vy0] = [px + 54 * Math.cos(a0), py + 54 * Math.sin(a0)], [vx1, vy1] = [px + 54 * Math.cos(a1), py + 54 * Math.sin(a1)];
      mk('path', { class: 'vein', d: `M${vx0},${vy0} A54,54 0 0,1 ${vx1},${vy1}` }, g); return g; });
    const disk = mk('circle', { cx: C, cy: C, r: 104, class: 'petal' }, rose);
    // the red heart and the black cross
    const heartWrap = mk('g', {}, svg), heart = mk('g', { transform: `translate(${C},${C + 8}) scale(1.12)` }, heartWrap);
    const hp = mk('path', { d: 'M0,52 C-14,36 -78,12 -78,-34 C-78,-66 -48,-82 -26,-82 C-11,-82 0,-72 0,-58 C0,-72 11,-82 26,-82 C48,-82 78,-66 78,-34 C78,12 14,36 0,52 Z', fill: 'url(#tg-heartg)', stroke: '#2d2927', 'stroke-width': 1.6 }, heart);
    const crossV = mk('rect', { x: -8, y: -70, width: 16, height: 98, rx: 1, fill: '#2d2927' }, heart), crossH = mk('rect', { x: -33, y: -48, width: 66, height: 16, rx: 1, fill: '#2d2927' }, heart);
    // the writers, as beads on the ring at the year of their birth; where they crowd, they stack outward
    const A = D.authors.filter((a) => a.y0 && a.y0 >= Y0 && a.y0 <= Y1 && a.f !== 'modern' && !/theologians/i.test(a.n)).sort((a, b) => a.y0 - b.y0);
    const maxP = Math.max(...A.map((a) => a.p)), placed = [];
    const beads = A.map((a) => { const r = 3.4 + 6.6 * Math.sqrt(a.p / maxP), ang = th(a.y0); let lvl = 0;
      const clash = (L) => placed.some((q) => q.lvl === L && Math.abs(q.ang - ang) * (RB + L * 15) < q.r + r + 1.5);
      while (clash(lvl)) lvl++;
      const [x, y] = pt(RB + lvl * 15, ang), g = mk('g', { class: 'bead', tabindex: 0, role: 'button', 'aria-label': `${a.n}, ${TG.yr(a)}` }, svg);
      mk('circle', { cx: x, cy: y, r, fill: fc(a.f) }, g); const b = { a, g, r, ang, lvl }; placed.push(b); return b; });
    const say = (a) => { cap.textContent = a ? `${a.n}, ${a.d || TG.yr(a)} · ${a.w.length} ${a.w.length === 1 ? 'work' : 'works'}, ${fmt(a.p)} pages · ${famName(a.f)}`
      : 'Luther explained his seal in 1530. A black cross sits in a red heart. The heart is set in a white rose on a sky-blue field in a ring of gold. Every writer on the shelf sits on the ring at the year of his birth.'; };
    beads.forEach(({ a, g }) => { g.addEventListener('mouseenter', () => say(a)); g.addEventListener('focus', () => say(a)); g.addEventListener('mouseleave', () => say(null));
      g.addEventListener('click', () => explorer && explorer.show(a.n)); g.addEventListener('keydown', (e) => { if (e.key === 'Enter') explorer && explorer.show(a.n); }); });
    say(null);
    if (!G) return;
    const draw = (el) => { const L = el.getTotalLength(); el.style.strokeDasharray = L; el.style.strokeDashoffset = L; return el; };
    const tl = gsap.timeline({ delay: 0.25 });
    tl.to(rings.map(draw), { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', stagger: 0.15 })
      .to(band, { opacity: 1, duration: 0.7 }, 0.8)
      .from(field, { scale: 0, svgOrigin: `${C} ${C}`, duration: 1.0, ease: 'power3.out' }, 1.0)
      .from(ticks.children, { opacity: 0, duration: 0.4, stagger: 0.05 }, 1.6)
      .from(petals, { scale: 0, rotation: -40, svgOrigin: `${C} ${C}`, duration: 0.9, ease: 'back.out(1.4)', stagger: 0.11 }, 1.5)
      .from(disk, { scale: 0, svgOrigin: `${C} ${C}`, duration: 0.6, ease: 'power3.out' }, 1.75)
      .from(hp, { scale: 0, transformOrigin: '50% 55%', duration: 0.8, ease: 'back.out(1.8)' }, 2.3)
      .from(crossV, { scaleY: 0, transformOrigin: '50% 100%', duration: 0.45, ease: 'power3.out' }, 2.8)
      .from(crossH, { scaleX: 0, transformOrigin: '50% 50%', duration: 0.4, ease: 'power3.out' }, 3.05)
      .to(heartWrap, { scale: 1.05, duration: 0.16, yoyo: true, repeat: 3, ease: 'sine.inOut', svgOrigin: `${C} ${C + 8}` }, 3.5);
    // the beads come in order of birth, each one named as it lands
    beads.forEach((b, i) => { const t = 0.9 + i * 0.075; tl.fromTo(b.g, { scale: 0, transformOrigin: '50% 50%', opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)', transformOrigin: '50% 50%' }, t);
      tl.call(() => { cap.textContent = `${b.a.y0} · ${b.a.n}`; }, null, t); });
    tl.call(() => say(null), null, '+=0.4');
  })();

  /* ---------- 1. from Wittenberg: the universities and the theologians' journeys ---------- */
  (function road() {
    const box = document.getElementById('tg-map'), M = TG.map(box, LAND, [[3.6, 44.7], [21.4, 56.1]], { parallels: [46, 56] });
    const cv = TG.canvas(box.querySelector('canvas')), {ctx} = cv, P = D.places, YA = 1483, YB = 1750;
    const SCH = new Set(D.schools.map((x) => x[0]));
    const J = D.journeys.map((j) => { const pts = j.s.map(([p, y]) => ({ p, y, ll: P[p] })), born = pts.length > 2 && !SCH.has(pts[0].p);
      return { ...j, pts, from: born ? pts[1].y - 4 : pts[0].y }; });
    const schools = D.schools.map(([p, y, what]) => ({ p, y, what, ll: P[p] }));
    const LBL = { Leipzig: [7, 12, 'left'], Halle: [-7, -6, 'right'], Jena: [7, 13, 'left'], Wittenberg: [8, -7, 'left'], Helmstedt: [-7, -6, 'right'], Giessen: [-7, 12, 'right'], Marburg: [-7, -6, 'right'], Strasbourg: [-7, -6, 'right'], Tübingen: [7, 12, 'left'], Altdorf: [7, 12, 'left'], Königsberg: [-7, -7, 'right'] };
    const chron = TG.chronicle(document.getElementById('tg-chron'), D.events, ([y, e, w]) => `<li><span class="d">${y}</span><span class="e">${esc(e)}</span><span class="w">${esc(w)}</span></li>`);
    document.getElementById('tg-legend').innerHTML = `${D.fam.filter(([k]) => J.some((j) => j.f === k)).map(([k, n]) => `<span><i style="background:${fc(k)}"></i>${esc(n)}</span>`).join('')}<span><i style="background:transparent;border:1.5px solid var(--ink);border-radius:1px"></i>a Lutheran university from the year it opened or turned Lutheran</span>`;
    const ribbon = document.getElementById('tg-ribbon');
    let year = YA, lastRibbon = '';
    const curve = (a, b, t) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], k = 0.18, cx = mx - dy * k, cy = my + dx * k, u = 1 - t;
      return [u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]; };
    function at(j, Y) {
      if (Y < j.from) return null;
      const pts = j.pts.map((s) => ({ ...s, xy: M.xy(s.ll) })), trail = [pts[0].xy]; let pos = pts[0].xy, moving = false;
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1];
        if (Y >= b.y) { if (a.p !== b.p) for (let s = 1; s <= 16; s++) trail.push(curve(a.xy, b.xy, s / 16)); pos = b.xy; continue; }
        if (Y > a.y && a.p !== b.p) { const span = Math.max(1, b.y - a.y), travel = Math.min(span, 2.5), t = clamp((Y - (b.y - travel)) / travel, 0, 1), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2)**2 / 2;
          for (let s = 1; s <= 16 * e; s++) trail.push(curve(a.xy, b.xy, s / 16)); pos = curve(a.xy, b.xy, e); moving = t > 0 && t < 1; }
        break; }
      return { pos, trail, alive: Y <= pts[pts.length - 1].y + 0.5, moving };
    }
    function render(Y) {
      year = Y; ctx.clearRect(0, 0, cv.W, cv.H); const ink = TG.css('--ink');
      ctx.font = `italic 12.5px ${TG.css('--display')}`;
      for (const s of schools) { if (s.y > Y) continue; const [x, y] = M.xy(s.ll), pop = clamp((Y - s.y) / 6, 0, 1), sz = 5 + 2 * (1 - pop);
        ctx.globalAlpha = 0.3 + 0.6 * pop; ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.strokeRect(x - sz / 2, y - sz / 2, sz, sz);
        const [dx, dy, al] = LBL[s.p] || [7, -6, 'left']; ctx.textAlign = al; ctx.fillStyle = ink; ctx.globalAlpha = 0.78 * pop; ctx.fillText(s.p, x + dx, y + dy); ctx.textAlign = 'left'; }
      ctx.globalAlpha = 1; const live = [], boxes = [];
      for (const j of J) { const r = at(j, Y); if (!r) continue; const c = fc(j.f);
        ctx.strokeStyle = c; ctx.lineWidth = r.alive ? 1.9 : 1.1; ctx.globalAlpha = r.alive ? 0.6 : 0.18; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); r.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        if (r.alive) live.push({ j, r, c }); else { ctx.globalAlpha = 0.4; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(r.pos[0], r.pos[1], 1.9, 0, 6.283); ctx.fill(); } }
      for (const { r, c } of live) { const [x, y] = r.pos; ctx.globalAlpha = 0.2; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r.moving ? 10 : 7, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, 4.3, 0, 6.283); ctx.fill(); ctx.strokeStyle = TG.css('--card'); ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.font = `600 11.5px ${TG.css('--body')}`;
      for (const { j, r, c } of live.sort((a, b) => a.r.pos[1] - b.r.pos[1])) { const [x, y] = r.pos, w = ctx.measureText(j.a).width;
        let lx = x + 8, ly = y + 4; const hit = (bx, by) => boxes.some((b) => bx < b[0] + b[2] && bx + w > b[0] && by - 10 < b[1] + 4 && by + 2 > b[1] - 10);
        if (hit(lx, ly)) lx = x - 8 - w; if (hit(lx, ly)) { lx = x + 8; ly = y + 16; } if (hit(lx, ly)) { lx = x - 8 - w; ly = y + 16; } if (hit(lx, ly)) continue;
        boxes.push([lx, ly, w]); ctx.fillStyle = TG.css('--land'); ctx.globalAlpha = 0.86; ctx.fillRect(lx - 2, ly - 11, w + 4, 14); ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.fillText(j.a, lx, ly); }
      ctx.globalAlpha = 1;
      document.getElementById('tg-year').textContent = Math.round(Y);
      document.getElementById('tg-yearbar').style.width = `${(Y - YA) / (YB - YA) * 100}%`;
      chron(Y);
      const names = live.map(({ j }) => j.a).join('|');
      if (names !== lastRibbon) { lastRibbon = names; ribbon.innerHTML = live.map(({ j, c }) => `<span><i style="background:${c}"></i>${esc(j.a)}</span>`).join('') || '<span class="small" style="border:0;background:none">Between journeys.</span>'; }
    }
    M.onfit = () => { cv.size(); render(year); };
    TG.chapter('#tg-road', 5000, (p) => render(lerp(YA, YB, p)), { scrub: 0.4 });
  })();

  /* ---------- 2. Luther's pen: every dated writing in the Weimar Edition, stacked by year ---------- */
  (function pen() {
    const box = document.getElementById('tg-penbox'), svg = box.querySelector('svg'), tip = box.querySelector('.tip');
    const W = 820, H = 470, L = 34, R = 8, BASE = 372, Y0 = 1512, Y1 = 1546, n = Y1 - Y0 + 1, cw = (W - L - R) / n, r = Math.min(4.4, cw * 0.21), pitch = r * 2.12;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const KIND = [['treat', 'treatises and open letters', '#2d2927'], ['sermon', 'sermons', '#2f4a6b'], ['expo', 'lectures and expositions', '#6d4c7d'], ['disp', 'disputations and theses', '#a3382a'], ['pref', 'prefaces', '#a07c35'], ['letter', 'letters', '#5b6b3a']];
    const kc = Object.fromEntries(KIND.map(([k, , c]) => [k, c]));
    const cnt = {}; D.pen.forEach((w) => { cnt[w[4]] = (cnt[w[4]] || 0) + 1; });
    document.getElementById('tg-penkey').innerHTML = KIND.map(([k, n2, c]) => `<span><i style="background:${c};border-radius:50%"></i>${esc(n2)} · ${cnt[k] || 0}</span>`).join('');
    const x = (y) => L + (y - Y0 + 0.5) * cw;
    // axis and the life band
    const ax = mk('g', {}, svg);
    mk('line', { x1: L, x2: W - R, y1: BASE + 6, y2: BASE + 6, stroke: TG.css('--ink'), 'stroke-width': 1 }, ax);
    for (let y = 1515; y <= 1545; y += 5) { mk('line', { x1: x(y), x2: x(y), y1: BASE + 6, y2: BASE + 11, stroke: TG.css('--ink') }, ax); mk('text', { x: x(y), y: BASE + 24, 'text-anchor': 'middle', class: 'ax' }, ax).textContent = y; }
    const lifeG = mk('g', {}, svg), lifeTxt = mk('text', { x: L, y: H - 14, class: 'life' }, svg);
    mk('line', { x1: x(1512), x2: x(1546), y1: BASE + 44, y2: BASE + 44, stroke: TG.css('--rule'), 'stroke-width': 3, 'stroke-linecap': 'round' }, lifeG);
    const lifeMarks = D.life.map(([y]) => mk('path', { d: `M${x(y)},${BASE + 38} l6,6 l-6,6 l-6,-6 Z`, fill: TG.css('--rubric'), opacity: 0.25 }, lifeG));
    const yearT = mk('text', { x: L + 4, y: 40, 'font-size': 44, 'font-family': TG.css('--display'), fill: TG.css('--ink'), class: 'num' }, svg);
    const cntT = mk('text', { x: L + 6, y: 62, 'font-size': 12, 'font-family': TG.css('--body'), fill: TG.css('--muted') }, svg);
    // the dots, in the order the edition prints them within each year
    const byY = {}; D.pen.forEach((w) => { (byY[w[0]] ||= []).push(w); });
    const dots = [], lmKey = new Set(D.landmarks.map((l) => `${l[2]}#${l[3]}`));
    for (const y in byY) byY[y].forEach((w, i) => { const a = mk('a', { href: TG.read(w[2], w[3]), target: '_blank', rel: 'noopener', class: 'dot' }, svg);
      const cy = BASE - r - i * pitch, c = mk('circle', { cx: x(+y), cy, r, fill: kc[w[4]] }, a);
      a.setAttribute('aria-label', `${w[1]}, ${w[0]}`); dots.push({ w, a, c, i, n: byY[y].length, cy, lm: lmKey.has(`${w[2]}#${w[3]}`) }); });
    const lmG = mk('g', {}, svg), lms = D.landmarks.map((l, k) => { const d = dots.find((q) => q.w[2] === l[2] && q.w[3] === l[3]); if (!d) return null;
      const g = mk('g', { opacity: 0 }, lmG); mk('circle', { cx: x(d.w[0]), cy: d.cy, r: r + 3.2, class: 'lm' }, g); return { l, d, g, k }; }).filter(Boolean);
    const wa = (slug) => slug.replace('luther-wa-schriften-', '').split('-').map((t) => (/^i+$/.test(t) ? t.toUpperCase() : t === 'rev' ? 'rev.' : t)).join(' ');
    const call = mk('g', { opacity: 0 }, svg), callLine = mk('line', { stroke: TG.css('--rubric'), 'stroke-width': 1 }, call), callBg = mk('rect', { fill: TG.css('--paper'), opacity: 0.92, rx: 2 }, call),
      callT = mk('text', { 'font-size': 14, 'font-family': TG.css('--display'), fill: TG.css('--rubric') }, call);
    let callK = -1;
    const marks = document.getElementById('tg-marks');
    marks.innerHTML = D.landmarks.map((l) => `<li><b>${l[0]}</b><a href="${TG.read(l[2], l[3])}" target="_blank" rel="noopener">${esc(l[1])}</a><i>WA ${esc(wa(l[2]))}</i></li>`).join('');
    const mlis = [...marks.children];
    dots.forEach((d) => { d.a.addEventListener('mousemove', (e) => { const b = box.getBoundingClientRect(); tip.innerHTML = `${esc(d.w[1])}<small>${d.w[0]} · WA ${esc(wa(d.w[2]))} p. ${d.w[3]} · click to read</small>`; tip.hidden = false;
      tip.style.left = `${Math.min(e.clientX - b.left + 12, b.width - 250)}px`; tip.style.top = `${e.clientY - b.top + 14}px`; }); d.a.addEventListener('mouseleave', () => { tip.hidden = true; }); });
    const total = D.pen.length, penN = document.getElementById('tg-pen-n'); penN.textContent = fmt(total);
    function render(p) {
      const Y = lerp(Y0 - 0.5, Y1 + 1, p); let shown = 0;
      for (const d of dots) { const t = clamp((Y - d.w[0]) * d.n - d.i, 0, 1), e = t >= 1 ? 1 : 1 - (1 - t)**3;
        d.c.setAttribute('cy', (d.cy - (1 - e) * 60).toFixed(1)); d.c.setAttribute('opacity', e.toFixed(2)); if (t > 0.5) shown++; }
      lms.forEach(({ d, g }) => { g.setAttribute('opacity', clamp((Y - d.w[0]) * d.n - d.i, 0, 1).toFixed(2)); });
      let now = -1; D.landmarks.forEach((l, i) => { if (l[0] <= Y - 0.15) now = i; });
      mlis.forEach((li, i) => { li.classList.toggle('now', i === now); li.classList.toggle('past', i < now); });
      if (now >= 0 && TG.pinOK()) marks.scrollTop = Math.max(0, mlis[now].offsetTop - marks.clientHeight * 0.4);
      const lmNow = lms.filter((q) => q.l[0] <= Y - 0.15).pop();
      if (lmNow && lmNow.k !== callK) { callK = lmNow.k; const cx = x(lmNow.d.w[0]), {cy} = lmNow.d, right = cx < W * 0.62, ty = Math.max(84, cy - 40);
        callT.textContent = lmNow.l[1]; callT.setAttribute('text-anchor', right ? 'start' : 'end'); callT.setAttribute('x', cx + (right ? 14 : -14)); callT.setAttribute('y', ty);
        const bb = callT.getBBox(); Object.entries({ x: bb.x - 4, y: bb.y - 2, width: bb.width + 8, height: bb.height + 4 }).forEach(([k, v]) => callBg.setAttribute(k, v));
        Object.entries({ x1: cx, y1: cy - r - 3, x2: cx + (right ? 10 : -10), y2: ty - 4 }).forEach(([k, v]) => callLine.setAttribute(k, v));
        if (G) gsap.fromTo(call, { opacity: 0 }, { opacity: 1, duration: 0.35 }); else call.setAttribute('opacity', 1); }
      if (!lmNow && callK !== -1) { callK = -1; call.setAttribute('opacity', 0); }
      yearT.textContent = Math.min(Y1, Math.max(Y0, Math.floor(Y))); cntT.textContent = `${fmt(shown)} writings`;
      let li2 = -1; D.life.forEach(([y], i) => { if (y <= Y) li2 = i; });
      lifeMarks.forEach((m, i) => m.setAttribute('opacity', i <= li2 ? 1 : 0.25));
      lifeTxt.textContent = li2 >= 0 ? `${D.life[li2][0]} · ${D.life[li2][1]}` : 'Professor of Scripture at Wittenberg since 1512';
    }
    TG.chapter('#tg-pen', 3800, render, { scrub: 0.5 });
    if (!TG.pinOK()) mlis.forEach((li) => li.classList.add('past'));
  })();

  /* ---------- 3. into the Book of Concord: the controversies after Luther braided into the twelve articles ---------- */
  (function concord() {
    const host = document.getElementById('tg-braid'), svg = host.querySelector('svg'), tip = host.querySelector('.tip'), note = document.getElementById('tg-bnote');
    const XA = 70, XB = 690, YA = 1546, YB = 1577, x = (y) => XA + (y - YA) / (YB - YA) * (XB - XA), KX = 712, BX = 918;
    const COL = ['#a3382a', '#2f4a6b', '#a07c35', '#5b6b3a', '#6d4c7d', '#2e6e6a', '#7a4a2e', '#4f86b0'];
    // the documents of Luther's lifetime, along the top
    const docs = mk('g', {}, svg), dw = 92, dgap = (XB + 150 - 30 - dw * D.docs.length) / (D.docs.length - 1);
    const docEls = D.docs.map(([y, n, sub, slug, pg], i) => { const gx = 30 + i * (dw + dgap), g = mk(slug ? 'a' : 'g', slug ? { href: TG.read(slug, pg), target: '_blank', rel: 'noopener' } : {}, docs);
      g.setAttribute('class', 'doc'); mk('rect', { x: gx, y: 22, width: dw, height: 50, rx: 2 }, g);
      mk('text', { x: gx + 7, y: 37, class: 'y' }, g).textContent = y < 1000 ? '325–c. 500' : y;
      const words = n.split(' '), lines = []; let cur = ''; words.forEach((w) => { if ((`${cur} ${w}`).trim().length > 13) { lines.push(cur.trim()); cur = w; } else cur += ` ${w}`; }); lines.push(cur.trim());
      lines.slice(0, 2).forEach((ln, k) => { mk('text', { x: gx + 7, y: 51 + k * 13 }, g).textContent = ln + (k === 1 && lines.length > 2 ? '…' : ''); });
      const t = mk('title', {}, g); t.textContent = `${n}, ${y < 1000 ? 'the ancient creeds' : y}: ${sub}`; return { g, cx: gx + dw / 2 }; });
    // axis, and Luther's death
    const ax = mk('g', {}, svg);
    mk('line', { x1: XA, x2: XB, y1: 500, y2: 500, stroke: TG.css('--ink'), 'stroke-width': 1 }, ax);
    for (let y = 1550; y <= 1575; y += 5) { mk('line', { x1: x(y), x2: x(y), y1: 500, y2: 505, stroke: TG.css('--ink') }, ax); mk('text', { x: x(y), y: 518, 'text-anchor': 'middle', class: 'ax' }, ax).textContent = y; }
    const death = mk('g', {}, svg); mk('line', { x1: XA, x2: XA, y1: 92, y2: 505, class: 'death' }, death);
    mk('text', { x: XA + 5, y: 104, class: 'tsub' }, death).textContent = '1546: Luther dies';
    // the twelve articles, as knots in a column
    const ky = (k) => 112 + k * 32.5, knots = mk('g', {}, svg);
    const knotEls = D.articles.map((A, k) => { const g = mk('g', { class: 'knot', opacity: 0 }, knots), a = mk('a', A.p ? { href: TG.read(D.hutter, A.p), target: '_blank', rel: 'noopener' } : {}, g);
      mk('circle', { cx: KX, cy: ky(k), r: 12 }, a); const rt = mk('text', { x: KX, y: ky(k) + 4, 'text-anchor': 'middle', class: 'r', 'font-size': A.r.length >= 4 ? 8.6 : A.r.length === 3 ? 10 : 12.5 }, a); rt.textContent = A.r;
      const nt = mk('text', { x: KX + 19, y: ky(k) + 4 }, a); nt.textContent = A.n; g.dataset.end = KX + 19 + nt.getComputedTextLength();
      const t = mk('title', {}, a); t.textContent = `Article ${A.r}: ${A.n}${A.p ? ` · Hutter’s commentary on it, page ${A.p}` : ''}`; return g; });
    // the controversies: a thread each from its first year, running into its article or articles
    const rowY = (i) => 150 + i * 42, threads = [];
    D.contro.forEach(([y, name, sides, arts, shown], i) => { const g = mk('g', { opacity: 0 }, svg), x0 = x(y), y0 = rowY(i), c = COL[i % COL.length];
      const paths = arts.map((k) => { const tx = KX - 13, ty = ky(k - 1), xm = 560 + (k % 3) * 10;
        return mk('path', { class: 'thread', d: `M${x0},${y0} L${xm},${y0} C${xm + 70},${y0} ${tx - 70},${ty} ${tx},${ty}`, stroke: c }, g); });
      mk('circle', { cx: x0, cy: y0, r: 4, fill: c }, g);
      const lab = mk('text', { x: x0 + 2, y: y0 - 8, class: 'tlab' }, g); lab.textContent = `${shown || y}  ${name}`;
      const sub = mk('text', { x: x0 + 2, y: y0 + 16, class: 'tsub' }, g); sub.textContent = sides;
      paths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.dataset.len = L; });
      const hov = mk('rect', { x: x0 - 4, y: y0 - 24, width: 470, height: 46, fill: 'transparent' }, g);
      hov.addEventListener('mousemove', (e) => { const b = host.getBoundingClientRect(); tip.innerHTML = `${esc(name)} from ${esc(shown || y)}<small>${esc(sides)} · settled in article ${arts.map((k) => D.articles[k - 1].r).join(' and ')} of the Formula</small>`; tip.hidden = false;
        tip.style.left = `${Math.min(e.clientX - b.left + 12, b.width - 260)}px`; tip.style.top = `${e.clientY - b.top + 14}px`; });
      hov.addEventListener('mouseleave', () => { tip.hidden = true; });
      threads.push({ y, g, paths, arts }); });
    // the road to agreement, under the axis
    const steps = mk('g', {}, svg), stepEls = D.steps.slice(0, 3).map(([y, n, who], i) => { const g = mk('g', { class: 'step', opacity: 0 }, steps);
      mk('path', { d: `M${x(y)},${494} l5,6 l-5,6 l-5,-6 Z`, fill: TG.css('--rubric') }, g);
      mk('line', { x1: x(y), x2: x(y), y1: 506, y2: 536 + i * 15, stroke: TG.css('--rubric'), 'stroke-width': 0.8, opacity: 0.6 }, g);
      mk('text', { x: x(y) - 5, y: 540 + i * 15, 'text-anchor': 'end' }, g).textContent = `${y} ${n}`; return g; });
    // the Book of Concord: a binding on the right that takes in the documents and the twelve articles
    const book = mk('g', { class: 'book', opacity: 0 }, svg);
    const bind = mk('g', {}, svg);
    const bindPaths = [...docEls.map((d) => `M${d.cx},72 C${d.cx},92 ${BX - 40},84 ${BX + 4},100`), ...D.articles.map((_, k) => { const x0 = +knotEls[k].dataset.end + 8; return `M${x0},${ky(k)} C${(x0 + BX) / 2},${ky(k)} ${BX - 8},${ky(k)} ${BX},${ky(k)}`; })]
      .map((d) => { const p = mk('path', { d, class: 'bind' }, bind); const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.dataset.len = L; return p; });
    mk('rect', { x: BX, y: 92, width: 54, height: 412, rx: 3, class: 'cover' }, book);
    [104, 116, 480, 492].forEach((yy) => mk('line', { x1: BX + 5, x2: BX + 49, y1: yy, y2: yy, stroke: '#c9a24e', 'stroke-width': 1.2 }, book));
    const bt = mk('text', { x: BX + 33, y: 298, 'text-anchor': 'middle', transform: `rotate(-90 ${BX + 33} 298)` }, book); bt.textContent = 'CONCORDIA · 1580';
    const NOTES = [
      [0.0, 'In 1580 the Lutheran churches bound their confessions into one book. Its first part was written while Luther lived. It holds the catechisms of 1529, the Augsburg Confession with its Apology and the Smalcald Articles.'],
      [0.16, 'Luther died in February 1546. Within two years the emperor’s Interim had divided his followers. One controversy followed another.'],
      [0.66, 'The Formula of Concord of 1577 settled them article by article. Article XI on election answered no open quarrel among Lutherans but prevented one. Article XII names the sects outside.'],
      [0.86, 'The Book of Concord was published at Dresden on 25 June 1580. That was fifty years to the day after the Augsburg Confession was read. Each article opens Leonhard Hutter’s commentary on it.']];
    function render(p) {
      const n = NOTES.filter(([t]) => p >= t).pop(); if (note.dataset.k !== String(n[0])) { note.dataset.k = n[0]; note.textContent = n[1]; if (G) gsap.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.5 }); }
      docEls.forEach((d, i) => d.g.setAttribute('opacity', clamp(p * 40 - i * 0.7, 0, 1).toFixed(2)));
      death.setAttribute('opacity', clamp((p - 0.12) * 12, 0, 1).toFixed(2));
      const Y = lerp(YA, YB, clamp((p - 0.16) / 0.48, 0, 1));
      threads.forEach((t) => { const v = clamp((Y - t.y) / 1.2, 0, 1); t.g.setAttribute('opacity', v.toFixed(2));
        const f = clamp((Y - t.y) / (YB - t.y), 0, 1); t.paths.forEach((q) => { q.style.strokeDashoffset = (q.dataset.len * (1 - f)).toFixed(1); }); });
      stepEls.forEach((g, i) => g.setAttribute('opacity', Y >= D.steps[i][0] - 0.2 ? 1 : 0));
      knotEls.forEach((g, k) => { const hasThread = threads.some((t) => t.arts.includes(k + 1)), v = clamp((p - 0.6 - (hasThread ? 0 : 0.06) - k * 0.006) * 14, 0, 1);
        g.setAttribute('opacity', v.toFixed(2)); });
      const b = clamp((p - 0.84) / 0.12, 0, 1);
      bindPaths.forEach((q, i) => { q.style.strokeDashoffset = (q.dataset.len * (1 - clamp(b * 1.6 - i * 0.03, 0, 1))).toFixed(1); });
      book.setAttribute('opacity', clamp((p - 0.9) * 14, 0, 1).toFixed(2));
    }
    TG.chapter('#tg-concord', 4200, render, { scrub: 0.5 });
  })();

  /* ---------- 4. a shelf of systems, and Gerhard's nine tomes opened into their loci ---------- */
  (function systems() {
    const box = document.getElementById('tg-sysbox'), say = document.getElementById('tg-sys-say'), S = D.systems;
    const LEATHER = ['#5c3a2a', '#6b3d2a', '#4c3125', '#7b5135', '#3e2b22'];
    const famOf = Object.fromEntries(D.authors.map((a) => [a.n.split(' ').pop(), a.f]));
    const spines = [], labs = [];
    S.forEach((s, si) => s.v.forEach(([slug, pages], vi) => { const a = document.createElement('a'); a.className = 'spine'; a.href = TG.read(slug); a.target = '_blank'; a.rel = 'noopener';
      a.title = `${s.a}, ${s.t}${s.v.length > 1 ? `, volume ${vi + 1}` : ''}, ${fmt(pages)} pages`; a.setAttribute('aria-label', a.title);
      const g = s.a === 'Gerhard'; a.style.background = g ? '#7a2f22' : LEATHER[(si + vi) % LEATHER.length];
      if (g) a.innerHTML = `<span class="rn">${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][vi]}</span>`;
      box.appendChild(a); spines.push({ a, s, si, vi, pages, g }); }));
    const floor = document.createElement('div'); floor.className = 'floor'; box.appendChild(floor);
    S.forEach((s) => { const d = document.createElement('div'); d.className = 'lab'; d.innerHTML = `<b>${s.y}</b>${esc(s.a)}`; box.appendChild(d); labs.push(d); });
    // the nine columns of loci
    const tomes = [1, 2, 3, 4, 5, 6, 7, 8, 9], ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'], gerhard = S.find((s) => s.a === 'Gerhard');
    const cols = tomes.map((t) => { const c = document.createElement('div'); c.className = 'col'; c.innerHTML = `<h4>${ROM[t - 1]}</h4>`;
      const L = D.loci.filter((l) => l.t === t), sum = L.reduce((u, l) => u + l.n, 0);
      const bands = L.map((l) => { const a = document.createElement('a'); a.className = 'locus'; a.href = TG.read(gerhard.v[t - 1][0], l.p); a.target = '_blank'; a.rel = 'noopener';
        a.title = `${l.en} (${l.la}) · tome ${ROM[t - 1]} from page ${l.p}`; a.innerHTML = `<b>${esc(l.en)}</b><i>${esc(l.la)}</i>`; a.dataset.f = l.n / sum; c.appendChild(a); return a; });
      box.appendChild(c); return { c, bands }; });
    let W = 0, H = 0, A = [], B = [];
    function layout() {
      W = box.clientWidth; H = box.clientHeight; const floorY = H * 0.74, n = spines.length, gap = 16, sw = Math.max(8, Math.min(24, (W - gap * (S.length - 1)) / n - 2));
      const maxP = Math.max(...spines.map((s) => s.pages)); let xx = (W - (n * (sw + 2) + gap * (S.length - 1))) / 2; let last = -1;
      A = spines.map((s) => { if (last !== -1 && s.si !== last) xx += gap; last = s.si; const h = 40 + (floorY - 60) * Math.sqrt(s.pages / maxP), r = { x: xx, y: floorY - h, w: sw, h }; xx += sw + 2; return r; });
      floor.style.top = `${floorY}px`;
      S.forEach((s, si) => { const R = A.filter((_, i) => spines[i].si === si), cx = (R[0].x + R[R.length - 1].x + R[R.length - 1].w) / 2; labs[si].style.left = `${cx}px`; labs[si].style.top = `${floorY + 12 + (si % 2) * 30}px`; });
      const cw = W / 9; let gi = 0;
      B = spines.map((s) => s.g ? { x: (gi++) * cw + 3, y: 30, w: cw - 6, h: H - 32 } : null);
      cols.forEach(({ c, bands }, i) => { Object.assign(c.style, { left: `${i * cw + 3}px`, top: '4px', width: `${cw - 6}px`, height: `${H - 6}px` });
        const avail = H - 6 - 30 - bands.length * 2; bands.forEach((b) => { const h = Math.max(4, avail * +b.dataset.f), lines = Math.floor((h - 7) / 14.2), bl = Math.min(3, lines), il = Math.min(2, Math.floor((h - 7 - bl * 14.2) / 11.5));
          b.style.height = `${h}px`; const B2 = b.querySelector('b'), I2 = b.querySelector('i'); B2.style.display = bl >= 1 ? '' : 'none'; B2.style.webkitLineClamp = String(Math.max(1, bl)); I2.style.display = il >= 1 ? '' : 'none'; I2.style.webkitLineClamp = String(Math.max(1, il)); }); });
    }
    const SAY = [
      `<p>Twelve systems of Lutheran doctrine stand on this shelf from Melanchthon’s <i>Body of Christian Doctrine</i> (1560) to Buddeus’s <i>Institutes</i> (1723). Each spine is a volume. Its height shows its pages. Open any of them.</p>`,
      `<p class="now">Johann Gerhard’s <i>Theological Commonplaces</i> appeared at Jena in 1610–1622. Its nine tomes are the classic of Lutheran orthodoxy.</p>`,
      `<p>The nine tomes hold thirty-five loci in the order of the faith. Holy Scripture comes first because every other doctrine is proved from it. Then come God, creation and sin, law and Gospel and justification, the sacraments, the Church and its orders, and the last things.</p><p class="small">Each band is as long as its locus. Choose one to read it.</p>`];
    let sayK = -1;
    function render(p) {
      if (!W) layout();
      const u = ease(clamp((p - 0.2) / 0.18, 0, 1)), v = clamp((p - 0.42) / 0.5, 0, 1);
      spines.forEach((s, i) => { const a = A[i], b = B[i];
        if (s.g) { const r = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), w: lerp(a.w, b.w, u), h: lerp(a.h, b.h, u) };
          Object.assign(s.a.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, opacity: String(1 - 0.86 * clamp(v * 9 - s.vi, 0, 1)) });
          const rn = s.a.querySelector('.rn'); if (rn) rn.style.opacity = String(u * (1 - clamp(v * 9 - s.vi, 0, 1))); }
        else Object.assign(s.a.style, { left: `${a.x}px`, top: `${a.y + 40 * u}px`, width: `${a.w}px`, height: `${a.h}px`, opacity: String(1 - u), pointerEvents: u > 0.5 ? 'none' : '' }); });
      floor.style.opacity = String(1 - u); labs.forEach((l) => { l.style.opacity = String(1 - u); });
      cols.forEach(({ c, bands }, t) => { const k = clamp(v * 9 - t, 0, 1); c.style.opacity = k > 0 ? 1 : 0;
        bands.forEach((b, j) => { const g = ease(clamp(k * (bands.length + 1) - j, 0, 1)); b.style.transform = `scaleY(${g.toFixed(3)})`; b.style.opacity = g.toFixed(2); }); c.querySelector('h4').style.opacity = k; });
      const sk = p < 0.2 ? 0 : p < 0.42 ? 1 : 2; if (sk !== sayK) { sayK = sk; say.innerHTML = SAY[sk]; if (G) gsap.fromTo(say, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45 }); }
    }
    new ResizeObserver(() => { layout(); }).observe(box);
    TG.chapter('#tg-sys', 3600, render, { scrub: 0.5 });
    // phones: the loci as a list under each tome
    document.getElementById('tg-locilist').innerHTML = `<ol style="margin-bottom:18px">${S.map((s) => `<li><b>${s.y} · ${esc(s.a)}</b><span><a href="${TG.read(s.v[0][0])}" target="_blank" rel="noopener">${esc(s.t)}${s.v.length > 1 ? `, ${s.v.length} vols.` : ''}</a></span></li>`).join('')}</ol><p class="say">Gerhard’s <i>Theological Commonplaces</i> appeared at Jena in 1610–1622. Its nine tomes hold thirty-five loci from Holy Scripture to eternal life.</p><ol>${tomes.map((t) => `<li><b>Tome ${ROM[t - 1]}</b><span>${D.loci.filter((l) => l.t === t).map((l) => `<a href="${TG.read(gerhard.v[t - 1][0], l.p)}" target="_blank" rel="noopener">${esc(l.en)}</a>`).join('')}</span></li>`).join('')}</ol>`;
    if (!TG.pinOK()) { say.innerHTML = `<p>Twelve systems of Lutheran doctrine stand on this shelf from Melanchthon’s <i>Body of Christian Doctrine</i> (1560) to Buddeus’s <i>Institutes</i> (1723). The classic is Johann Gerhard’s in nine tomes and thirty-five loci. The loci follow the order of the faith. Holy Scripture comes first because every other doctrine is proved from it. Then come God, creation and sin, law and Gospel and justification, the sacraments, the Church and its orders, and the last things.</p>`; }
  })();

  /* ---------- explore ---------- */
  const DX = { ...D, fam: D.fam.filter(([k]) => k !== 'modern'), authors: D.authors.map((a) => (a.f === 'modern' ? { ...a, y0: null } : a)) };
  explorer = TG.explorer(document.getElementById('tg-explorer'), DX, { range: [1480, 1760], first: 'Martin Luther', placeholder: 'Gerhard, Concord, Galatians…', label: 'Lifelines of the writers on the Lutheran shelf' });
})();
