/*
 * The Dictionary in English alphabetical order.
 *
 * Ian, 2026-09-23: "order the Dictionary by their english words, not
 * french. Habbakuk and Obediah don't belong in A." The index
 * (v1/dictionary/index.json) is ordered and lettered by the French
 * headword: ABBACOUM (Habakkuk) and ABDIAS (Obadiah) sat under A, and
 * numbered homonyms ("1. VALENTIN, pape") under "#". The list shows the
 * English headword, so a reader looking for Habakkuk looked under H.
 *
 * Each row is [id, French, letter, size, n, English]. The engine keeps
 * the index in the order it arrives and groups it by the row's letter,
 * so the index is re-sorted by the English headword, and each row's
 * letter reset to the English one, as it is fetched. The list, the
 * A-Z buttons, the letter filter and previous/next all follow.
 * "1. " and "I. " numbering does not file a headword ("1. VALENTINE,
 * Pope" at V); a tie keeps that numbering's order.
 *
 * Only a GET of the one index URL is touched; on any failure the engine
 * gets the response it asked for. Loaded before dtc.in02.js.
 */
(function () {
  "use strict";

  const INDEX = /\/v1\/dictionary\/index\.json(?:\?|$)/;
  const original = window.fetch;
  if (typeof original !== "function") return;

  const fold = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/Æ/g, "AE").replace(/Œ/g, "OE");
  const NUMBERED = /^\s*(?:\d+|[IVXLC]+)\.\s+/;
  function key(en) {
    return fold(String(en || "").replace(NUMBERED, "")).replace(/[^A-Z0-9]+/g, " ").trim();
  }
  function number(en) {
    const m = String(en || "").match(/^\s*(\d+)\.\s+/);
    return m ? Number(m[1]) : 0;
  }
  const collate = typeof Intl !== "undefined" && Intl.Collator
    ? new Intl.Collator("en", { numeric: true, sensitivity: "base" }).compare
    : (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  function reorder(d) {
    if (!d || !Array.isArray(d.articles)) return false;
    const rows = d.articles.map((a, i) => ({ a, i, k: key(a[5] || a[1]), n: number(a[5] || a[1]) }));
    rows.sort((x, y) => collate(x.k, y.k) || x.n - y.n || x.i - y.i);
    d.articles = rows.map((r) => {
      const c = r.k.charAt(0);
      r.a[2] = /[A-Z]/.test(c) ? c : "#";
      return r.a;
    });
    return true;
  }

  window.fetch = function (...args) {
    const [input, init] = args;
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
    if (method !== "GET" || !INDEX.test(url)) return original.apply(this, args);
    return original.apply(this, args).then((res) => {
      if (!res.ok) return res;
      return res.clone().json().then((d) => {
        if (!reorder(d)) return res;
        return new Response(JSON.stringify(d), {
          status: res.status,
          statusText: res.statusText,
          headers: { "content-type": "application/json" },
        });
      }).catch(() => res);
    });
  };
})();
