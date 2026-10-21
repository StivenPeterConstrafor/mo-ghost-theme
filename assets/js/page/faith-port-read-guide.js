/* The Research rail's Work tab: the work's sections, the same ones the work page shows (author/#w/<slug>), in the same order
 * and under the same names (owner 2026-10-06: "research rail and work page should cohere deeply").
 *
 * The section list and the guide renderers live in work-hub.js (FRWorkHub). The guide comes from v1/enrich/works/<slug>.json:
 * what the library has worked out from the work's own pages (an overview and where to start, the argument, a note per section,
 * a subject index, quotations kept only where they match the page word for word). Scripture, topics, positions, sources cited,
 * names and the historical index follow from work-research-sources.js in #nbWorkSources. Each fold ends in a link to its tab on
 * the work page.
 *
 * THE PAGE FIRST (2026-10-20, rail critique, owner "fix it all"): the tab opens on the page in view, named as the reader names it
 * ("On p. 20", "On col. 123"): what the work's own index records there, the sources it cites and its later readers, each
 * counted in its heading and open when it has something; the whole work's sections follow, folded. A fold the reader opens or
 * closes stays so on the next visit (fr_rail_folds), and nothing is drawn while the rail is shut.
 *
 * A page number in a fold turns the reader to that page in place. A work without notes shows only the folds it has.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const panel = $("nbWorkPanel");
  const rail = $("notebook");
  if (!rail || !panel) return;

  const slug = new URLSearchParams(location.search).get("w");
  if (!slug) return;
  const HUB = window.FRWorkHub;
  const BASE = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const READ = "/the-faith-received/read/?w=";
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const here = (page) => `${READ}${encodeURIComponent(slug)}#b${encodeURIComponent(page)}-0`;
  const there = (w, page) => `${READ}${encodeURIComponent(w)}#b${encodeURIComponent(page)}-0`;
  const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const deskHref = (id) => (HUB ? HUB.deskHref(slug, id) : `/the-faith-received/author/#w/${encodeURIComponent(slug)}`);

  // A page in this work opens in place, through the reader's own navigation, so the rail closes on a phone and stays docked
  // on a desk.
  function go(page) {
    const url = here(page);
    if (window.FRReaderResearch && window.FRReaderResearch.navigate(url)) return;
    location.assign(url);
  }

  // The page as the reader names it in its header ("p. 20", "col. 123", "fol. 12r").
  function where(page) {
    try { if (typeof window.locOf === "function") { const s = window.locOf(page); if (s) return String(s); } } catch (_) { /* the reader's own label is optional */ }
    return `p. ${page}`;
  }
  // A Migne page is a spread of two columns; what is on it sits under either.
  const keysOf = (page) => {
    const n = Number(page);
    return Number.isFinite(n) && /^p[gl]d?-/.test(slug) ? [String(n), String(n + 1)] : [String(page)];
  };

  // Folds the reader has opened or closed keep that state from visit to visit; a fold never touched takes its default.
  const KEPT = "fr_rail_folds";
  const kept = (() => { try { return JSON.parse(localStorage.getItem(KEPT) || "{}") || {}; } catch (_) { return {}; } })();
  function remember(d, id) {
    const s = d.querySelector(":scope > summary");
    if (!s) return;
    s.addEventListener("click", () => setTimeout(() => {
      kept[id] = d.open;
      try { localStorage.setItem(KEPT, JSON.stringify(kept)); } catch (_) { /* private windows keep nothing */ }
    }, 0));
  }

  // The rail draws only while it is open; work asked for while it is shut waits for it.
  const railOpen = () => rail.classList.contains("open");
  const waiting = new Set();
  function whenOpen(fn) { if (railOpen()) fn(); else waiting.add(fn); }
  new MutationObserver(() => {
    if (!railOpen()) return;
    const fns = [...waiting];
    waiting.clear();
    fns.forEach((fn) => fn());
    sync(true);
  }).observe(rail, { attributes: true, attributeFilter: ["class"] });

  // The same fold the sources below use (.wrs-section), so the tab reads as one list. A count of null shows none.
  function fold(id, title, body, open, n) {
    const d = document.createElement("details");
    d.className = "wrs-section wh-fold";
    d.dataset.sec = id;
    if (id in kept ? kept[id] : open) d.open = true;
    // each page fold opens the work page on the tab that holds its whole-work list
    const desk = id === "cited" ? "" : id === "later-page" ? "citedby" : id === "in-index" || /^index-/.test(id) ? "index" : id;
    d.innerHTML = `<summary><span class="wh-sum">${esc(title)}</span>${n == null ? "" : `<span class="wh-count">${Number(n).toLocaleString()}</span>`}</summary><div class="wrs-section-body">${body}${desk ? `<a class="wrs-link wh-desk" href="${esc(deskHref(desk))}">${desk === "citedby" && id === "later-page" ? "Every later citation of this work" : "Open on the work page"}</a>` : ""}</div>`;
    remember(d, id);
    return d;
  }
  // An empty page fold stays shut and quiet; one with something in it opens as the reader last left it.
  function setCount(d, n, id) {
    const c = d.querySelector(":scope > summary .wh-count");
    if (c) c.textContent = Number(n).toLocaleString();
    d.classList.toggle("wh-zero", !n);
    const open = !!n && (id in kept ? kept[id] : true);
    if (d.open !== open) d.open = open;
  }

  // The page in view, as the reader's header names it (#reader-location carries its page); before the header has named one, the
  // first rendered folio whose foot is below the toolbar.
  function pageInView() {
    const named = $("reader-location");
    if (named && named.dataset.page) return String(named.dataset.page);
    const folios = document.querySelectorAll("#reading .folio[data-page]");
    for (const f of folios) {
      const r = f.getBoundingClientRect();
      if (r.bottom > 96) return String(f.dataset.page);
    }
    return null;
  }

  // The catalogue names the cited works; it is fetched the first time a list needs a name (the reader's own search has usually
  // cached it by then).
  let catalogue = null;
  const works = () => catalogue || (catalogue = getJSON(`${BASE}/v1/works-index.json`).then((d) => {
    const m = {};
    ((d && d.works) || []).forEach((w) => { m[w.slug] = w; });
    return m;
  }));

  // A page's list shows its first rows; the rest open in place.
  const more = (n) => `<button type="button" class="wh-ixmore wh-pall">Show all ${Number(n).toLocaleString()}</button>`;

  // IN THE INDEX, the page in view: the work's own index turned round, page by page (v1/enrich/index, FRWorkHub.parts). An entry
  // opens the whole work's Index on its part, found, so the reader goes from this page to every page of the subject.
  const KINDS = [["subjects", "Subjects", (e) => (e.sub ? `${e.heading}, ${e.sub}` : e.heading)], ["persons", "Persons", (e) => e.name],
    ["scripture", "Scripture", (e) => e.ref], ["terms", "Terms", (e) => e.term], ["questions", "Questions", (e) => e.q]];
  const bare = (p) => String(p).replace(/^0+(?=\d)/, "");
  function indexFold(data) {
    const P = data && HUB.parts ? HUB.parts(data) : null;
    if (!P || !KINDS.some(([k]) => (P[k] || []).length)) return null;
    let byPage = null;
    function build() {
      byPage = new Map();
      for (const [k, , name] of KINDS) for (const e of P[k] || []) {
        const n = String(name(e) || "").trim();
        if (!n) continue;
        for (const p of k === "questions" ? [e.page] : (e.pages || [])) {
          const key = bare(p);
          if (!byPage.has(key)) byPage.set(key, []);
          byPage.get(key).push([k, n]);
        }
      }
    }
    const at = (page) => {
      if (!byPage) build();
      const seen = new Set();
      return keysOf(page).flatMap((k) => byPage.get(bare(k)) || []).filter((r) => { const id = r.join("|"); if (seen.has(id)) return false; seen.add(id); return true; });
    };
    const d = fold("in-index", "In the index", `<div class="nb-guide-index"></div>`, true, 0);
    const box = d.querySelector(".nb-guide-index");
    const FIRST = 6;
    // the kinds opened in full, for the page they were opened on
    let shown = null, wide = new Set(), widePage = null;
    function draw(page) {
      if (!page || !d.open || !railOpen() || page === shown) return;
      if (page !== widePage) { wide = new Set(); widePage = page; }
      shown = page;
      const rows = at(page);
      if (!rows.length) { box.innerHTML = `<p class="wrs-note">Nothing on ${esc(where(page))} is in the index.</p>`; return; }
      box.innerHTML = `<dl class="wh-pix">${KINDS.map(([k, label]) => {
        const names = rows.filter((r) => r[0] === k).map((r) => r[1]);
        if (!names.length) return "";
        const cut = wide.has(k) ? names : names.slice(0, FIRST);
        return `<dt>${label}</dt><dd>${cut.map((n) => `<button type="button" class="wh-pix-e" data-part="${k}" data-q="${esc(n)}">${esc(n)}</button>`).join("")}${cut.length < names.length ? `<button type="button" class="wh-pix-more" data-k="${k}">${(names.length - cut.length).toLocaleString()} more</button>` : ""}</dd>`;
      }).join("")}</dl>`;
    }
    box.addEventListener("click", (e) => {
      const all = e.target.closest(".wh-pix-more");
      if (all) { wide.add(all.dataset.k); const p = shown; shown = null; draw(p); return; }
      const b = e.target.closest(".wh-pix-e");
      if (b) openIndex(b.dataset.part, b.dataset.q);
    });
    d.addEventListener("toggle", () => { if (d.open) { shown = null; draw(page); } });
    return { id: "in-index", el: d, count: (p) => at(p).length, draw, reset() { shown = null; } };
  }
  // The whole work's Index, open on a part and found to an entry.
  const fills = {};
  function openIndex(part, q) {
    const f = panel.querySelector(`#nbWorkGuide [data-sec="index-${part}"]`) || panel.querySelector('#nbWorkGuide [data-sec="index"]');
    if (!f) return;
    f.open = true;
    if (fills[f.dataset.sec]) fills[f.dataset.sec]();
    const tab = f.querySelector(`.wh-parts [data-part="${part}"]`);
    if (tab) tab.click();
    const box = f.querySelector(`.wh-part[data-part="${part}"] .wh-filter input`);
    if (box) { box.value = q; box.dispatchEvent(new Event("input", { bubbles: true })); }
    f.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  // SOURCES CITED, the page in view: the pages elsewhere in the library this page cites (v1/enrich/cites).
  function citedFold(cites) {
    if (!cites || !(cites.pages || cites.names)) return null;
    cites.pages = cites.pages || {};
    const d = fold("cited", "Sources cited", `<div class="nb-guide-cited"></div>`, true, 0);
    const box = d.querySelector(".nb-guide-cited");
    // the page's citations, one row per cited place (a work named twice without a page counts once)
    // the page's citations placed on their page, then (from "names") the works it cites whose page is not yet found, each once
    const at = (page) => {
      const seen = new Set(), keys = keysOf(page);
      const rows = keys.flatMap((k) => cites.pages[k] || []).concat(keys.flatMap((k) => ((cites.names || {})[k] || []).map((w) => ({ w }))));
      return rows.filter((c) => { const id = `${c.w}|${c.p || ""}`; return !seen.has(id) && seen.add(id); });
    };
    const FIRST = 8;
    let shown = null, all = false;
    async function draw(page) {
      if (!page || !d.open || !railOpen() || page === shown) return;
      shown = page;
      const list = at(page);
      if (!list.length) { box.innerHTML = `<p class="wrs-note">No linked citations on ${esc(where(page))}.</p>`; return; }
      const names = await works();
      if (shown !== page) return;
      const named = (c) => { const w = names[c.w]; return w ? [w.author, w.title].filter(Boolean).join(", ") : c.w; };
      // a citation placed on its page is a row; one that names only the work (its page not yet found) joins one line under them
      const paged = list.filter((c) => c.p), seen = new Set(), bare = list.filter((c) => !c.p && !seen.has(c.w) && seen.add(c.w));
      const cut = all ? paged : paged.slice(0, FIRST);
      box.innerHTML = `${paged.length ? `<ul class="wh-cited">${cut.map((c) =>
        `<li><a href="${there(c.w, c.p)}" target="_blank" rel="noopener">${esc(named(c))}, p. ${esc(c.p)}</a>${c.how ? ` <span class="wh-how">${esc(c.how)}</span>` : ""}${c.loc ? `<span>${esc(c.loc)}</span>` : ""}</li>`).join("")}</ul>${cut.length < paged.length ? more(paged.length) : ""}` : ""}${bare.length
        ? `<p class="wh-also">${paged.length ? "Also names" : "Names"} ${bare.map((c) => `<a href="${READ}${encodeURIComponent(c.w)}" target="_blank" rel="noopener">${esc(named(c))}</a>`).join(" · ")}</p>` : ""}`;
    }
    box.addEventListener("click", (e) => { if (e.target.closest(".wh-pall")) { all = true; const p = shown; shown = null; draw(p); } });
    d.addEventListener("toggle", () => { if (d.open) { shown = null; draw(page); } });
    return { id: "cited", el: d, count: (p) => at(p).length, draw, reset() { shown = null; all = false; } };
  }

  // LATER READERS, the page in view: the later pages in the library that cite it (v1/enrich/citedby, FRWorkHub.citedBy).
  function laterFold(data) {
    if (!data) return null;
    const d = fold("later-page", "Later readers", `<div class="nb-guide-later"></div>`, true, 0);
    const box = d.querySelector(".nb-guide-later");
    const at = (page) => keysOf(page).flatMap((k) => data.pages[k] || data.pages[String(Number(k))] || []);
    const FIRST = 6, MOST = 60;
    let shown = null, all = false;
    async function draw(page) {
      if (!page || !d.open || !railOpen() || page === shown) return;
      shown = page;
      const rows = at(page);
      if (!rows.length) { box.innerHTML = `<p class="wrs-note">No later page in the library cites ${esc(where(page))}.</p>`; return; }
      const cat = await HUB.names();
      if (shown !== page) return;
      const cut = rows.slice(0, all ? MOST : FIRST);
      box.innerHTML = `<p class="wrs-note">Oldest first.</p><ul class="wh-citers">${cut.map((r) => HUB.citerRow(cat || {}, r, { newTab: true })).join("")}</ul>${cut.length < Math.min(rows.length, MOST) ? more(rows.length) : ""}${all && rows.length > MOST ? `<p class="wrs-note">and ${(rows.length - MOST).toLocaleString()} more on the work page.</p>` : ""}`;
    }
    box.addEventListener("click", (e) => { if (e.target.closest(".wh-pall")) { all = true; const p = shown; shown = null; draw(p); } });
    d.addEventListener("toggle", () => { if (d.open) { shown = null; draw(page); } });
    return { id: "later-page", el: d, count: (p) => at(p).length, draw, reset() { shown = null; all = false; } };
  }

  // The work's first door is its page, where the same sections sit under one tab strip. "Search this work" left the list
  // (the Search tab beside Work is that search).
  function door() {
    const list = panel.querySelector(".nb-work-primary");
    if (!list || $("nbWorkDesk")) return;
    const a = document.createElement("a");
    a.id = "nbWorkDesk";
    a.className = "nb-work-desk";
    a.href = deskHref("");
    a.textContent = "Work page";
    list.insertBefore(a, list.firstChild);
  }

  // Two groups under the work's card, each under a heading that says what it holds: the page in view (its sources, its later
  // readers, the analysis extracted from it), then the whole work's sections in the work page's order. The analysis fold is
  // the tab's own (#nbAnalysisFold, filled by work-research.js); it moves up beside the page's other folds.
  const group = (text) => {
    const h = document.createElement("h3");
    h.className = "wh-group";
    h.textContent = text;
    return h;
  };

  // The page folds and their heading follow the page in view: its name, its counts, and (while the rail is open) its lists.
  let page = null, head = null;
  const pageFolds = [];
  function sync(force) {
    const p = pageInView();
    if (!p || (p === page && !force)) return;
    page = p;
    if (head) head.textContent = `On ${where(p)}`;
    for (const f of pageFolds) {
      setCount(f.el, f.count(p), f.id);
      if (force) f.reset();
      f.draw(p);
    }
    window.dispatchEvent(new CustomEvent("fr-rail-page", { detail: { page: p, label: where(p) } }));
  }
  let t = 0;
  const soon = () => { clearTimeout(t); t = setTimeout(() => sync(false), 200); };
  // the reader scrolls its own column (#scroll), so the page is watched in the capture phase
  document.addEventListener("scroll", soon, { passive: true, capture: true });
  window.addEventListener("fr-reader-navigation", () => setTimeout(() => sync(true), 300));
  const named = $("reader-location");
  if (named) new MutationObserver(soon).observe(named, { attributes: true, attributeFilter: ["data-page"], childList: true, characterData: true, subtree: true });

  async function mount() {
    door();
    if (!HUB) return;
    const [data, cites, later] = await Promise.all([HUB.guide(slug), getJSON(`${BASE}/v1/enrich/cites/${encodeURIComponent(slug)}.json`), HUB.citedBy ? HUB.citedBy(slug) : null]);
    const c = HUB.counts(data);
    const guide = document.createElement("div");
    guide.id = "nbWorkGuide";
    guide.className = "wrs nb-work-guide";
    head = group("On this page");
    head.classList.add("wh-group-page");
    guide.appendChild(head);
    for (const f of [indexFold(data), citedFold(cites), laterFold(later)]) {
      if (!f) continue;
      pageFolds.push(f);
      guide.appendChild(f.el);
    }
    const analysis = $("nbAnalysisFold");
    if (analysis) {
      const s = analysis.querySelector(":scope > summary");
      if (s) s.textContent = "What it argues";
      analysis.classList.add("wrs-section");
      if (kept.analysis) analysis.open = true;
      remember(analysis, "analysis");
      // what the page argues sits under what the page indexes, before what it cites and who cites it
      const ix = pageFolds.length && pageFolds[0].id === "in-index" ? pageFolds[0].el : null;
      if (ix) ix.after(analysis); else guide.appendChild(analysis);
    }
    guide.appendChild(group("The whole work"));
    // the whole work: what it is (overview, argument, sections, quotations), then finding things in it (the index), then the
    // library around it (positions by topic and sources cited, from work-research-sources.js, then later readers, last)
    const ORDER = ["overview", "argument", "sections", "quotes", "index"].filter((id) => HUB.GUIDE.includes(id));
    // a fold built the first time it is opened, with the rail open (the indexes are long)
    const lazyFold = (id, title, n, render) => {
      const f = fold(id, title, `<div class="wh-lazy"></div>`, false, n > 1 ? n : null);
      guide.appendChild(f);
      const fill = () => {
        const host = f.querySelector(".wh-lazy");
        if (!f.open || !host || host.dataset.done) return;
        host.dataset.done = "1";
        host.innerHTML = render();
      };
      fills[id] = fill;
      f.addEventListener("toggle", () => whenOpen(fill));
      if (f.open) whenOpen(fill);
      return f;
    };
    /* THE INDEXES, EACH NAMED (2026-10-21, owner: "the rail should have Subject Index, Scripture Index, Topic Index (index explicit)"):
     * the made index's parts are folds of their own, each with its count: Subject index and Scripture index first, then the Topic
     * index (the positions by topic from work-research-sources.js, moved up to sit with them below), the persons, the terms defined
     * and the questions asked. A work whose index is only a subject list keeps the one fold. */
    const INDEXES = [["subjects", "Subject index"], ["scripture", "Scripture index"], ["persons", "Index of persons"], ["terms", "Terms defined"], ["questions", "Questions asked"]];
    if (data) ORDER.forEach((id) => {
      if (!c[id]) return;
      if (id !== "index") { guide.appendChild(fold(id, HUB.label(id), HUB.render(id, data, { compact: true }), false, c[id] > 1 ? c[id] : null)); return; }
      if (!data.full || !HUB.partList) { lazyFold("index", "Subject index", c.index, () => HUB.render("index", data, { compact: true })); return; }
      for (const [k, title] of INDEXES) {
        const n = HUB.partList(data, k).length;
        if (n) lazyFold(`index-${k}`, title, n, () => HUB.render("index", data, { compact: true, part: k }));
      }
    });
    // the Topic index keeps its own loader in work-research-sources.js, which mounts when the rail opens; it moves up to follow
    // the Scripture index as soon as it exists
    const lastIndex = guide.querySelector('[data-sec="index-scripture"]') || guide.querySelector('[data-sec="index-subjects"]') || guide.querySelector('[data-sec="index"]');
    const sources = $("nbWorkSources");
    if (lastIndex && sources) {
      const place = () => { const t = sources.querySelector('details[data-sec="topics"]'); if (t) lastIndex.after(t); return !!t; };
      if (!place()) { const mo = new MutationObserver(() => { if (place()) mo.disconnect(); }); mo.observe(sources, { childList: true, subtree: true }); }
    }
    // the whole work's most-cited pages, after the quotations, as on the work page
    if (later) {
      const f = fold("citedby", HUB.label("citedby"), `<div class="nb-later-work"></div>`, false, later.n);
      guide.appendChild(f);
      const fill = async () => {
        const host = f.querySelector(".nb-later-work");
        if (!f.open || host.dataset.done) return;
        host.dataset.done = "1";
        HUB.mountLater(host, later, (await HUB.names()) || {}, { compact: true });
      };
      f.addEventListener("toggle", () => whenOpen(fill));
      if (f.open) whenOpen(fill);
    }
    HUB.wire(guide, (p) => go(p));
    const anchor = $("nbWorkSources");
    if (anchor) panel.insertBefore(guide, anchor); else panel.appendChild(guide);
    // later readers close the whole work, after the sources it cites
    const laterWork = guide.querySelector(':scope > details[data-sec="citedby"]');
    if (laterWork && anchor && anchor.parentNode === panel) {
      const tail = document.createElement("div");
      tail.className = "wrs nb-work-tail";
      tail.appendChild(laterWork);
      panel.insertBefore(tail, anchor.nextSibling);
    }
    // The library notes are machine-written: said once, in a Methodology dropdown at the foot of the tab's sections.
    if (data && !$("nbWorkNote")) {
      const note = document.createElement("div");
      note.id = "nbWorkNote";
      note.className = "wrs-note wh-note";
      note.innerHTML = HUB.noteHtml ? HUB.noteHtml() : "";
      if (!note.innerHTML) note.textContent = HUB.NOTE;
      const after = panel.querySelector(":scope > .nb-work-tail") || $("nbWorkSources");
      if (after && after.parentNode === panel) panel.insertBefore(note, after.nextSibling); else guide.appendChild(note);
    }
    sync(true);
  }

  // After the reader has named the work, so the tab's own controls come first.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
