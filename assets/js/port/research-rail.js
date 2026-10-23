/* THE RESEARCH RAIL, PAGE FIRST (2026-10-20, rail critique; owner "fix it all"). What the rail adds to the notebook's own wiring
 * (read-tools.js) and to the Work tab's folds (work-guide.js):
 *
 *   Save    one control in the rail's head opens a panel with both saves (this place, the work), the notebook they go into, and
 *           what happened. The buttons are the notebook's own (#nbSaveReadingPlace, #nbSaveWork), so saving works as it did.
 *   w       opens and closes Research. The reader's other keys stay theirs (r related passages, / find, n and j).
 *   Search  before any words are typed, the subjects the work's own index cites most start a search; with words, the index
 *           answers first (each subject, person, passage, term or question holding every word, with its pages), then the text.
 *   Ask     the questions the work itself asks start a question, those on the page in view first. A question is typed into
 *           Ask, never sent.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const rail = $("notebook");
  if (!rail) return;
  const slug = new URLSearchParams(location.search).get("w");
  const HUB = window.FRWorkHub;
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const typing = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const isOpen = () => rail.classList.contains("open");
  const where = (page) => {
    try { if (typeof window.locOf === "function") { const s = window.locOf(page); if (s) return String(s); } } catch (_) { /* the reader's own label is optional */ }
    return `p. ${page}`;
  };
  // A page of this work opens in place, as the Work tab's page numbers do.
  function go(page) {
    const url = HUB ? HUB.readerHref(slug, page) : `/the-faith-received/read/?w=${encodeURIComponent(slug)}#b${encodeURIComponent(page)}-0`;
    if (window.FRReaderResearch && window.FRReaderResearch.navigate(url)) return;
    location.assign(url);
  }
  const pageButton = (p) => `<button type="button" class="wh-page" data-page="${esc(p)}" aria-label="Page ${esc(p)}">${esc(p)}</button>`;

  // The work's index in its five parts, fetched once (the Work tab has usually asked for it already).
  let parts = null;
  const index = () => parts || (parts = HUB && slug ? HUB.guide(slug).then((d) => (d ? HUB.parts(d) : null)).catch(() => null) : Promise.resolve(null));

  // The page in view, as the Work tab last saw it.
  let page = null;
  window.addEventListener("fr-rail-page", (e) => {
    page = e.detail && e.detail.page;
    const w = $("nbSaveWhere");
    if (w && e.detail) w.textContent = e.detail.label || "";
    if (askVisible()) drawAsk();
  });

  // ── Save ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const toggle = $("nbSaveToggle"), savePanel = $("nbSavePanel");
  function showSave(on, focus) {
    if (!toggle || !savePanel) return;
    savePanel.hidden = !on;
    toggle.setAttribute("aria-expanded", String(on));
    if (on && focus) (savePanel.querySelector("button:not([hidden])") || savePanel).focus();
  }
  if (toggle) toggle.addEventListener("click", () => showSave(savePanel.hidden, true));
  // Escape shuts the panel before it shuts the rail
  rail.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !savePanel || savePanel.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    showSave(false);
    toggle.focus();
  });
  new MutationObserver(() => { if (!isOpen()) showSave(false); }).observe(rail, { attributes: true, attributeFilter: ["class"] });

  // ── w ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key !== "w" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || typing(document.activeElement)) return;
    if (document.querySelector('[aria-modal="true"]:not(#notebook)')) return;
    const R = window.FRReaderResearch;
    if (!R) return;
    e.preventDefault();
    if (isOpen()) R.close(); else R.open("work");
  });

  // ── Search ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const query = $("nbWorkSearchQuery"), form = $("nbWorkSearchForm"), hits = $("nbIndexHits"), starters = $("nbSearchStarters");
  const results = $("nbWorkSearchResults"), clear = $("nbWorkSearchClear"), searchPanel = $("nbWorkSearch");
  const blank = () => !query.value.trim() && !(results && results.childElementCount);
  // "Clear search" when there is something to clear
  const syncClear = () => { if (clear) clear.hidden = blank(); };

  async function drawStarters() {
    if (!starters || !query) return;
    if (!blank()) { starters.hidden = true; return; }
    if (!starters.dataset.done) {
      const p = await index();
      const seen = new Set(), picks = [];
      for (const e of ((p && p.subjects) || []).slice().sort((a, b) => (b.pages || []).length - (a.pages || []).length)) {
        const h = String(e.heading || "").trim(), k = h.toLowerCase();
        if (!h || h.length > 40 || seen.has(k)) continue;
        seen.add(k);
        picks.push(h);
        if (picks.length === 8) break;
      }
      starters.dataset.done = "1";
      starters.innerHTML = picks.length ? `<h3>From this work's index</h3><div class="nb-chips">${picks.map((h) => `<button type="button" class="nb-chip" data-q="${esc(h)}">${esc(h)}</button>`).join("")}</div>` : "";
    }
    starters.hidden = !starters.childElementCount || !blank();
  }

  const KINDS = [
    ["subjects", "Subject", (e) => (e.sub ? `${e.heading}, ${e.sub}` : e.heading)],
    ["persons", "Person", (e) => e.name],
    ["scripture", "Scripture", (e) => e.ref],
    ["terms", "Term", (e) => e.term],
    ["questions", "Question", (e) => e.q],
  ];
  async function drawHits() {
    if (!hits || !query) return;
    const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const p = words.length ? await index() : null;
    const found = [];
    if (p) for (const [k, kind, name] of KINDS) {
      for (const e of p[k] || []) {
        const n = String(name(e) || ""), s = n.toLowerCase();
        if (words.every((w) => s.includes(w))) found.push({ kind, n, pages: k === "questions" ? [e.page] : (e.pages || []) });
      }
    }
    if (!found.length) { hits.hidden = true; hits.innerHTML = ""; return; }
    // the fullest entries first
    found.sort((a, b) => b.pages.length - a.pages.length);
    const top = found.slice(0, 8);
    hits.innerHTML = `<h3>In this work's index <span>${found.length > top.length ? `${top.length} of ${found.length.toLocaleString()}` : found.length.toLocaleString()}</span></h3><ul>${top.map((h) =>
      `<li><span class="nb-ih-kind">${h.kind}</span><span class="nb-ih-name">${esc(h.n)}</span><span class="wh-ipp">${h.pages.slice(0, 10).map(pageButton).join(" ")}${h.pages.length > 10 ? ` <span class="wh-k">+${(h.pages.length - 10).toLocaleString()}</span>` : ""}</span></li>`).join("")}</ul>`;
    hits.hidden = false;
  }

  if (form && query) {
    form.addEventListener("submit", () => setTimeout(() => { drawHits(); drawStarters(); syncClear(); }, 0));
    query.addEventListener("input", () => { syncClear(); if (!query.value.trim()) { drawHits(); drawStarters(); } });
    if (clear) clear.addEventListener("click", () => setTimeout(() => { drawHits(); drawStarters(); syncClear(); }, 0));
    if (results) new MutationObserver(() => { syncClear(); if (!blank() && starters) starters.hidden = true; }).observe(results, { childList: true });
    if (starters) starters.addEventListener("click", (e) => {
      const b = e.target.closest(".nb-chip");
      if (!b) return;
      query.value = b.dataset.q;
      if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event("submit", { cancelable: true }));
    });
    if (hits) hits.addEventListener("click", (e) => {
      const b = e.target.closest(".wh-page");
      if (!b) return;
      e.preventDefault();
      go(b.dataset.page);
    });
    if (searchPanel) new MutationObserver(() => { if (!searchPanel.hidden) { drawStarters(); syncClear(); } }).observe(searchPanel, { attributes: true, attributeFilter: ["hidden"] });
    syncClear();
  }

  // ── Ask ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const askPanel = $("nbChats"), askBox = $("nbAskStarters");
  const askVisible = () => !!(askPanel && !askPanel.hidden && isOpen());
  async function drawAsk() {
    if (!askBox) return;
    const p = await index();
    const qs = (p && p.questions) || [];
    if (!qs.length) { askBox.hidden = true; askBox.innerHTML = ""; return; }
    const on = page != null ? qs.filter((q) => String(q.page) === String(page)) : [];
    const pick = (on.length ? on : qs).slice(0, 3);
    askBox.innerHTML = `<h3>${on.length ? `Asked on ${esc(where(page))}` : "Questions this work asks"}</h3><ul>${pick.map((q) =>
      `<li><button type="button" class="nb-ask-q" data-q="${esc(q.q)}"><span>${esc(q.q)}</span><small>${esc(where(q.page))}</small></button></li>`).join("")}</ul>`;
    askBox.hidden = false;
  }
  if (askBox) askBox.addEventListener("click", (e) => {
    const b = e.target.closest(".nb-ask-q");
    if (!b || !window.FRAsk) return;
    window.FRAsk.open({ fresh: true, q: b.dataset.q, contextWork: slug, works: slug ? [slug] : [] });
  });
  if (askPanel) new MutationObserver(() => { if (askVisible()) drawAsk(); }).observe(askPanel, { attributes: true, attributeFilter: ["hidden"] });
})();
