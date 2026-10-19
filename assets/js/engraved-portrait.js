/*
 * Engraved portraits outside the TFR guides.
 *
 * <canvas data-engrave="<image url>"> is redrawn as an engraver's
 * parallel lines whose weight follows the darkness of the photograph,
 * inside a double oval, cut top to bottom when it scrolls into view.
 * The same drawing as TG.engrave in faith-guide-engine.js (the "authors
 * you should know" cards), with a finer grid and a steeper weight curve
 * because a modern photo has more midtone than an old engraving. The
 * source should be a grayscale head-and-shoulders crop at 4:5 with the
 * backdrop pale; see assets/images/dlp-noble-engrave.jpg.
 *
 * Used on /daily-liturgy/ for the reader endorsement. The canvas is
 * aria-hidden: the person is named in the text beside it.
 */
(function () {
  const canvases = document.querySelectorAll("canvas[data-engrave]");
  if (!canvases.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function engrave(cv, src, animate) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth || 160, H = cv.clientHeight || 200;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Sample the photo on a small grid, cover-fitted.
    const GW = 140, GH = Math.round(GW * H / W);
    const off = document.createElement("canvas"); off.width = GW; off.height = GH;
    const o = off.getContext("2d");
    o.fillStyle = "#fff"; o.fillRect(0, 0, GW, GH);
    const r0 = Math.max(GW / src.naturalWidth, GH / src.naturalHeight);
    const w = src.naturalWidth * r0, h = src.naturalHeight * r0;
    o.drawImage(src, (GW - w) / 2, (GH - h) * 0.2, w, h);
    let px;
    // Throws if the image ever comes from another origin without CORS.
    try { px = o.getImageData(0, 0, GW, GH).data; } catch (_) { fail(cv); return; }
    const lum = (x, y) => {
      const i = (Math.min(GH - 1, Math.max(0, y)) * GW + Math.min(GW - 1, Math.max(0, x))) * 4;
      return (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
    };
    let lo = 1, hi = 0;
    for (let i = 0; i < px.length; i += 16) {
      const v = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    const norm = (v) => Math.min(1, Math.max(0, (v - lo) / Math.max(0.15, hi - lo)));

    const ink = getComputedStyle(document.documentElement).getPropertyValue("--color-dark").trim() || "#2d2927";
    const gap = 2.1, rows = Math.floor(H / gap), maxW = gap * 0.92;
    const cx = W / 2, cy = H / 2, rx = W / 2 - 3, ry = H / 2 - 3;
    const inOval = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

    // One band per row, its half-width following the darkness under it,
    // with a slight wave and tilt like a burin's cut.
    const lines = [];
    for (let r = 0; r < rows; r++) {
      const y0 = (r + 0.5) * gap, top = [], bot = [];
      for (let x = 0; x <= W; x += 1.5) {
        const y = y0 + Math.sin(x * 0.11 + r * 0.7) * 0.35 + (x - cx) * 0.04;
        if (!inOval(x, y)) { if (top.length) break; continue; }
        const d = 1 - norm(lum(Math.round(x / W * (GW - 1)), Math.round(y / H * (GH - 1))));
        const t = Math.max(0.12, maxW * d ** 1.25 / 2);
        top.push([x, y - t]); bot.push([x, y + t]);
      }
      if (top.length) lines.push({ top, bot });
    }

    const frame = () => {
      g.save(); g.strokeStyle = ink;
      g.globalAlpha = 0.8; g.lineWidth = 1.1;
      g.beginPath(); g.ellipse(cx, cy, rx + 1.5, ry + 1.5, 0, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 0.45; g.lineWidth = 0.6;
      g.beginPath(); g.ellipse(cx, cy, rx + 3.2, ry + 3.2, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    };
    const cut = (L, f) => {
      const n = Math.max(2, Math.round(L.top.length * f));
      g.beginPath(); g.moveTo(L.top[0][0], L.top[0][1]);
      for (let i = 1; i < n; i++) g.lineTo(L.top[i][0], L.top[i][1]);
      for (let i = n - 1; i >= 0; i--) g.lineTo(L.bot[i][0], L.bot[i][1]);
      g.closePath(); g.fill();
    };

    g.clearRect(0, 0, W, H); g.fillStyle = ink;
    if (reduce || !animate) { lines.forEach((L) => cut(L, 1)); frame(); return; }
    const T = 1600, each = 420, t0 = performance.now();
    const tick = (now) => {
      const t = now - t0; let done = true;
      g.clearRect(0, 0, W, H); frame(); g.fillStyle = ink;
      lines.forEach((L, i) => {
        const start = (i / lines.length) * (T - each);
        const f = Math.min(1, Math.max(0, (t - start) / each));
        if (f < 1) done = false;
        if (f > 0) cut(L, 1 - (1 - f) ** 3);
      });
      if (!done) requestAnimationFrame(tick);
    };
    frame(); requestAnimationFrame(tick);
  }

  function fail(cv) {
    const fig = cv.closest(".dl-endorsement");
    if (fig) fig.classList.add("no-por");
  }

  function load(cv) {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => engrave(cv, im, true);
    im.onerror = () => fail(cv);
    im.src = cv.getAttribute("data-engrave");
  }

  if (!("IntersectionObserver" in window)) { canvases.forEach(load); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    load(e.target);
  }), { threshold: 0.4 });
  canvases.forEach((c) => io.observe(c));
})();
