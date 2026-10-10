/* The guides index: a century ruler over every shelf; the tiles show what each shelf holds in the chosen century. */
(async () => {
  const {TG} = window, D = await TG.load('data');
  const { esc, fmt } = TG, G = TG.hasG && !TG.reduce ? window.gsap : null, LK = D.links || {};
  const ORD = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
  const WORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
  const SH = [
    { k: 'councils', c: '--rubric', name: 'The Councils', eyebrow: `Mansi · ${D.councils.vols} volumes`, desc: 'Every council and synod from the apostles at Jerusalem to the First Vatican Council and the Eastern synods after it.', unit: ['council', 'councils'] },
    { k: 'greek', c: '--gilt', name: 'The Greek Fathers', eyebrow: `Patrologia Graeca · ${D.greek.vols} volumes`, desc: 'The Greek Fathers and the Byzantine writers after them, Greek with Latin beside it.', unit: ['writer', 'writers'] },
    { k: 'latin', c: '--ink-2', name: 'The Latin Fathers', eyebrow: `Patrologia Latina · ${D.latin.vols} volumes`, desc: 'The Latin Fathers and the medieval writers after them, Tertullian to Innocent III.', unit: ['writer', 'writers'] },
    { k: 'medieval', c: '--f1', name: 'The Medieval shelf', eyebrow: `${D.medieval.works} works`, desc: 'The schools: the Sentences and the summas, Aristotle in the friars’ hands, and the canon law of Bologna.', unit: ['writer', 'writers'] },
    { k: 'catholic', c: '--f5', name: 'Roman Catholic', eyebrow: `${D.catholic.works} works`, desc: 'Trent and the schools after it: Thomists, Scotists and Jesuits, the controversialists and the historians.', unit: ['writer', 'writers'] },
    { k: 'reformed', c: '--f4', name: 'Continental Reformed', eyebrow: `${D.reformed.works} works`, desc: 'Zurich and Geneva, Heidelberg and Leiden: the Reformers and the Reformed orthodox who followed them.', unit: ['writer', 'writers'] },
    { k: 'lutheran', c: '--f2', name: 'Lutheran', eyebrow: `${D.lutheran.works} works`, desc: 'Luther and Melanchthon, the Book of Concord, and the orthodox divines of Wittenberg and Jena.', unit: ['writer', 'writers'] },
  ];
  const C0 = 1, C1 = 20; let cur = 4;
  const svg = document.querySelector('#tg-ruler svg'); let W = 0, X;
  const ROW = 22, TOP = 18, H = TOP + SH.length * ROW + 30;
  function drawRuler() {
    W = svg.clientWidth || 800; const L = 10, R = 10; X = (y) => L + (y / 2000) * (W - L - R);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.height = `${H}px`;
    const rows = SH.map((s, i) => { const {dens} = D[s.k], max = Math.max(...Object.values(dens)), base = TOP + i * ROW + ROW - 3;
      const bars = Object.entries(dens).map(([d, n]) => { const h = 2 + (ROW - 6) * Math.sqrt(n / max); return `<rect class="bar" x="${X(+d).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${Math.max(1.4, X(10) - X(0) - 0.8).toFixed(1)}" height="${h.toFixed(1)}" fill="var(${s.c})" fill-opacity="0.78"/>`; }).join('');
      return `<g class="row">${bars}<line x1="${L}" x2="${W - R}" y1="${base + 0.5}" y2="${base + 0.5}" stroke="var(--rule)"/><text class="lab" x="${L + 2}" y="${base - ROW + 13}">${esc(s.name)}</text></g>`; }).join('');
    const ticks = Array.from({ length: C1 }, (_, i) => i + 1).map((c) => `<text data-c="${c}" x="${X((c - 0.5) * 100).toFixed(1)}" y="${H - 6}" text-anchor="middle">${W < 600 ? (c % 2 ? c : '') : ORD(c)}</text>`).join('');
    svg.innerHTML = `<rect class="band" id="tg-band" x="${X((cur - 1) * 100)}" y="${TOP - 6}" width="${X(100) - X(0)}" height="${SH.length * ROW + 10}" rx="3"/>${rows}${ticks}`; mark();
  }
  function mark() { svg.querySelectorAll('text[data-c]').forEach((t) => t.classList.toggle('on', +t.dataset.c === cur)); svg.setAttribute('aria-valuenow', cur); svg.setAttribute('aria-valuetext', `${ORD(cur)} century`); }
  const toC = (ev) => { const b = svg.getBoundingClientRect(), x = ev.clientX - b.left; return Math.max(C0, Math.min(C1, Math.floor((x - 10) / (W - 20) * 20) + 1)); };
  let drag = false;
  svg.addEventListener('pointerdown', (ev) => { drag = true; svg.setPointerCapture(ev.pointerId); set(toC(ev)); });
  svg.addEventListener('pointermove', (ev) => { if (drag) set(toC(ev)); });
  svg.addEventListener('pointerup', () => { drag = false; });
  svg.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowLeft') { set(cur - 1); ev.preventDefault(); } if (ev.key === 'ArrowRight') { set(cur + 1); ev.preventDefault(); } });
  document.getElementById('tg-prev').onclick = () => set(cur - 1); document.getElementById('tg-next').onclick = () => set(cur + 1);
  const tiles = document.getElementById('tg-tiles');
  tiles.innerHTML = SH.map((s) => `<article class="tile" data-k="${s.k}" style="--c:var(${s.c})"><p class="eyebrow">${esc(s.eyebrow)}</p><h3><a href="${esc(LK[s.k] || '#')}">${esc(s.name)}</a></h3><p class="desc">${esc(s.desc)}</p>
    <div class="count"><b data-n="0">0</b><span></span></div><ol></ol><a class="open" href="${esc(LK[s.k] || '#')}">Open the guide</a></article>`).join('');
  function fill(first) {
    document.getElementById('tg-now').innerHTML = `The <em>${WORD[cur]}</em> century`;
    SH.forEach((s, i) => { const t = tiles.querySelector(`[data-k="${s.k}"]`), g = D[s.k].by[cur] || { n: 0, top: [] }, b = t.querySelector('.count b'), sp = t.querySelector('.count span'), ol = t.querySelector('ol');
      sp.textContent = `${g.n === 1 ? s.unit[0] : s.unit[1]} in the ${ORD(cur)} century`;
      const html = g.top.length ? g.top.map(([y, n, slug, p]) => `<li><span class="y">${esc(y)}</span>${slug ? `<a href="${TG.read(slug, p)}" target="_blank" rel="noopener">${esc(n)}</a>` : `<span>${esc(n)}</span>`}</li>`).join('') : `<li style="display:block"><span class="empty">Nothing on this shelf from the ${ORD(cur)} century.</span></li>`;
      const from = +b.dataset.n; b.dataset.n = g.n; t.style.opacity = g.n ? 1 : 0.62;
      if (G && !first) {
        G.to(ol, { opacity: 0, y: -6, duration: 0.15, delay: i * 0.04, onComplete() { ol.innerHTML = html; G.set(ol, { opacity: 1, y: 0 }); G.fromTo(ol.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out' }); } });
        const o = { n: from }; G.to(o, { n: g.n, duration: 0.6, ease: 'power2.out', onUpdate() { b.textContent = fmt(Math.round(o.n)); } });
      } else { ol.innerHTML = html; b.textContent = fmt(g.n); } });
  }
  function set(c, first) { c = Math.max(C0, Math.min(C1, c)); if (c === cur && !first) return; cur = c; const band = document.getElementById('tg-band');
    if (band) { const x = X((cur - 1) * 100); if (G && !first) G.to(band, { attr: { x }, duration: 0.45, ease: 'power3.out' }); else band.setAttribute('x', x); }
    mark(); fill(first); try { history.replaceState(null, '', `${location.pathname}${location.search}#c${cur}`); } catch (e) {} }
  const hc = +(location.hash.match(/^#c(\d{1,2})$/) || [])[1]; if (hc >= C0 && hc <= C1) cur = hc;
  drawRuler(); set(cur, true); let lastW = svg.clientWidth; new ResizeObserver(() => { if (Math.abs(svg.clientWidth - lastW) < 2) return; lastW = svg.clientWidth; drawRuler(); }).observe(svg);
  if (G) {
    G.from('.tg-lib .hero .kick, .tg-lib .hero h1, .tg-lib .hero .lede', { opacity: 0, y: 14, duration: 0.7, stagger: 0.08, ease: 'power3.out' });
    G.from(svg.querySelectorAll('.row'), { opacity: 0, x: -12, duration: 0.6, stagger: 0.09, ease: 'power2.out', delay: 0.2 });
    G.from(svg.querySelectorAll('.bar'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.8, stagger: { each: 0.0025, from: 'start' }, ease: 'power2.out', delay: 0.35 });
    G.from('#tg-band', { opacity: 0, duration: 0.6, delay: 1.0 });
    G.from('.tg-lib .tile', { opacity: 0, y: 22, duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.5, clearProps: 'transform' });
    tiles.querySelectorAll('.count b').forEach((b) => { const o = { n: 0 }, n = +b.dataset.n; G.to(o, { n, duration: 1.2, delay: 0.7, ease: 'power2.out', onUpdate() { b.textContent = fmt(Math.round(o.n)); } }); });
  }
})();
