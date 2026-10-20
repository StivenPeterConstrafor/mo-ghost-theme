/*
 * The Scripture tab of "Ways into this topic" (2026-10-20): the Confessions and Works blocks of a topic folded into one view that is
 * built around verses. Each card is one verse the topic's confession articles cite most, with the creeds and confessions that cite it
 * and the works the library holds on it. The existing Confessions and Works blocks stay as they are and now partly overlap with it.
 *
 * Data, all existing:
 *   key verses     /v1/topic/confessions, its `scripture` rows (b, c, v, n = the articles that cite the verse), most cited first
 *   how much of it /v1/topic/scripture rows (n of n_all citations of the verse in the library fall on this topic), when the verse is there
 *   confessions    assets/data/faith-received/confession-proofs/ through FRVerseDeskModel.parts.confessModel (the Verse Desk's own code and links)
 *   works          /v1/verse?b=&c=&v=, its `top_works` (the works that cite the verse most, with their counts)
 * It says that a document cites a verse and that a work treats it. It never says anyone holds a position.
 *
 *   build(input)    pure: rows and per-verse data in, cards out (a card with neither a confession nor a work is dropped)
 *   render(model)   pure: cards in, HTML out
 *   MOTopicScripture.prepare(id, locus) / .fill(el, ctx)   the browser part, called by faith-port-topic-dev-notes.js
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MOTopicScripture = api;
}(typeof window === "undefined" ? globalThis : window, (root) => {
  "use strict";
  const FIRST = 12;
  const MAX = 60;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
  const ord = (n) => `${n}${[11, 12, 13].includes(n % 100) ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th")}`;
  const plain = (s) => String(s || "").replace(/\s*—\s*/g, ": ");
  const deskHref = (book, c, v) => `/the-faith-received/scripture/desk/?ref=${book.slug}.${Number(c)}.${Number(v)}`;

  /* input: { rows, topicRows, books (lib key to book), confessModel, read(slug, page, href), readWork(w, h), per: Map("b.c.v" to { cf, works }) } */
  function build(input) {
    const { rows = [], topicRows = [], books, confessModel, read, readWork, per = new Map() } = input;
    const onTopic = new Map(topicRows.map((r) => [`${r.b}.${r.c}.${r.v}`, r]));
    const list = rows.filter((r) => r && books.has(r.b) && Number(r.v) > 0).slice(0, MAX);
    const max = Math.max(...list.map((r) => Number(r.n) || 0), 1);
    const cards = [];
    list.forEach((r) => {
      const book = books.get(r.b);
      const key = `${r.b}.${r.c}.${r.v}`;
      const data = per.get(key) || {};
      const cm = data.cf && confessModel ? confessModel(data.cf, Number(r.v), read) : null;
      // Up to two documents from each church, so one church's many articles do not crowd the rest out of the six chips.
      const all = [];
      if (cm) cm.groups.forEach((g) => g.rows.forEach((x, i) => all.push({ church: g.church, i, title: plain(x.title), label: plain(x.label), year: x.year, href: x.href })));
      const chips = all.filter((x) => x.i < 2).concat(all.filter((x) => x.i >= 2));
      const seenW = new Set();
      const works = (data.works || []).filter((w) => { const k = `${w.w}|${w.t}`; if (seenW.has(k)) return false; seenW.add(k); return true; }).slice(0, 4).map((w) => ({ title: plain(w.t), author: w.a, cen: Number(w.cen) || 0, n: Number(w.n) || 0, href: readWork(w.w, w.h) }));
      if (!chips.length && !works.length) return;
      const t = onTopic.get(key);
      cards.push({
        ref: `${book.slug === "psalms" ? "Psalm" : book.name} ${Number(r.c)}:${Number(r.v)}`, href: deskHref(book, r.c, r.v), articles: Number(r.n) || 0, heat: Math.round((100 * (Number(r.n) || 0)) / max),
        topic: t ? { n: Number(t.n) || 0, all: Number(t.n_all) || 0 } : null,
        confs: cm ? { n: cm.n, docs: cm.docs, chips: chips.slice(0, 6), more: Math.max(0, all.length - 6) } : null, works,
      });
    });
    return { cards, total: cards.length };
  }

  function card(c, hidden) {
    const topic = c.topic && c.topic.all ? ` ${fmt(c.topic.n)} of ${fmt(c.topic.all)} citations of this verse in the library are on this topic.` : "";
    const confs = c.confs ? `<div class="tsc-row"><h5 class="tsc-h">Confessions</h5><ul class="tsc-chips">${c.confs.chips.map((x) =>
      `<li><a href="${esc(x.href)}"><b>${esc(x.church)}</b> ${esc(x.title)}${x.label ? `, ${esc(x.label)}` : ""}${x.year ? ` <span>${esc(x.year)}</span>` : ""}</a></li>`).join("")}${c.confs.more ? `<li class="more"><a href="${esc(c.href)}">${fmt(c.confs.more)} more on the Verse Desk</a></li>` : ""}</ul></div>` : "";
    const works = c.works.length ? `<div class="tsc-row"><h5 class="tsc-h">Works</h5><ul class="tsc-works">${c.works.map((w) =>
      `<li><a href="${esc(w.href)}"><i>${esc(w.title)}</i></a> <span>${esc(w.author)}${w.cen ? `, ${ord(w.cen)} century` : ""}, ${plural(w.n, "citation", "citations")}</span></li>`).join("")}</ul></div>` : "";
    return `<li class="tsc-card"${hidden ? " hidden" : ""}><div class="tsc-top"><a class="tsc-ref" href="${esc(c.href)}">${esc(c.ref)}</a><span class="tsc-heat" role="img" aria-label="${esc(`Cited in ${plural(c.articles, "article", "articles")}`)}"><i style="width:${Math.max(4, c.heat)}%"></i></span></div>` +
      `<p class="tsc-count">Cited in ${plural(c.articles, "confession article", "confession articles")}.${esc(topic)}</p>${confs}${works}</li>`;
  }

  function render(model, opt = {}) {
    if (!model.cards.length) return "";
    const open = opt.openAll ? model.cards : model.cards.slice(0, FIRST);
    const rest = opt.openAll ? [] : model.cards.slice(FIRST);
    return `<p class="tsc-lede">The verses the confession articles on this topic cite most, each with the creeds and confessions that cite it and the works the library holds on it. A work is listed because it cites the verse. What it says is in the work.</p>` +
      `<ol class="tsc-grid">${open.map((c) => card(c, false)).join("")}${rest.map((c) => card(c, true)).join("")}</ol>` +
      `${opt.openAll ? `<button type="button" class="fr-dn-open tsc-all" aria-expanded="true" data-tsc-all>Show fewer</button>` : (rest.length || opt.more > 0) ? `<button type="button" class="fr-dn-open tsc-all" aria-expanded="false" data-tsc-all>Show all${opt.more > 0 ? "" : ` ${fmt(model.cards.length)}`}</button>` : ""}`;
  }

  // ── The browser part ─────────────────────────────────────────
  const cache = new Map();
  const S = () => root.MOScriptureDev;
  const getJson = (url) => fetch(url, { credentials: "omit" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const asset = (p) => (root.moAssetUrl ? root.moAssetUrl(p) : p);
  const CF = "/assets/data/faith-received/confession-proofs/";
  let cfIndex = null;
  const loadIndex = () => cfIndex || (cfIndex = getJson(asset(`${CF}index.json`)).then((d) => (d && d.docs && d.chapters ? d : null)));
  const loadChapter = async (b, c) => {
    const idx = await loadIndex();
    if (!idx || !(idx.chapters[b] || []).includes(Number(c))) return null;
    const ch = await getJson(asset(`${CF}${b}/${c}.json`));
    return ch && ch.a && (ch.v || ch.c) ? { index: idx, chapter: ch } : null;
  };

  async function prepare(id, locus) {
    const s = S();
    const M = root.FRVerseDeskModel;
    // Predestination's confession list is cleaned of office elections on the page; its verse counts are not, so it has no Scripture tab.
    if (!s || !M || !M.parts || !locus || id === "de-praedestinatione") return null;
    if (!cache.has(id)) {
      cache.set(id, Promise.all([s.api("/v1/topic/confessions", { id, limit: 1 }), s.api("/v1/topic/scripture", { id, t2: locus.t2, limit: 60 })]).then(([c, t]) => {
        const rows = ((c && c.scripture) || []).filter((r) => (Number(r.n) || 0) > 0);
        return rows.length ? { rows, topicRows: (t && t.rows) || [] } : null;
      }).catch(() => null));
    }
    return cache.get(id);
  }

  async function fill(el, id, prepared) {
    const s = S();
    const M = root.FRVerseDeskModel;
    const books = new Map(s.BOOKS.map((b) => [b.lib, b]));
    const read = (slug, page, href) => s.sourceHref(href || `/read?w=${slug}#b${page}-0`, slug, page);
    const readWork = (w, h) => s.sourceHref(h || `/read?w=${w}`, w);
    const rows = prepared.rows.filter((r) => books.has(r.b) && Number(r.v) > 0).slice(0, MAX);
    const per = new Map();
    const load = (list) => Promise.all(list.map(async (r) => {
      const book = books.get(r.b);
      const [cf, v] = await Promise.all([loadChapter(r.b, r.c), s.api("/v1/verse", { b: book.lib, c: r.c, v: r.v, limit: 1 }).catch(() => null)]);
      per.set(`${r.b}.${r.c}.${r.v}`, { cf, works: (v && v.top_works) || [] });
    }));
    const draw = (list, openAll) => {
      const model = build({ rows: list, topicRows: prepared.topicRows, books, confessModel: M.parts.confessModel, read, readWork, per });
      el.innerHTML = render(model, { openAll, more: rows.length - list.length }) || `<p class="sd-muted">No verse has a creed, confession, or work listed for it yet.</p>`;
      return model;
    };
    // The first dozen load at once; the rest load when "Show all" is pressed, so a topic costs about sixteen requests, not sixty.
    await load(rows.slice(0, FIRST + 4));
    if (!el.isConnected) return;
    draw(rows.slice(0, FIRST + 4), false);
    el.addEventListener("click", async (e) => {
      const all = e.target.closest("[data-tsc-all]");
      if (!all) return;
      const open = all.getAttribute("aria-expanded") !== "true";
      if (open && rows.length > FIRST + 4 && !per.has(`${rows[rows.length - 1].b}.${rows[rows.length - 1].c}.${rows[rows.length - 1].v}`)) {
        all.disabled = true;
        await load(rows.slice(FIRST + 4));
        draw(rows, true);
        el.querySelector("[data-tsc-all]").focus();
        return;
      }
      all.setAttribute("aria-expanded", String(open));
      el.querySelectorAll(".tsc-card").forEach((li, i) => { if (i >= FIRST) li.hidden = !open; });
      all.textContent = open ? "Show fewer" : `Show all ${el.querySelectorAll(".tsc-card").length}`;
    });
  }

  return { build, render, prepare, fill, FIRST, MAX };
}));
