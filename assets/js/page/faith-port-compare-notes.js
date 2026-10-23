/* The compare desk: what the library says about the pair on the desk.
 *
 * When the desk holds two authors (#a=<room>,<room>), this reads two kinds of
 * note from v1/enrich on the library worker and shows them above the desk:
 *
 *   debates/<a>--<b>.json  where one of them refutes the other in the library
 *                          (Gerhard and Bellarmine, Twisse and Arminius): the
 *                          points of contention, what each side holds, and the
 *                          pages on both sides.
 *   compare/<a>--<b>.json  the subjects they share most: where they agree and
 *                          where they part, with each side's pages.
 *
 * Both are machine-written summaries of the authors' own claims, paraphrase
 * and never quotation, with every page checked; the block says so. A pair the
 * library has no notes for shows nothing. The desk itself is untouched.
 *
 * WHERE THEY STAND AND HOW THEY READ (2026-10-22 compare pass): the notes sit under the authors on the desk, in the slot the desk
 * leaves for them (#cd-notes-slot), so the reader sees who is compared before what the library says of them; before, they stood
 * above the desk, open, and pushed it three screens down. Each note is a closed fold whose line counts its points by the kind of
 * difference; each point is a row (the question and its kind) that opens on the two sides side by side, in the desk's own order,
 * oldest first. The notes are
 * drawn once a pair and kept while the pair stays, so a topic or a filter changed on the desk leaves an opened point open.
 * On Mere Orthodoxy the line on how the notes are made sits in the page's one Methodology disclosure at the foot of the desk.
 */
