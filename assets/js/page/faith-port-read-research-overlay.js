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
    // A work split across several of his files (Ignatius's letters)
    // merges into each file only the citations of the chapters it holds.
    (F.targets ? F.targets(old) : [w.to]).forEach((to) => {
      if (!MERGE.has(to)) MERGE.set(to, []);
      MERGE.get(to).push(old);
    });
  });
  if (!MERGE.size) return;

  const PATH = /\/v1\/mine\/work\/([^/?#]+)\.json(?:[?#]|$)/;

  // ours: [{ doc, pages, split }], one per old copy. Each old copy moves
  // its citations through its OWN page table: Justin's three works share
  // pg-105 and all three have a page 5.
  function merge(his, ours, slug) {
    const books = new Map();
    let added = 0;
    const key = (b) => String(b.name || b.b || "").toLowerCase();
    (his.books || []).forEach((b) => books.set(key(b), { ...b, rows: (b.rows || []).slice(), base: Number(b.n) || (b.rows || []).length, plus: 0 }));
    ours.forEach(({ doc, pages, split }) => (doc.books || []).forEach((b) => {
      const k = key(b);
      if (!books.has(k)) books.set(k, { b: b.b, name: b.name, n: 0, chs: [], rows: [], base: 0, plus: 0 });
      const into = books.get(k);
      const seen = new Set(into.rows.map((r) => `${r.c}:${r.v}:${r.p}`));
      (b.rows || []).forEach((r) => {
        const at = pages && pages[String(r.p)];
        // Split works: a citation goes only to the file its chapter is in.
        if (split && (!at || (at[2] || split) !== slug)) return;
        const p = at ? Number(at[0]) || at[0] : r.p;
        const row = { ...r, p };
        const id = `${row.c}:${row.v}:${row.p}`;
        if (seen.has(id)) return;
        seen.add(id);
        into.rows.push(row);
        into.plus++;
        added++;
      });
    }));
    const out = [...books.values()].map((b) => {
      const byCh = new Map();
      b.rows.forEach((r) => byCh.set(r.c, (byCh.get(r.c) || 0) + 1));
      b.rows.sort((x, y) => x.c - y.c || (x.v || 0) - (y.v || 0));
      const { base, plus, ...rest } = b;
      return { ...rest, n: base + plus, chs: [...byCh.entries()].sort((x, y) => x[0] - y[0]) };
    }).sort((x, y) => y.n - x.n);
    // His count can include citations his rows do not list (pg-105: 623
    // counted, 330 listed), so ours are added to it, never recounted.
    const listed = (his.books || []).reduce((n, b) => n + (b.rows || []).length, 0);
    return { ...his, books: out, ncit: Math.max(Number(his.ncit) || 0, listed) + added };
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
        if (!ours.some(Boolean) || !his || typeof his !== "object") return res;
        // `split` is the file a row with no third element lands in (`to`),
        // set only when the old work spans several files.
        const docs = olds.map((old, i) => {
          const w = F.get(old) || {};
          const split = F.targets && F.targets(old).length > 1 ? w.to : "";
          return ours[i] ? { doc: ours[i], pages: w.pages || {}, split } : null;
        }).filter(Boolean);
        const body = JSON.stringify(merge(his, docs, slug));
        return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
      }).catch(() => res);
    });
  };
})();
