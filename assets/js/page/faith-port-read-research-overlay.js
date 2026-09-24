/*
 * The Research panel's Scripture list, merged from our retired copy.
 *
 * Ian, 2026-09-24: Stiven's copy wins, and where ours was better his gets
 * our format. The Belgic Confession is the case: our copy's Research file
 * (v1/mine/work/belgic.json) carries 42 Scripture citations across 19
 * books, his (v1/mine/work/rc-057-belgic-confession-1561.json) carries 6
 * across 3. His file is his: the worker reads his bucket first and his
 * republish would overwrite anything we wrote there.
 *
 * So the merge happens in the browser, at the one place both Research
 * loaders pass through: fetch. A request for the overview of a work that
 * replaced one of ours (assets/js/lib/faith-work-forwards.js, rows marked
 * `research`) is answered with his file plus our citations, each moved to
 * the page of the same article in his copy (the forward map's `pages`).
 * His topics, quotations and everything else are untouched. If ours fails
 * to load, his file is returned exactly as published.
 *
 * Loads in the head, after the forwards lib and before any Research code.
 */
(function () {
  "use strict";

  const F = window.MOWorkForwards;
  const nativeFetch = window.fetch;
  if (!F || typeof nativeFetch !== "function") return;

  // new slug -> [old slugs whose Research merges into it]
  const MERGE = new Map();
  F.retired().forEach((old) => {
    const w = F.get(old);
    if (!w || !w.research) return;
    if (!MERGE.has(w.to)) MERGE.set(w.to, []);
    MERGE.get(w.to).push(old);
  });
  if (!MERGE.size) return;

  const PATH = /\/v1\/mine\/work\/([^/?#]+)\.json(?:[?#]|$)/;

  function merge(his, ours, pages) {
    const books = new Map();
    const key = (b) => String(b.name || b.b || "").toLowerCase();
    (his.books || []).forEach((b) => books.set(key(b), { ...b, rows: (b.rows || []).slice() }));
    ours.forEach((doc) => (doc.books || []).forEach((b) => {
      const k = key(b);
      if (!books.has(k)) books.set(k, { b: b.b, name: b.name, n: 0, chs: [], rows: [] });
      const into = books.get(k);
      const seen = new Set(into.rows.map((r) => `${r.c}:${r.v}:${r.p}`));
      (b.rows || []).forEach((r) => {
        const at = pages && pages[String(r.p)];
        const p = at ? Number(at[0]) || at[0] : r.p;
        const row = { ...r, p };
        const id = `${row.c}:${row.v}:${row.p}`;
        if (seen.has(id)) return;
        seen.add(id);
        into.rows.push(row);
      });
    }));
    const out = [...books.values()].map((b) => {
      const byCh = new Map();
      b.rows.forEach((r) => byCh.set(r.c, (byCh.get(r.c) || 0) + 1));
      b.rows.sort((x, y) => x.c - y.c || (x.v || 0) - (y.v || 0));
      return { ...b, n: b.rows.length, chs: [...byCh.entries()].sort((x, y) => x[0] - y[0]) };
    }).sort((x, y) => y.n - x.n);
    return { ...his, books: out, ncit: out.reduce((n, b) => n + b.n, 0) };
  }

  window.fetch = function (...args) {
    const [input] = args;
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const m = PATH.exec(url);
    const slug = m ? decodeURIComponent(m[1]) : "";
    if (!MERGE.has(slug)) return nativeFetch.apply(this, args);
    const mine = nativeFetch.apply(this, args);
    const olds = MERGE.get(slug);
    const base = url.slice(0, url.indexOf("/v1/mine/work/"));
    return mine.then((res) => {
      // No file of his at all: ours alone, moved onto his pages.
      if (!res.ok && res.status !== 404) return res;
      return Promise.all([
        res.ok ? res.clone().json() : Promise.resolve({ w: slug, topics: [], books: [] }),
        Promise.all(olds.map((old) => nativeFetch(`${base}/v1/mine/work/${encodeURIComponent(old)}.json`)
          .then((r) => (r.ok ? r.json() : null)).catch(() => null))),
      ]).then(([his, ours]) => {
        const got = ours.filter(Boolean);
        if (!got.length || !his || typeof his !== "object") return res;
        // One forward's page table per old copy; they all land in `slug`.
        const pages = Object.assign({}, ...olds.map((old) => (F.get(old) || {}).pages || {}));
        const body = JSON.stringify(merge(his, got, pages));
        return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
      }).catch(() => res);
    });
  };
})();
