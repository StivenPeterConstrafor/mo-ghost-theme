/* The live Topics page (/the-faith-received/topics/?t=<locus>, topics-dev.js): a third block under the
 * topic, "The doctrine through the centuries", in the page's own fold-and-tabs style (.td-block,
 * .td-tabs): how the library's authors developed the doctrine period by period, a course of readings in
 * order, the traditions compared on it, and its concept guides.
 *
 * Data: v1/enrich/topics/<slug>.json on the library worker. Its slugs are the old Topics page's, which is
 * each locus's t2 in loci.json (the table topics-dev.js itself reads); a locus without a file of its own
 * falls back to its aliases. Machine-written from the authors' own claims, paraphrase never quotation,
 * every page checked; the block says so. A topic without notes shows nothing, and nothing else on the
 * page changes: the block is added after the page draws a topic and again whenever it redraws one.
 */
(function () {
  "use strict";

  const $root = document.querySelector("[data-td-root]");
  if (!$root) return;
  const BASE = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const READ = "/the-faith-received/read/?w=";
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getJSON = (url) => fetch(url, { credentials: "omit" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const pageLink = (w, p, label) => `<a href="${READ}${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0">${esc(label)}</a>`;
  // A page names whose words it carries; a compiled page names its compiler ("Augustine of Hippo, via Eugippius").
  const who = (r) => `${r.a || r.author || r.side || "page"}${r.via ? `, via ${r.via}` : ""}`;
  const pagesLine = (rs) => ((rs || []).length
    ? `<p class="fr-dn-pages">${rs.slice(0, 6).map((r) => pageLink(r.w, r.p, `${who(r)}, p. ${r.p}`)).join(" · ")}</p>` : "");

  // ── The page's own taxonomy: locus id -> its old topic slug (t2) and aliases ──
  let loci = null;
  const lociUrl = () => (window.moAssetUrl ? window.moAssetUrl("/assets/data/faith-received/loci.json") : "/assets/data/faith-received/loci.json");
  const loadLoci = () => loci || (loci = getJSON(lociUrl()).then((d) => {
    const m = new Map();
    ((d && d.parts) || []).forEach((part) => (part.loci || []).forEach((l) => {
      m.set(l.id, l);
      (l.children || []).forEach((ch) => m.set(ch.id, ch));
    }));
    return m;
  }));
  const cache = new Map();
  const topicFile = (slug) => {
    if (!cache.has(slug)) cache.set(slug, getJSON(`${BASE}/v1/enrich/topics/${encodeURIComponent(slug)}.json`));
    return cache.get(slug);
  };
  const hasNotes = (d) => d && ((d.guide && (d.guide.history || []).length) || (d.traditions || []).length || (d.concepts || []).length);
  async function notesFor(locus) {
    for (const slug of [locus.t2, ...(locus.aliases || [])].filter(Boolean)) {
      const d = await topicFile(String(slug).toLowerCase());
      if (hasNotes(d)) return d;
    }
    return null;
  }

  // ── The four views ──
  function historyView(g) {
    return `${g.summary ? `<p class="fr-dn-lede">${esc(g.summary)}</p>` : ""}<ol class="fr-dn-timeline">${g.history.map((h) => `<li>
      <h4>${esc(h.period)}</h4><div><p>${esc(h.text)}</p>${pagesLine(h.refs)}</div></li>`).join("")}</ol>`;
  }

  function courseView(g) {
    return `<ol class="fr-dn-course">${g.course.map((c) => `<li>
      <p class="fr-dn-course-head">${pageLink(c.w, c.p, `${who(c)}${c.t ? `, ${c.t}` : ""}, p. ${c.p}`)}</p>
      <p>${esc(c.why)}</p>${c.thesis ? `<p class="fr-dn-thesis">${esc(c.thesis)}</p>` : ""}</li>`).join("")}</ol>`;
  }

  function traditionsView(prs) {
    return `<ol class="fr-dn-pairs">${prs.map((p) => `<li><h4>${esc(p.x)} and ${esc(p.y)}</h4>
      <p>${esc(p.summary)}</p>
      ${p.agree ? `<p><em>Agree.</em> ${esc(p.agree)}</p>${pagesLine(p.agree_refs)}` : ""}
      ${p.differ ? `<p><em>Differ.</em> ${esc(p.differ)}</p>${pagesLine(p.differ_refs)}` : ""}</li>`).join("")}</ol>`;
  }

  function conceptsView(cs) {
    return `<ul class="fr-dn-concepts">${cs.map((c) => `<li><p><strong>${esc(c.label)}</strong> ${esc(c.gloss)}</p>
      <button type="button" class="sd-clear fr-dn-open" data-concept="${esc(c.id)}" aria-expanded="false">Read the guide</button>
      <div class="fr-dn-guide" hidden></div></li>`).join("")}</ul>`;
  }

  function guideHTML(g) {
    const pos = (g.positions || []).map((p) => `<li><strong>${esc(p.tradition)}.</strong> ${esc(p.summary)}
      ${(p.evidence || []).length ? `<p class="fr-dn-pages">${p.evidence.slice(0, 5).map((e) => pageLink(e.work, e.page, `p. ${e.page}`)).join(" · ")}</p>` : ""}</li>`).join("");
    const read = (g.read || []).map((r) => `<li>${pageLink(r.work, r.page, r.title || r.work)} <span>${esc(r.why)}</span></li>`).join("");
    return `${g.brief ? `<p>${esc(g.brief)}</p>` : ""}${g.scope_note ? `<p><em>Scope.</em> ${esc(g.scope_note)}</p>` : ""}
      ${g.differed ? `<p><em>Where the traditions differed.</em> ${esc(g.differed)}</p>` : ""}
      ${pos ? `<h5>Positions</h5><ul>${pos}</ul>` : ""}${read ? `<h5>Where to read</h5><ul>${read}</ul>` : ""}`;
  }

  // ── The block ──
  let run = 0;
  async function draw() {
    const id = new URLSearchParams(location.search).get("t");
    const $main = $root.querySelector("[data-td-main]");
    const old = $root.querySelector("[data-fr-dn]");
    if (!id || !$main) { if (old) old.remove(); return; }
    if (old && old.dataset.id === id) return;
    if (old) old.remove();
    const my = ++run;
    const locus = (await loadLoci()).get(id);
    const d = locus ? await notesFor(locus) : null;
    const $m = $root.querySelector("[data-td-main]"); // the page may have redrawn while the notes loaded
    if (my !== run || !d || !$m || new URLSearchParams(location.search).get("t") !== id || $m.querySelector("[data-fr-dn]")) return;
    const g = d.guide || {};
    const views = [];
    if ((g.history || []).length) views.push(["history", "History", () => historyView(g)]);
    if ((g.course || []).length) views.push(["course", "A course of reading", () => courseView(g)]);
    if ((d.traditions || []).length) views.push(["traditions", "Traditions compared", () => traditionsView(d.traditions)]);
    if ((d.concepts || []).length) views.push(["concepts", "Concept guides", () => conceptsView(d.concepts)]);
    if (!views.length) return;
    const box = document.createElement("details");
    box.className = "td-block fr-dn";
    box.open = true;
    box.dataset.frDn = "";
    box.dataset.id = id;
    box.innerHTML = `<summary class="td-fold-sum"><h3 class="td-block-h" id="td-h-history">The doctrine through the centuries</h3>
      <p class="sd-muted td-note">How the library's authors developed it, period by period, with a course of reading and the traditions compared. Machine-written from their own claims, not their words; every page is checked.</p></summary>
      <nav class="td-tabs" aria-label="Ways to read the doctrine's history">${views.map(([k, lab], i) =>
        `<a class="td-tab" href="#td-h-history" data-fr-view="${k}"${i ? "" : ' aria-current="true"'}>${esc(lab)}</a>`).join("")}</nav>
      <div class="td-view fr-dn-view" data-fr-dn-view>${views[0][2]()}</div>`;
    const $view = box.querySelector("[data-fr-dn-view]");
    box.querySelector(".td-tabs").addEventListener("click", (e) => {
      const a = e.target.closest(".td-tab");
      if (!a) return;
      e.preventDefault();
      const v = views.find((x) => x[0] === a.dataset.frView);
      if (!v) return;
      box.querySelectorAll(".td-tab").forEach((t) => { if (t === a) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current"); });
      $view.innerHTML = v[2]();
    });
    $view.addEventListener("click", async (e) => {
      const b = e.target.closest(".fr-dn-open");
      if (!b) return;
      const slot = b.nextElementSibling;
      if (!slot.hidden) { slot.hidden = true; b.textContent = "Read the guide"; b.setAttribute("aria-expanded", "false"); return; }
      if (!slot.dataset.loaded) {
        const cg = await getJSON(`${BASE}/v1/enrich/concepts/${encodeURIComponent(b.dataset.concept)}.json`);
        slot.innerHTML = cg ? guideHTML(cg) : "<p class=\"sd-muted\">This guide did not load.</p>";
        slot.dataset.loaded = "1";
      }
      slot.hidden = false;
      b.textContent = "Close the guide";
      b.setAttribute("aria-expanded", "true");
    });
    $m.appendChild(box);
  }

  // topics-dev.js redraws the whole topic into the root (innerHTML) on every route; a view switch only
  // redraws inside it. So watch the root's own children, and the history.
  new MutationObserver(() => { draw(); }).observe($root, { childList: true });
  window.addEventListener("popstate", () => { draw(); });
  draw();
})();
