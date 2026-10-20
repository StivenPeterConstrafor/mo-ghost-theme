/*
 * "Principal writers on this topic in the library" for the comparison cards (2026-10-20, Ian: "the heavy hitters for their tradition need to
 * always be included on comparisons").
 *
 * principalRows(names, authors, works, limit)  names: the curated order for one tradition (assets/data/faith-received/principal-writers.json)
 *                                              authors: the topic's author list from the worker (a, s, n = indexed passages)
 *                                              works: the topic's works (w, t, a, weight, secs with page p)
 *   -> up to `limit` rows { name, n, href, work } for the writers on that list who HAVE passages on this topic, in the curated order.
 *      A writer with none is left out without a word. Where a writer has several works on the topic the one with the most passages
 *      (weight) gives the link, at its first section on the topic when it has one; with no work in the list the link is his author page.
 *
 * It does not change the comparison prose and does not say the prose drew on anyone: the line under the row says it was written from a sample.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MOTopicPrincipal = api;
}(typeof window === "undefined" ? globalThis : window, () => {
  "use strict";
  const enc = encodeURIComponent;
  function principalRows(names, authors, works, limit = 8) {
    const by = new Map((authors || []).filter((a) => a && a.a).map((a) => [a.a, a]));
    const rows = [];
    (names || []).forEach((name) => {
      const a = by.get(name);
      if (!a || !(Number(a.n) > 0) || rows.length >= limit) return;
      const best = (works || []).filter((w) => w && w.a === name && w.w).sort((x, y) => (Number(y.weight) || 0) - (Number(x.weight) || 0))[0];
      const sec = best && (best.secs || []).find((s) => s && s.p);
      const href = best
        ? `/the-faith-received/read/?w=${enc(best.w)}${sec ? `#b${enc(sec.p)}-0` : ""}`
        : `/the-faith-received/author/?a=${enc(a.s || name)}`;
      rows.push({ name, n: Number(a.n), href, work: best ? best.t : "" });
    });
    return rows;
  }
  return { principalRows };
}));
