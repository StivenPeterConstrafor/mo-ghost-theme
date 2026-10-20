/*
 * /the-faith-received/resources/ (2026-10-20): the Resources page, browser side.
 *
 * One tablist, one tab today (Articles). More tabs are added to the markup and need only a panel with the same
 * data-k; this file moves between whatever tabs are there (click, arrows, Home, End, #<key>).
 *
 * The Articles tab searches the Mere Orthodoxy essays that serve the library (MOArticles, assets/js/lib/mo-articles.js)
 * as you type, filters by kind, sorts, and shows 25 at a time. The address keeps ?q=, ?kind= and ?sort= (replaceState,
 * so Back leaves the page) and #articles; nothing else is stored anywhere.
 *
 * If the data does not load the page says so and offers a retry. Titles open the original on mereorthodoxy.com in a
 * new tab. All text from the data goes through esc() before it is written.
 */
(function () {
  "use strict";

  const M = window.MOArticles;
  const root = document.querySelector("[data-res-root]");
  if (!M || !root) return;

  const PAGE = 25;
  const $ = (id) => document.getElementById(id);
  const $q = $("resQuery"), $clear = $("resClear"), $form = $("resForm"), $kinds = $("resKinds"), $sort = $("resSort");
  const $count = $("resCount"), $results = $("resResults"), $more = $("resMore"), $moreBtn = $("resMoreBtn");
  const $empty = $("resEmpty"), $reset = $("resReset");
  if (!$q || !$clear || !$form || !$kinds || !$sort || !$count || !$results || !$more || !$moreBtn || !$empty || !$reset) return;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;

  /* ── tabs ─────────────────────────────────────────────────────── */
  const tabs = () => Array.prototype.slice.call(root.querySelectorAll("[data-res-tabs] [role=tab]"));
  const panelFor = (tab) => $(tab.getAttribute("aria-controls"));
  function activate(key, focus) {
    const list = tabs();
    const on = list.find((t) => t.dataset.k === key) || list[0];
    if (!on) return;
    list.forEach((t) => {
      const sel = t === on;
      t.setAttribute("aria-selected", sel ? "true" : "false");
      t.tabIndex = sel ? 0 : -1;
      const p = panelFor(t);
      if (p) p.hidden = !sel;
    });
    if (focus) on.focus();
  }
  root.querySelector("[data-res-tabs]").addEventListener("click", (e) => {
    const t = e.target.closest("[role=tab]");
    if (t) { activate(t.dataset.k, false); writeUrl(); }
  });
  root.querySelector("[data-res-tabs]").addEventListener("keydown", (e) => {
    const list = tabs();
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowRight: (i + 1) % list.length, ArrowLeft: (i + list.length - 1) % list.length, Home: 0, End: list.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    activate(list[to].dataset.k, true);
    writeUrl();
  });

  /* ── links to the library's own pages ─────────────────────────── */
  const SD = () => window.MOScriptureDev;
  const foldName = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const shortTitle = (s) => String(s || "").replace(/\s*\([^)]*\)\s*$/, "");

  function verseParts(key) {
    const m = /^([a-z0-9-]+)\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/.exec(key);
    return m ? { book: m[1], c: m[2], a: m[3] || "", b: m[4] || "" } : null;
  }
  function verseLabel(key) {
    const v = verseParts(key);
    if (!v) return key;
    const sd = SD();
    const book = sd && sd.BOOK_BY_SLUG && sd.BOOK_BY_SLUG.get(v.book);
    const name = book ? (book.slug === "psalms" ? "Psalm" : book.name) : v.book;
    return `${name} ${v.c}${v.a ? `:${v.a}${v.b ? `-${v.b}` : ""}` : ""}`;
  }
  function serveHref(e) {
    if (e.type === "doc" || e.type === "work") return `/the-faith-received/read/?w=${enc(e.key)}`;
    if (e.type === "author") return `/the-faith-received/author/?a=${enc(foldName(e.key))}`;
    if (e.type === "topic") return `/the-faith-received/topics/?t=${enc(e.key)}`;
    const v = verseParts(e.key);
    return v ? `/the-faith-received/scripture/desk/?ref=${v.book}.${v.c}${v.a ? `.${v.a}` : ""}` : "";
  }
  const TYPE_ORDER = ["doc", "work", "author", "topic", "verse"];
  // Up to three, one of each kind first so the line shows range, then whatever is left in order.
  function serves(a) {
    const all = M.entities(a);
    const picked = [];
    for (const t of TYPE_ORDER) {
      const e = all.find((x) => x.type === t);
      if (e && picked.length < 3) picked.push(e);
    }
    for (const e of all) if (picked.length < 3 && !picked.includes(e)) picked.push(e);
    picked.sort((x, y) => TYPE_ORDER.indexOf(x.type) - TYPE_ORDER.indexOf(y.type));
    return picked.map((e) => {
      const label = e.type === "verse" ? verseLabel(e.key) : e.type === "work" ? shortTitle(e.label) : e.label;
      const href = serveHref(e);
      return href ? `<a href="${esc(href)}">${esc(label)}</a>` : esc(label);
    });
  }

  /* ── highlighting: fold as the search does, mark the original text ─ */
  function highlight(text, ts) {
    const src = String(text || "");
    if (!ts.length) return esc(src);
    let folded = "";
    const at = [];
    for (let i = 0; i < src.length; i++) {
      const f = src[i].normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      for (let j = 0; j < f.length; j++) at.push(i);
      folded += f;
    }
    const last = ts[ts.length - 1];
    const spans = [];
    const re = /[a-z0-9]+/g;
    let m;
    while ((m = re.exec(folded))) {
      const w = m[0];
      if (ts.includes(w) || w.startsWith(last)) spans.push([at[m.index], at[m.index + w.length - 1] + 1]);
    }
    let out = "";
    let pos = 0;
    for (const [s, e] of spans) {
      if (s < pos) continue;
      out += `${esc(src.slice(pos, s))}<mark>${esc(src.slice(s, e))}</mark>`;
      pos = e;
    }
    return `${out}${esc(src.slice(pos))}`;
  }

  /* ── state and address ────────────────────────────────────────── */
  const state = { q: "", kind: "", sort: "match", shown: PAGE };
  const KIND_KEYS = ["doc", "work", "retrieval", "topic"];
  function readUrl() {
    const p = new URLSearchParams(window.location.search);
    state.q = (p.get("q") || "").slice(0, 200);
    state.kind = KIND_KEYS.includes(p.get("kind")) ? p.get("kind") : "";
    state.sort = ["new", "old"].includes(p.get("sort")) ? p.get("sort") : "match";
    $q.value = state.q;
    const key = window.location.hash.replace(/^#/, "");
    activate(key, false);
  }
  function writeUrl() {
    const p = new URLSearchParams();
    if (state.q.trim()) p.set("q", state.q.trim());
    if (state.kind) p.set("kind", state.kind);
    if (state.sort !== "match") p.set("sort", state.sort);
    const active = tabs().find((t) => t.getAttribute("aria-selected") === "true");
    const qs = p.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}#${active ? active.dataset.k : "articles"}`;
    try { window.history.replaceState(null, "", url); } catch (e) { /* a sandboxed frame; the page still works */ }
  }

  /* ── drawing ──────────────────────────────────────────────────── */
  const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const niceDate = (d) => { const t = new Date(`${d}T00:00:00Z`); return Number.isNaN(t.getTime()) ? d : dateFmt.format(t); };
  const plural = (n, one, many) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

  function row(a, ts) {
    const s = serves(a);
    const sep = '<span class="fr-res-sep" aria-hidden="true">, </span>';
    return [
      '<li class="fr-res-item">',
      `<p class="fr-res-title"><a href="${esc(a.u)}" target="_blank" rel="noopener">${highlight(a.t, ts)}<span class="fr-res-sr"> (opens in a new tab)</span></a></p>`,
      `<p class="fr-res-meta">${highlight(a.a, ts)} <span aria-hidden="true">&middot;</span> <time datetime="${esc(a.d)}">${esc(niceDate(a.d))}</time></p>`,
      a.x ? `<p class="fr-res-x">${highlight(a.x, ts)}</p>` : "",
      s.length ? `<p class="fr-res-serves"><span>Serves:</span> ${s.join(sep)}</p>` : "",
      "</li>",
    ].join("");
  }

  const GROUPS = [["retrieval", "Theological retrieval"], ["doc", "Creeds and confessions"], ["work", "Works and authors"], ["topic", "Doctrine and Scripture"]];

  function results() {
    const base = M.search(state.q, { kind: state.kind || undefined });
    const q = state.q.trim();
    let list = base;
    if (state.sort === "new" || (state.sort === "match" && !q)) list = base.slice().sort((x, y) => (x.d < y.d ? 1 : x.d > y.d ? -1 : 0));
    else if (state.sort === "old") list = base.slice().sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0));
    // No search and no filter: every article, grouped by kind, so "Show more" pages through the groups in their order.
    if (!q && !state.kind) list = [].concat(...GROUPS.map(([k]) => list.filter((a) => a.k === k)));
    return list;
  }

  let lastShown = 0;
  function render(focusNew) {
    const q = state.q.trim();
    const ts = M.terms(q);
    const list = results();
    const total = list.length;
    const grouped = !q && !state.kind;
    const shown = list.slice(0, state.shown);
    let html = "";
    if (grouped) {
      for (const [k, label] of GROUPS) {
        const part = shown.filter((a) => a.k === k);
        if (!part.length) continue;
        const of = list.filter((a) => a.k === k).length;
        html += `<section class="fr-res-section" aria-labelledby="res-g-${k}"><h3 class="fr-res-h" id="res-g-${k}">${esc(label)} <span class="fr-res-n">${of.toLocaleString("en-US")}</span></h3><ul class="fr-res-list">${part.map((a) => row(a, ts)).join("")}</ul></section>`;
      }
    } else {
      html = `<ul class="fr-res-list">${shown.map((a) => row(a, ts)).join("")}</ul>`;
    }
    $results.innerHTML = total ? html : "";
    $empty.hidden = total > 0;
    $count.textContent = plural(total, "article", "articles");
    const left = total - shown.length;
    $more.hidden = left <= 0;
    if (left > 0) $moreBtn.textContent = `Show ${Math.min(PAGE, left)} more`;
    $clear.hidden = !$q.value;
    if (focusNew && shown.length > lastShown) {
      const links = $results.querySelectorAll(".fr-res-title a");
      const target = links[lastShown];
      if (target) target.focus();
    }
    lastShown = shown.length;
  }

  function paintControls() {
    $kinds.innerHTML = [["", "All"]].concat(M.kinds().map((k) => [k.k, k.label]))
      .map(([k, label]) => `<button type="button" class="fr-res-opt" data-kind="${esc(k)}" aria-pressed="${state.kind === k ? "true" : "false"}">${esc(label)}</button>`).join("");
    Array.prototype.forEach.call($sort.querySelectorAll("[data-sort]"), (b) => b.setAttribute("aria-pressed", b.dataset.sort === state.sort ? "true" : "false"));
  }

  function update() {
    state.shown = PAGE;
    lastShown = 0;
    paintControls();
    render(false);
    writeUrl();
  }

  /* ── events ───────────────────────────────────────────────────── */
  let timer = 0;
  $q.addEventListener("input", () => {
    $clear.hidden = !$q.value;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { state.q = $q.value; update(); }, 120);
  });
  $q.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $q.value) { e.preventDefault(); $q.value = ""; window.clearTimeout(timer); state.q = ""; update(); }
  });
  $form.addEventListener("submit", (e) => e.preventDefault());
  $clear.addEventListener("click", () => { $q.value = ""; window.clearTimeout(timer); state.q = ""; update(); $q.focus(); });
  $kinds.addEventListener("click", (e) => {
    const b = e.target.closest("[data-kind]");
    if (!b) return;
    state.kind = b.dataset.kind;
    update();
    const again = $kinds.querySelector(`[data-kind="${state.kind}"]`);
    if (again) again.focus();
  });
  $sort.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    state.sort = b.dataset.sort;
    update();
    const again = $sort.querySelector(`[data-sort="${state.sort}"]`);
    if (again) again.focus();
  });
  $moreBtn.addEventListener("click", () => {
    state.shown += PAGE;
    render(true);
  });
  $reset.addEventListener("click", () => {
    $q.value = "";
    window.clearTimeout(timer);
    state.q = "";
    state.kind = "";
    state.sort = "match";
    update();
    $q.focus();
  });
  window.addEventListener("hashchange", () => activate(window.location.hash.replace(/^#/, ""), false));

  /* ── start ────────────────────────────────────────────────────── */
  function start() {
    $count.textContent = "Loading the articles…";
    M.load().then((data) => {
      if (!data) {
        $count.innerHTML = 'The articles did not load. <button type="button" class="fr-res-link" id="resRetry">Try again</button>';
        const retry = $("resRetry");
        if (retry) retry.addEventListener("click", start);
        return;
      }
      paintControls();
      render(false);
    });
  }
  readUrl();
  paintControls();
  start();
})();
