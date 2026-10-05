/* The Research rail's Work tab: a guide to the work, from the library's notes.
 *
 * v1/enrich/works/<slug>.json on the library worker carries, per work, what the
 * library has worked out from the work's own pages: where a newcomer should
 * start, the argument (main theses, how each is argued, objections and their
 * answers, distinctions), a one-line note on what each section does, a
 * back-of-book subject index, and memorable lines kept only where they match
 * the page word for word.
 * v1/enrich/cites/<slug>.json maps each page to the pages of other works it
 * cites. All of it is machine-written from the text, and every page reference
 * was checked against the work before it was published.
 *
 * Folds in the Work tab, styled as the tab's own "Summaries and analysis"
 * fold. Nothing else in the reader changes, and a work without notes shows
 * nothing: the fetch fails quietly and the tab is as it was.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const panel = $("nbWorkPanel");
  if (!$("notebook") || !panel) return;

  const slug = new URLSearchParams(location.search).get("w");
  if (!slug) return;
  const BASE = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const READ = "/the-faith-received/read/?w=";
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const here = (page) => `${READ}${encodeURIComponent(slug)}#b${encodeURIComponent(page)}-0`;
  const there = (w, page) => `${READ}${encodeURIComponent(w)}#b${encodeURIComponent(page)}-0`;
  const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  // A page in this work opens in place, through the reader's own navigation,
  // so the rail closes on a phone and stays docked on a desk.
  function go(page) {
    const url = here(page);
    if (window.FRReaderResearch && window.FRReaderResearch.navigate(url)) return;
    location.assign(url);
  }

  function fold(title, body, open) {
    const d = document.createElement("details");
    d.className = "nb-analysis-fold nb-guide-fold";
    if (open) d.open = true;
    d.innerHTML = `<summary>${esc(title)}</summary><div class="nb-guide-body">${body}</div>`;
    return d;
  }

  const pageButton = (page, label) =>
    `<button type="button" class="nb-guide-page" data-page="${esc(page)}">${esc(label || "p. " + page)}</button>`;

  function startFold(start) {
    if (!Array.isArray(start) || !start.length) return null;
    const items = start.map((s) => `<li>${pageButton(s.page)}<span>${esc(s.why)}</span></li>`).join("");
    return fold("Where to start", `<ol class="nb-guide-list">${items}</ol>`, true);
  }

  // The argument: the work's main theses in order, how each is argued, the
  // objections it meets and the answers given, and the distinctions it turns
  // on, each with the pages its claims stand on.
  // "p. 12" or "pp. 10, 48, 70": each number opens that page in place.
  function pagesOf(refs) {
    const ps = (refs || []).slice(0, 8);
    if (!ps.length) return "";
    return `<span class="nb-guide-pp">${ps.length > 1 ? "pp." : "p."} ${ps.map((r) => pageButton(r.p, String(r.p))).join(", ")}</span>`;
  }

  function argumentFold(arg) {
    if (!arg || !Array.isArray(arg.map) || !arg.map.length) return null;
    const theses = arg.map.map((t) => {
      const objections = (t.objections || []).map((o) => `<li>
        <p><em>Objection.</em> ${esc(o.objection)}</p>
        ${o.answer ? `<p><em>Answer.</em> ${esc(o.answer)}</p>` : ""}${pagesOf(o.refs)}</li>`).join("");
      return `<li>
        <p class="nb-arg-thesis">${esc(t.thesis)}</p>${pagesOf(t.refs)}
        ${t.argued ? `<p><em>How it is argued.</em> ${esc(t.argued)}</p>${pagesOf(t.argued_refs)}` : ""}
        ${objections ? `<ul class="nb-arg-objections">${objections}</ul>` : ""}
        ${t.distinctions ? `<p><em>Distinctions.</em> ${esc(t.distinctions)}</p>` : ""}</li>`;
    }).join("");
    return fold("The argument", `${arg.summary ? `<p class="nb-arg-summary">${esc(arg.summary)}</p>` : ""}<ol class="nb-arg">${theses}</ol>`, false);
  }

  function sectionsFold(sections, structure) {
    if (!sections || !Array.isArray(structure)) return null;
    const rows = [];
    structure.forEach((e, i) => {
      const note = sections[String(i)];
      if (!note || !e || e.page == null) return;
      const depth = Number(e.depth) || 1;
      if (depth > 2) return;
      rows.push(`<li class="nb-guide-d${depth}">${pageButton(e.page, e.title || "p. " + e.page)}<span>${esc(note)}</span></li>`);
    });
    if (!rows.length) return null;
    return fold("Sections", `<ul class="nb-guide-list nb-guide-sections">${rows.slice(0, 120).join("")}</ul>`, false);
  }

  function indexFold(index) {
    if (!Array.isArray(index) || !index.length) return null;
    const rows = index.map((e) => {
      const pages = (e.pages || []).slice(0, 12).map((p) => pageButton(p, String(p))).join(" ");
      const head = e.sub ? `${e.heading}, ${e.sub}` : e.heading;
      return `<li data-k="${esc(String(head).toLowerCase())}"><span class="nb-guide-head">${esc(head)}</span> ${pages}</li>`;
    });
    const body = `<label class="nb-guide-filter">Find in the index <input type="search" placeholder="A subject, a name" autocomplete="off"></label>
      <ul class="nb-guide-list nb-guide-index">${rows.join("")}</ul>`;
    const d = fold("Subject index", body, false);
    const box = d.querySelector("input");
    box.addEventListener("input", () => {
      const q = box.value.trim().toLowerCase();
      d.querySelectorAll(".nb-guide-index li").forEach((li) => { li.hidden = !!q && !li.dataset.k.includes(q); });
    });
    return d;
  }

  function quotesFold(quotes) {
    if (!Array.isArray(quotes) || !quotes.length) return null;
    const rows = quotes.map((q) => `<li><blockquote>${esc(q.text)}</blockquote>${pageButton(q.page)}</li>`).join("");
    return fold("Quotations", `<ul class="nb-guide-list nb-guide-quotes">${rows}</ul>`, false);
  }

  // The page in view: the first rendered folio whose foot is below the toolbar.
  function pageInView() {
    const folios = document.querySelectorAll("#reading .folio[data-page]");
    for (const f of folios) {
      const r = f.getBoundingClientRect();
      if (r.bottom > 96) return String(f.dataset.page);
    }
    return null;
  }

  // The catalogue names the cited works; it is fetched the first time the fold
  // opens (the reader's own search has usually cached it by then).
  let catalogue = null;
  const works = () => catalogue || (catalogue = getJSON(`${BASE}/v1/works-index.json`).then((d) => {
    const m = {};
    ((d && d.works) || []).forEach((w) => { m[w.slug] = w; });
    return m;
  }));

  function citedFold(cites) {
    if (!cites || !cites.pages) return null;
    const d = fold("Cited on this page", `<div class="nb-guide-cited"></div>`, false);
    const box = d.querySelector(".nb-guide-cited");
    let shown = null;
    async function draw() {
      const page = pageInView();
      if (!page || page === shown) return;
      shown = page;
      // A Migne page is a spread of two columns; its citations sit under either.
      const n = Number(page);
      const keys = Number.isFinite(n) && /^p[gl]d?-/.test(slug) ? [String(n), String(n + 1)] : [page];
      const list = keys.flatMap((k) => cites.pages[k] || []);
      const names = await works();
      if (shown !== page) return;
      if (!list.length) { box.innerHTML = `<p class="nb-guide-none">No linked citations on p. ${esc(page)}.</p>`; return; }
      box.innerHTML = `<ul class="nb-guide-list">${list.map((c) => {
        const w = names[c.w];
        const name = w ? [w.author, w.title].filter(Boolean).join(", ") : c.w;
        return `<li><a href="${there(c.w, c.p)}" target="_blank" rel="noopener">${esc(name)}, p. ${esc(c.p)}</a>${c.loc ? `<span>${esc(c.loc)}</span>` : ""}</li>`;
      }).join("")}</ul>`;
    }
    d.addEventListener("toggle", () => { if (d.open) { shown = null; draw(); } });
    let t = 0;
    window.addEventListener("scroll", () => { if (!d.open) return; clearTimeout(t); t = setTimeout(draw, 250); }, { passive: true });
    window.addEventListener("fr-reader-navigation", () => { if (d.open) { shown = null; setTimeout(draw, 300); } });
    return d;
  }

  async function mount() {
    const data = await getJSON(`${BASE}/v1/enrich/works/${encodeURIComponent(slug)}.json`);
    if (!data) return;
    const needsStructure = data.sections && Object.keys(data.sections).length;
    const [meta, cites] = await Promise.all([
      needsStructure ? getJSON(`${BASE}/v1/works/${encodeURIComponent(slug)}/meta.json`) : null,
      getJSON(`${BASE}/v1/enrich/cites/${encodeURIComponent(slug)}.json`),
    ]);
    const folds = [startFold(data.start), argumentFold(data.argument), sectionsFold(data.sections, meta && meta.structure), indexFold(data.index),
      quotesFold(data.quotes), citedFold(cites)].filter(Boolean);
    if (!folds.length) return;
    const guide = document.createElement("div");
    guide.id = "nbWorkGuide";
    guide.className = "nb-work-guide";
    folds.forEach((f) => guide.appendChild(f));
    const note = document.createElement("p");
    note.className = "nb-guide-note";
    note.textContent = "Library notes: written by machine from this work's pages; every page reference is checked against the text.";
    guide.appendChild(note);
    guide.addEventListener("click", (e) => {
      const b = e.target.closest(".nb-guide-page");
      if (b) { e.preventDefault(); go(b.dataset.page); }
    });
    const anchor = $("nbWorkSources") || $("nbAnalysisFold");
    if (anchor) panel.insertBefore(guide, anchor); else panel.appendChild(guide);
  }

  // After the reader has named the work, so the tab's own controls come first.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
