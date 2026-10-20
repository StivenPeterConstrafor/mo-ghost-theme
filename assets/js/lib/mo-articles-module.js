/*
 * "From Mere Orthodoxy": the one small module that lists Mere Orthodoxy essays on a page they relate to (2026-10-20).
 *
 * Ian reviewed the 493 Mere Orthodoxy articles matched to The Faith Received and said they are all good matches and all
 * should be used. This file draws them wherever a page matches: the Verse Desk, the Topic Desk, an author's room, a work, a
 * confession or creed. Data and the lookups come from mo-articles.js (MOArticles); the page's own script decides WHICH
 * articles belong to it and hands them here. This file only draws, and it draws nothing at all when it has nothing.
 *
 * TRUST. Every row is "an essay that engages this": a title, an author and a date, a link to the original, and (where there
 * is room) the short excerpt. The words around the rows never say the essay states the library's position or an author's.
 *
 * DESIGN. A small-caps label over a thin rule; rows of title, then "Author, Month Year" muted; "Show all N" is a plain
 * underlined text button that opens the rest in place (never a scroll box); "All Mere Orthodoxy articles" at the foot.
 * No pills, no display face, 44px rows on a phone, colors are tokens only (assets/css/mo-articles-module.css).
 *
 * Pure parts (html, dateLine, safeUrl) take plain data, so scripts/check-mo-placements.mjs runs them without a DOM.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MOArticlesModule = api;
}(typeof window !== "undefined" ? window : globalThis, () => {
  "use strict";

  const ALL_HREF = "/the-faith-received/resources/#articles";
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // The library's machine-matched text can carry an em dash; the site's copy has none.
  const plain = (s) => String(s == null ? "" : s).replace(/\s*—\s*/g, ", ").replace(/\s+/g, " ").trim();

  // Only an https or http address becomes a link; anything else (javascript:, data:) is dropped with its row.
  function safeUrl(u) {
    const s = String(u == null ? "" : u).trim();
    return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : "";
  }

  // "2019-05-14" or an ISO timestamp -> "May 2019". Read from the text, never through Date, so the month cannot slip a time zone.
  function monthYear(d) {
    const m = /^(\d{4})-(\d{2})/.exec(String(d == null ? "" : d));
    if (!m) return /^\d{4}$/.test(String(d)) ? String(d) : "";
    const mo = Number(m[2]);
    return mo >= 1 && mo <= 12 ? `${MONTHS[mo - 1]} ${m[1]}` : m[1];
  }
  const dateLine = (a) => [plain(a.a), monthYear(a.d)].filter(Boolean).join(", ");

  // A short excerpt: first sentence-ish run, cut on a word, never more than max characters.
  function excerpt(x, max) {
    const s = plain(x);
    if (!s) return "";
    if (s.length <= max) return s;
    const cut = s.slice(0, max);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).replace(/[\s,;:.]+$/, "")}…`;
  }

  /* The module's HTML, or "" when there is nothing to draw.
       items  article entries ({ id, t, u, d, a, x }); a row may carry `note` ("on this chapter") shown after the author line
       opts   id       element id prefix (unique per module on a page)
              title    the label itself, "From Mere Orthodoxy" unless the page names its subject ("Mere Orthodoxy on Augustine of Hippo")
              context  the words after the label ("on this passage"), part of the heading's accessible name
              limit    rows shown before "Show all N" (the rest are in the markup, hidden, and open in place)
              excerpt  true to show the one-line excerpt (not on a narrow panel)
              tag      heading element (h2 to h4), default h3
              foot     false to leave out the "All Mere Orthodoxy articles" link
              cap      most rows ever drawn (a narrow panel: 2); moreHref/moreLabel then name where the rest are (an on-site path)
              note     one short muted sentence under the label (the trust line); "" for none */
  function html(items, opts) {
    const o = opts || {};
    const rows = (Array.isArray(items) ? items : []).filter((a) => a && plain(a.t) && safeUrl(a.u));
    if (!rows.length) return "";
    const limit = Math.max(1, Number(o.limit) || 3);
    // cap: a hard ceiling (a narrow panel shows two and no more); the rest are reached through moreHref, not drawn.
    const total = rows.length;
    if (o.cap && rows.length > o.cap) rows.length = Math.max(1, Number(o.cap));
    const tag = /^h[2-4]$/.test(o.tag || "") ? o.tag : "h3";
    const id = esc(o.id || "moa");
    const ctx = plain(o.context);
    const n = rows.length;
    const li = rows.map((a, i) => {
      const meta = dateLine(a);
      const note = a.note ? `<span class="moa-tag">${esc(plain(a.note))}</span>` : "";
      const x = o.excerpt ? excerpt(a.x, 105) : "";
      return `<li class="moa-row"${i >= limit ? " hidden data-moa-extra" : ""}>` +
        `<a class="moa-link" href="${esc(safeUrl(a.u))}" target="_blank" rel="noopener">${esc(plain(a.t))}<span class="moa-sr"> (Mere Orthodoxy, opens in a new tab)</span></a>` +
        `${meta || note ? `<span class="moa-meta">${esc(meta)}${meta && note ? " · " : ""}${note}</span>` : ""}` +
        `${x ? `<span class="moa-x">${esc(x)}</span>` : ""}</li>`;
    }).join("");
    const more = n > limit
      ? `<button type="button" class="moa-more" aria-expanded="false" aria-controls="${id}-list" data-moa-more data-n="${n}">Show all ${n}</button>` : "";
    const rest = total > n && o.moreHref && /^\/[^/\\]/.test(o.moreHref)
      ? `<a class="moa-all" href="${esc(o.moreHref)}">${esc(o.moreLabel || `All ${total}`)}</a>` : "";
    const foot = o.foot === false ? rest : `${rest}<a class="moa-all" href="${ALL_HREF}">All Mere Orthodoxy articles</a>`;
    return `<section class="moa${o.excerpt ? " moa--x" : ""}" data-moa aria-labelledby="${id}-h">` +
      `<${tag} class="moa-h" id="${id}-h">${esc(plain(o.title) || "From Mere Orthodoxy")}${ctx ? `<span class="moa-ctx"> ${esc(ctx)}</span>` : ""}</${tag}>` +
      `${o.note ? `<p class="moa-note">${esc(plain(o.note))}</p>` : ""}` +
      `<ul class="moa-list" id="${id}-list">${li}</ul>` +
      `${more || foot ? `<div class="moa-foot">${more}${foot}</div>` : ""}</section>`;
  }

  // One delegated handler per host: "Show all N" opens the hidden rows in place, "Show fewer" folds them back.
  function bind(host) {
    if (host.dataset.moaBound) return;
    host.dataset.moaBound = "1";
    host.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest("[data-moa-more]");
      if (!b || !host.contains(b)) return;
      const sec = b.closest("[data-moa]");
      const open = b.getAttribute("aria-expanded") !== "true";
      sec.querySelectorAll("[data-moa-extra]").forEach((li) => { li.hidden = !open; });
      b.setAttribute("aria-expanded", String(open));
      b.textContent = open ? "Show fewer" : `Show all ${b.dataset.n}`;
    });
  }

  /* Draw into `host` (an element the page owns). Returns true when something was drawn. Replaces what an earlier call drew
     there; draws nothing, and leaves the host as it was, when there is nothing to show. */
  function mount(host, items, opts) {
    if (!host || typeof host.insertAdjacentHTML !== "function") return false;
    const out = html(items, opts);
    host.querySelectorAll(":scope > [data-moa]").forEach((el) => el.remove());
    if (!out) return false;
    host.insertAdjacentHTML("beforeend", out);
    bind(host);
    return true;
  }

  /* Make a host element, put it where `place(host)` says, and mount into it; the host is removed again if nothing is drawn.
     Used by pages whose markup this file does not own (an author's room, a work page). */
  function mountAt(place, items, opts) {
    if (typeof document === "undefined") return null;
    const host = document.createElement("div");
    host.className = "moa-host";
    host.dataset.moaHost = String((opts && opts.id) || "moa");
    if (!mount(host, items, opts)) return null;
    place(host);
    return host;
  }


  /* ── WHICH ARTICLES BELONG TO A PAGE ───────────────────────────────────────────────────────────────────────────────────
     Pure functions over MOArticles (mo-articles.js), so scripts/check-mo-placements.mjs runs them on the real data. Each returns
     entries ready for html(): the article itself, or a copy carrying a short `note` where the reason is not the page's own subject.
     Nothing is dropped: every article that the data ties to a verse, topic, author, work or document is returned for that page. */
  const withNote = (a, note) => (note ? { ...a, note } : a);
  const dedupe = (lists) => {
    const seen = new Set();
    const out = [];
    lists.forEach((l) => l.forEach((a) => { if (a && !seen.has(a.id)) { seen.add(a.id); out.push(a); } }));
    return out;
  };
  /* A document's name for a note. The data's own label for some council slugs is the title of one decree inside it ("The Primacy
     of the Roman Pontiff" for Chalcedon), so the named documents are spelled out here and the data's label is only a fallback. */
  const DOC_NAMES = {
    "cf-001-apostolic-and-ancient-creeds": "the ancient creeds", "cf-013-council-of-nicea-i-325": "the Council of Nicaea",
    "cf-025-council-of-chalcedon-451": "the Council of Chalcedon", "cf-048-council-of-nicea-ii-787": "the Second Council of Nicaea",
    "cf-092-council-of-trent-1545-1563": "the Council of Trent", "lc-002-augsburg-confession-1530": "the Augsburg Confession",
    "rc-057-belgic-confession-1561": "the Belgic Confession", "rc-061-heidelberg-catechism-1563": "the Heidelberg Catechism",
    "rc-105-canons-of-dort-1618": "the Canons of Dort", "rc-111-westminster-confession-of-faith-1646": "the Westminster Confession",
    "rc-114-westminster-larger-catechism-1647": "the Westminster Larger Catechism", "rc-115-westminster-shorter-catechism-1647": "the Westminster Shorter Catechism",
  };
  const docLabel = (A, a, slug) => {
    if (DOC_NAMES[slug]) return DOC_NAMES[slug];
    const e = (A.entities(a) || []).find((x) => x.type === "doc" && x.key === slug);
    return e ? e.label : "";
  };

  // A verse: the essays on it, then essays on a range that covers it, then essays on the whole chapter, then essays on other verses of
  // the chapter. The last two read "on this chapter" so a reader never takes them for essays on this verse.
  function verse(A, slug, c, v) {
    const chap = `${slug}.${c}`;
    const exact = `${chap}.${v}`;
    const inChapter = A.forVerse(chap);
    const tier = (a) => {
      const vs = a.verses || [];
      if (vs.includes(exact)) return 0;
      const range = vs.some((k) => {
        const m = /^(.+)\.(\d+)-(\d+)$/.exec(k);
        return m && m[1] === chap && Number(m[2]) <= Number(v) && Number(v) <= Number(m[3]);
      });
      if (range) return 1;
      return vs.includes(chap) ? 2 : 3;
    };
    const rank = new Map(inChapter.map((a, i) => [a.id, i]));
    return inChapter.map((a) => [tier(a), a]).sort((x, y) => x[0] - y[0] || rank.get(x[1].id) - rank.get(y[1].id))
      .map(([t, a]) => withNote(a, t >= 2 ? "on this chapter" : ""));
  }

  // A topic: its own essays, then essays on the confession documents that speak to it (named), newest first as the data orders them.
  function topic(A, id, docSlugs) {
    const own = A.forTopic(id);
    const viaDocs = [];
    (docSlugs || []).forEach((slug) => A.forDoc(slug).forEach((a) => viaDocs.push(withNote(a, `on ${docLabel(A, a, slug) || "a confession"}`))));
    return dedupe([own, viaDocs]);
  }

  const author = (A, name) => A.forAuthor(name);

  // A work, or a library document (a creed, confession, catechism or council is a work too): essays on the work, then on the document.
  function work(A, slug) {
    const s = String(slug || "").trim();
    const key = /^\d+$/.test(s) ? `pld-${s}` : s;
    return dedupe([A.forWork(key), A.forDoc(key)]);
  }

  const doc = (A, slugs) => dedupe((Array.isArray(slugs) ? slugs : [slugs]).map((s) => A.forDoc(s)));

  const pick = { verse, topic, author, work, doc, dedupe, DOC_NAMES };

  return { html, mount, mountAt, bind, safeUrl, monthYear, dateLine, excerpt, plain, pick, ALL_HREF };
}));
