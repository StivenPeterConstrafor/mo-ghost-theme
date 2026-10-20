/*
 * MOArticles: the Mere Orthodoxy essays that serve the library (2026-10-20).
 *
 * One cached fetch of assets/data/faith-received/mo-articles.json (built by scripts/build-mo-articles.mjs), then
 * lookups by page and a keyword search over just these essays. No DOM: the same code runs in the browser and in
 * scripts/check-mo-articles.mjs. Every article links to the original on mereorthodoxy.com; only a short excerpt is held.
 *
 *   MOArticles.load()               Promise of the data, fetched once. A failed fetch resolves to null and is retried next call.
 *   MOArticles.forVerse(ref)        "romans.8.28" | "romans.8" | "romans.8.28-30": that verse's essays, then essays on its whole chapter
 *   MOArticles.forTopic(id)         a locus id from loci.json ("de-trinitate")
 *   MOArticles.forWork(slug)        a library work slug ("pld-2722")
 *   MOArticles.forAuthor(name)      the library's author name ("Augustine of Hippo"); accents, case and spacing do not matter
 *   MOArticles.forDoc(slug)         a creed, confession or council slug ("rc-061-heidelberg-catechism-1563")
 *   MOArticles.search(q, {kind, limit})   AND across the words, prefix on the last; title, keywords, byline, names, excerpt
 *   MOArticles.kinds()              [{k, label, n}] in display order
 *   MOArticles.terms(q)             the folded words of a query, for highlighting
 *   MOArticles.image(article, w)   the featured image URL at width w (300, 600, 1000), or "" when there is none
 *   MOArticles.entities(article)    [{type, key, label}] the article serves, most specific first
 *
 * Every lookup answers [] until the data is loaded. Lists come in the order the build set: about the subject first,
 * then newest. Articles are shared objects; do not change them.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MOArticles = api;
}(typeof window !== "undefined" ? window : globalThis, () => {
  "use strict";

  // The loader's own ?v= (Ghost stamps it with the theme hash, which changes on every deploy), read now while the script is running.
  const SELF_V = (() => {
    try { const m = /[?&]v=([a-z0-9]+)/i.exec((document.currentScript && document.currentScript.src) || ""); return m ? m[1] : ""; } catch (e) { return ""; }
  })();
  const DATA_PATH = "/assets/data/faith-received/mo-articles.json";
  const KINDS = [
    ["doc", "Creeds and confessions"],
    ["work", "Works and authors"],
    ["retrieval", "Theological retrieval"],
    ["topic", "Doctrine and Scripture"],
  ];

  const fold = (s) => String(s == null ? "" : s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const words = (s) => fold(s).match(/[a-z0-9]+/g) || [];
  const terms = (q) => words(q);

  // Weights: title over keywords over the byline over the names of what it serves over the excerpt.
  const W = { title: 10, keyword: 6, byline: 5, entity: 4, excerpt: 1 };

  function create() {
    let data = null;
    let byId = new Map();
    let pending = null;
    const memo = new Map();

    const hit = (set, term, last) => {
      if (set.has(term)) return true;
      if (!last) return false;
      for (const w of set) if (w.startsWith(term)) return true;
      return false;
    };

    // Per-article folded fields, built the first time a search needs them.
    function fields(a) {
      let f = memo.get(a.id);
      if (f) return f;
      const lab = (data && data.lab) || {};
      const names = [];
      for (const s of a.authors || []) names.push(s);
      for (const s of a.works || []) names.push((lab.works || {})[s] || "");
      for (const s of a.docs || []) names.push((lab.docs || {})[s] || "");
      for (const s of a.topics || []) names.push((lab.topics || {})[s] || "");
      for (const s of a.n || []) names.push(s);
      f = {
        title: new Set(words(a.t)),
        keyword: new Set((a.w || []).flatMap(words)),
        byline: new Set(words(a.a)),
        entity: new Set(names.flatMap(words)),
        excerpt: new Set(words(a.x)),
        phrase: fold(a.t),
      };
      memo.set(a.id, f);
      return f;
    }

    function use(d) {
      if (!d || !Array.isArray(d.articles) || !d.idx) return null;
      data = d;
      byId = new Map(d.articles.map((a) => [a.id, a]));
      memo.clear();
      return d;
    }

    function load() {
      if (data) return Promise.resolve(data);
      if (!pending) {
        const path = DATA_PATH;
        // The CDN keys data files on ?v= alone and keeps old copies under old keys, so the data's own version goes in v: the stamp
        // (mo-articles-dv.js, built with the data), else the theme hash this script was loaded under, else the site's hourly helper.
        const dv = typeof window !== "undefined" && window.MO_ARTICLES_DV;
        let url = path;
        if (dv) url = `${path}?v=${dv}`;
        else if (SELF_V) url = `${path}?v=${SELF_V}`;
        else if (typeof window !== "undefined" && window.moDataUrl) url = window.moDataUrl(path);
        pending = fetch(url, { credentials: "omit" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d && typeof console !== "undefined") {
              if (d.imgBase && !d.articles.some((a) => a.i)) console.warn("MOArticles: the data names an image base but no article has one, so a stale copy was served.", url);
              if (dv && d.dv !== dv) console.warn("MOArticles: data version", d.dv, "is not the expected", dv, url);
            }
            return d;
          })
          .then(use)
          .catch(() => null)
          .then((d) => { if (!d) pending = null; return d; });
      }
      return pending;
    }

    const pick = (table, key) => {
      const list = data && data.idx[table] && data.idx[table][key];
      return list ? list.map((id) => byId.get(id)).filter(Boolean) : [];
    };
    const merge = (...lists) => {
      const seen = new Set();
      const out = [];
      for (const l of lists) for (const a of l) if (!seen.has(a.id)) { seen.add(a.id); out.push(a); }
      return out;
    };

    function forVerse(ref) {
      const m = /^([a-z0-9-]+)\.(\d{1,3})(?:\.(\d{1,3})(?:-(\d{1,3}))?)?$/.exec(fold(ref).trim());
      if (!m) return [];
      const chapter = `${m[1]}.${m[2]}`;
      if (!m[3]) return pick("verse", chapter);
      const from = Number(m[3]);
      const to = m[4] ? Number(m[4]) : from;
      const lists = [];
      for (let v = from; v <= Math.min(to, from + 175); v++) lists.push(pick("verse", `${chapter}.${v}`));
      // An essay on the whole chapter serves each of its verses; one on other verses of the chapter does not.
      const whole = pick("verse", chapter).filter((a) => (a.verses || []).includes(chapter));
      return merge(...lists, whole);
    }

    function forAuthor(name) {
      if (!data) return [];
      const direct = pick("author", name);
      if (direct.length) return direct;
      const f = fold(name).replace(/[^a-z0-9]+/g, "");
      if (!f) return [];
      const key = Object.keys(data.idx.author).find((k) => fold(k).replace(/[^a-z0-9]+/g, "") === f);
      return key ? pick("author", key) : [];
    }

    function search(q, opts) {
      if (!data) return [];
      const o = opts || {};
      const ts = terms(q);
      let list = data.articles;
      if (o.kind) list = list.filter((a) => a.k === o.kind);
      let out;
      if (!ts.length) out = list.slice().sort((x, y) => (x.d < y.d ? 1 : x.d > y.d ? -1 : x.id < y.id ? -1 : 1));
      else {
        const scored = [];
        for (const a of list) {
          const f = fields(a);
          let total = 0;
          let ok = true;
          for (let i = 0; i < ts.length && ok; i++) {
            const last = i === ts.length - 1;
            let best = 0;
            for (const field of ["title", "keyword", "byline", "entity", "excerpt"]) {
              if (W[field] > best && hit(f[field], ts[i], last)) best = W[field];
            }
            if (!best) ok = false;
            else total += best;
          }
          if (!ok) continue;
          if (ts.length > 1 && f.phrase.includes(ts.join(" "))) total += 5;
          scored.push([total, a]);
        }
        scored.sort((x, y) => y[0] - x[0] || (x[1].d < y[1].d ? 1 : x[1].d > y[1].d ? -1 : x[1].id < y[1].id ? -1 : 1));
        out = scored.map((p) => p[1]);
      }
      return o.limit > 0 ? out.slice(0, o.limit) : out;
    }

    function kinds() {
      const n = {};
      if (data) for (const a of data.articles) n[a.k] = (n[a.k] || 0) + 1;
      return KINDS.map(([k, label]) => ({ k, label, n: n[k] || 0 }));
    }

    // The featured image at a width Ghost serves (300, 600, 1000). A path is under data.imgBase; a full URL (Unsplash) takes ?w=.
    function image(a, w) {
      if (!a || !a.i) return "";
      if (/^https:/.test(a.i)) {
        if (!/images\.unsplash\.com/.test(a.i)) return a.i;
        try { const u = new URL(a.i); u.searchParams.set("w", String(w)); return u.toString(); } catch (e) { return a.i; }
      }
      return `${(data && data.imgBase) || ""}size/w${w}/${a.i}`;
    }

    function entities(a) {
      const lab = (data && data.lab) || {};
      const out = [];
      for (const s of a.docs || []) out.push({ type: "doc", key: s, label: (lab.docs || {})[s] || s });
      for (const s of a.works || []) out.push({ type: "work", key: s, label: (lab.works || {})[s] || s });
      for (const s of a.authors || []) out.push({ type: "author", key: s, label: s });
      for (const s of a.topics || []) out.push({ type: "topic", key: s, label: (lab.topics || {})[s] || s });
      for (const s of a.verses || []) out.push({ type: "verse", key: s, label: s });
      return out;
    }

    return {
      load, use, search, kinds, entities, image, forVerse, forAuthor,
      forTopic: (id) => pick("topic", id),
      forWork: (slug) => pick("work", slug),
      forDoc: (slug) => pick("doc", slug),
      article: (id) => byId.get(id) || null,
      all: () => (data ? data.articles : []),
      terms, fold,
      create,
    };
  }

  return create();
}));