(function () {
  "use strict";
  const BASE = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const READ = "/the-faith-received/read/?w=";
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const slugify = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const nOf = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
  const pageLinks = (refs) => (refs || []).slice(0, 4).map((r) =>
    `<a href="${READ}${encodeURIComponent(r.w)}#b${encodeURIComponent(r.p)}-0" target="_blank" rel="noopener" title="${esc(r.claim || "")}">p. ${esc(r.p)}</a>`).join(", ");

  // the desk writes its authors oldest first, so the first two of #a= are the pair in date order
  function pairFromHash() {
    const P = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
    const a = (P.get("a") || "").split(",").map((x) => decodeURIComponent(x).trim()).filter(Boolean);
    return a.length >= 2 ? [a[0], a[1]].map((x) => (/^[a-z0-9-]+$/.test(x) ? x : slugify(x))) : null;
  }

  /* THE KIND OF DIFFERENCE AND EACH SIDE'S OWN WORDS (2026-10-21, owner: "comparison to show us and connect us to quotes … the
   * differences being a lot more nuanced"): each point says what kind of difference it is (contradiction, distinction, emphasis,
   * terminology, agreement misread …) and carries a passage in each author's words, found on its page word for word
   * (runs/minimax_1019/pairs/pairs_1021.py). An older file without them draws as before. */
  const KIND = { contradiction: "They contradict", distinction: "A distinction, not a denial", emphasis: "A difference of emphasis", terminology: "Different words for one thing",
    scope: "A difference of scope", agreement: "They agree", misreading: "Agreement the opponent misread", development: "One develops the other" };
  const kindTag = (k) => (k ? `<span class="cn-kind">${esc(KIND[String(k).toLowerCase()] || k)}</span>` : "");
  const quote = (q, who) => (q && q.text ? `<blockquote class="cn-quote"><p>${esc(q.text)}</p><footer>${esc(who)}, <a href="${READ}${encodeURIComponent(q.w)}#b${encodeURIComponent(q.p)}-0" target="_blank" rel="noopener">p. ${esc(q.p)}</a></footer></blockquote>` : "");

  /* one side of a point: the author, what he holds and its pages, then his own words; `none` says so when the note gives no page */
  const side = (who, text, refs, q, none) => {
    const pages = (refs || []).length ? ` <span class="cn-pages">${pageLinks(refs)}</span>` : none ? ` <span class="cn-pages">${esc(none)}</span>` : "";
    return `<div class="cn-side"><p><strong>${esc(who)}</strong>${text ? ` ${esc(text)}` : ""}${pages}</p>${quote(q, who)}</div>`;
  };
  /* a point: its question and its kind as one row; opened, the sides, oldest first (flip when the note names the later author first) */
  const point = (question, kind, a, b, flip, lead, foot) => `<li><details class="cn-point"><summary><span class="cn-q">${esc(question)}</span>${kindTag(kind)}</summary>
    <div class="cn-point-b">${lead || ""}<div class="cn-sides">${flip ? b + a : a + b}</div>${foot || ""}</div></details></li>`;
  /* a note's fold, closed: its line says what it holds, the points counted by the kind of difference, so the desk below stays in
     reach and the reader opens what he wants (the topics page keeps its library notes closed under its graphics the same way) */
  const KINDS = { agreement: ["agreement", "agreements"], contradiction: ["contradiction", "contradictions"], distinction: ["distinction", "distinctions"],
    emphasis: ["difference of emphasis", "differences of emphasis"], terminology: ["difference of words", "differences of words"],
    scope: ["difference of scope", "differences of scope"], misreading: ["misread agreement", "misread agreements"], development: ["development", "developments"] };
  const kindCount = (kinds) => Object.entries(kinds || {}).filter(([, n]) => n > 0).sort((a, z) => z[1] - a[1] || a[0].localeCompare(z[0]))
    .map(([k, n]) => (KINDS[k] ? nOf(n, KINDS[k][0], KINDS[k][1]) : `${fmt(n)} ${esc(k)}`)).join(", ");
  const tally = (rows) => { const t = {}; (rows || []).forEach((r) => { const k = String(r.kind || "").toLowerCase(); if (k) t[k] = (t[k] || 0) + 1; }); return t; };
  const fold = (title, sub, body) => `<details class="rx-fold cn-fold"><summary><span><strong>${title}</strong><small>${sub}</small></span></summary>
    <div class="cn-fold-b">${body}</div></details>`;

  function debateHTML(d, flip) {
    const pts = (d.points || []).map((p) => point(p.question, p.kind, side(d.a, p.a_says, p.a_refs, p.a_quote),
      p.b_holds ? side(d.b, p.b_holds, p.b_refs, p.b_quote) : "", flip)).join("");
    const kinds = kindCount(tally(d.points));
    return fold(`${esc(d.a)} answers ${esc(d.b)}`, `on ${nOf(Number(d.refutations || 0), "page", "pages")} in the library · ${nOf((d.points || []).length, "point", "points")}${kinds ? `: ${kinds}` : ""}`,
      `<p class="cn-summary">${esc(d.summary)}</p><ol class="cn-points">${pts}</ol>`);
  }

  function compareHTML(c, flip) {
    const tops = (c.topics || []).map((t) => point(t.locus, t.kind, side(c.a, "", t.a_refs, t.a_quote, "no page given"), side(c.b, "", t.b_refs, t.b_quote, "no page given"), flip,
      `${t.agree ? `<p class="cn-joint"><em>Agree</em> ${esc(t.agree)}</p>` : ""}${t.differ ? `<p class="cn-joint"><em>Differ</em> ${esc(t.differ)}</p>` : ""}`)).join("");
    const kinds = kindCount(tally(c.topics));
    return fold(`How ${esc(c.a)} and ${esc(c.b)} compare`, `on the subjects they share most · ${nOf((c.topics || []).length, "subject", "subjects")}${kinds ? `: ${kinds}` : ""}`,
      `<p class="cn-summary">${esc(c.summary)}</p><ol class="cn-points">${tops}</ol>`);
  }

  /* THE CONTROVERSIES (2026-10-21, owner: "see differences between Thomas and Scotus (like Juan de Rada shows)"): when the library's own
   * controversy literature argued this pair question by question (v1/enrich/controversies/index.json), the first of them here with a
   * door to the whole set on /controversies. */
  let contrIndex = null;
  async function controversiesHTML(x, y) {
    if (!contrIndex) contrIndex = (await getJSON(`${BASE}/v1/enrich/controversies/index.json`)) || { pairs: [] };
    const pr = (contrIndex.pairs || []).find((p) => (p.a_slug === x && p.b_slug === y) || (p.a_slug === y && p.b_slug === x));
    if (!pr) return "";
    const d = await getJSON(`${BASE}/v1/enrich/controversies/${encodeURIComponent(pr.pair)}.json`);
    if (!d || !(d.controversies || []).length) return "";
    const first = (s) => { const k = (s && s.picks || [])[0]; return k && k.quote ? { text: k.quote, w: k.w, p: k.p } : null; };
    const rows = d.controversies.slice(0, 8).map((c) => point(c.question, c.kind, side(d.a, c.a && c.a.reported, null, first(c.a)), side(d.b, c.b && c.b.reported, null, first(c.b)),
      pr.a_slug !== x, "", `<p class="cn-door"><a href="/the-faith-received/controversies/#${esc(c.id)}">This controversy whole: each side’s arguments and the judgment</a></p>`)).join("");
    const kinds = kindCount(d.kinds || tally(d.controversies));
    return fold(`${esc(d.a)} and ${esc(d.b)}, controversy by controversy`, `${nOf(Number(d.n || 0), "controversy", "controversies")}, as ${esc(d.source)} argued them in ${esc(d.source_title)}${kinds ? `: ${kinds}` : ""}`,
      `<ol class="cn-points">${rows}</ol><p class="cn-summary"><a href="/the-faith-received/controversies/#${esc(d.pair)}">All ${fmt(d.n)} controversies, each side in his own words</a></p>`);
  }

  let serial = 0;
  let pending = ""; // the pair whose notes are on their way
  let shown = null; // {key, box}: the notes of the pair on the desk, kept while the pair stays
  /* the notes go in the desk's slot under its authors; the desk redraws its markup when an author changes, so a box left out is put back */
  function place() {
    if (!shown || !shown.box) return;
    const slot = document.getElementById("cd-notes-slot");
    if (slot) { if (shown.box.parentNode !== slot) slot.appendChild(shown.box); return; }
    const host = document.getElementById("cd-host");
    if (host && !shown.box.isConnected) host.parentNode.insertBefore(shown.box, host);
  }
  async function draw() {
    const pair = pairFromHash();
    const key = pair ? pair.join("|") : "";
    if (shown && shown.key === key) { place(); return; }
    if (key && pending === key) return;
    const run = ++serial;
    if (shown && shown.box) shown.box.remove();
    shown = null;
    pending = key;
    if (!pair) return;
    const [x, y] = pair;
    const [d1, d2, c, cv] = await Promise.all([
      getJSON(`${BASE}/v1/enrich/debates/${x}--${y}.json`),
      getJSON(`${BASE}/v1/enrich/debates/${y}--${x}.json`),
      getJSON(`${BASE}/v1/enrich/compare/${[x, y].sort().join("--")}.json`),
      controversiesHTML(x, y).catch(() => ""),
    ]);
    if (run !== serial) return;
    pending = "";
    const parts = (cv ? [cv] : []).concat(
      [[d1, false], [d2, true]].filter(([d]) => d).map(([d, flip]) => debateHTML(d, flip)),
      c ? [compareHTML(c, [x, y].sort()[0] !== x)] : []);
    if (!parts.length) { shown = { key, box: null }; return; }
    const box = document.createElement("section");
    box.id = "cnNotes";
    box.className = "cn-notes";
    box.setAttribute("aria-labelledby", "cn-title");
    box.innerHTML = `<div class="cn-top"><h3 class="cn-title" id="cn-title">From the library</h3></div>${parts.join("")}`;
    shown = { key, box };
    place();
  }

  // The desk writes its state to the hash with replaceState (no hashchange), so
  // the hash is also watched; #cd-host appears once the desk has drawn.
  let last = null;
  setInterval(() => {
    if (!document.getElementById("cd-host")) return;
    const h = location.hash;
    if (h !== last) { last = h; draw(); } else place();
  }, 600);
  addEventListener("hashchange", () => { last = location.hash; draw(); });
})();
