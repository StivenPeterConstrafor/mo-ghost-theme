/* CITATIONS YOU CAN FOLLOW (2026-10-20, owner: "is it possible to be able to scroll vitringa and click into what he cites that's
 * available on our text?"). v1/enrich/links/<slug>.json (runs/minimax_1019/links/vlinks.py): for each page of the work, the citations
 * the mine recorded on it that resolve to a work we hold — [surface as printed, how, work, page or null, title, author]. As the reader
 * lays out a page, the citation's printed name (or, failing that, its surname) is marked in the text; a click opens the cited page beside
 * the text (the page window: the page, the one before and after, English or source) with a link into the reader. Text stays in place.
 */
(function (root) {
  "use strict";
  const doc = root.document;
  if (!doc) return;
  const reading = doc.getElementById("reading");
  if (!reading) return;
  const slug = new URLSearchParams(root.location.search).get("w");
  if (!slug) return;
  const BLOB = String(root.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev").replace(/\/$/, "");
  const READER = root.__FR_READER_PATH__ || "/the-faith-received/read/";
  const href = (w, p) => `${READER}?w=${encodeURIComponent(w)}${p != null && p !== "" ? `#b${encodeURIComponent(p)}-0` : ""}`;
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const VERB = { refutes: "Refutes", reports: "Reports", approves: "Approves", quotes: "Quotes", cites: "Cites" };

  let data = null;
  fetch(`${BLOB}/v1/enrich/links/${encodeURIComponent(slug)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => {
    if (!d || !d.pages) return;
    data = d;
    reading.querySelectorAll(".folio[data-page]").forEach(mark);
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches(".folio[data-page]")) mark(n);
        else if (n.querySelectorAll) n.querySelectorAll(".folio[data-page]").forEach(mark);
      }
    }).observe(reading, { childList: true, subtree: true });
  });

  // The printed name in the page's text: the whole form first ("JOANN. FRANCISC. BUDDEUS"), then its surname ("BUDDEUS"), each
  // matched case- and accent-blind on word edges, once per citation, never inside a link already there.
  function needles(surface) {
    const s = String(surface || "").trim();
    const out = [s];
    const words = s.split(/[\s.,;:]+/).filter((w) => w.length >= 4 && !/^(?:apud|contra|liber|tom|cap|lib|pag|sect|vol)$/i.test(w));
    if (words.length > 1) out.push(words[words.length - 1]);
    return out.filter(Boolean);
  }
  function wrap(folio, needle, link, i) {
    const target = fold(needle);
    if (target.length < 4) return false;
    const walker = doc.createTreeWalker(folio, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && n.parentElement.closest("a, button, script, style, .citelink") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = walker.nextNode())) {
      const text = fold(n.data);
      let at = text.indexOf(target);
      while (at >= 0) {
        const before = text[at - 1], after = text[at + target.length];
        if ((!before || !/[a-z0-9]/.test(before)) && (!after || !/[a-z0-9]/.test(after))) {
          const range = doc.createRange();
          range.setStart(n, at); range.setEnd(n, at + target.length);
          const a = doc.createElement("a");
          a.className = "citelink"; a.href = href(link[2], link[3]); a.dataset.cl = String(i);
          a.title = `${link[5]}, ${link[4]}${link[3] ? `, p. ${link[3]}` : ""}`;
          try { range.surroundContents(a); } catch (_) { return false; }
          return true;
        }
        at = text.indexOf(target, at + 1);
      }
    }
    return false;
  }
  function mark(folio) {
    if (!data || folio.dataset.citeLinks) return;
    folio.dataset.citeLinks = "1";
    const links = data.pages[String(Number(folio.dataset.page))] || data.pages[folio.dataset.page];
    if (!links || !links.length) return;
    links.forEach((link, i) => {
      for (const needle of needles(link[0])) if (wrap(folio, needle, link, `${folio.dataset.page}:${i}`)) break;
    });
  }

  // The cited page beside the text.
  const pop = doc.createElement("div");
  pop.id = "citepop"; pop.hidden = true; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Cited work");
  doc.body.appendChild(pop);
  // page-window.js is loaded by the template before this file; never inject a script whose src comes from a window global.
  const pageWindow = () => Promise.resolve(root.FRPageWindow || null);
  function close() { pop.hidden = true; pop.innerHTML = ""; }
  async function open(a) {
    const [pg, i] = a.dataset.cl.split(":");
    const link = ((data && data.pages[String(Number(pg))]) || [])[Number(i)];
    if (!link) return;
    const [surface, how, w, p, title, author] = link;
    pop.innerHTML = `<button type="button" class="cp-x" aria-label="Close">×</button>
      <p class="cp-h">${esc(VERB[how] || "Cites")} ${esc(author)}</p><p class="cp-t">${esc(title)}${p ? `, p. ${esc(p)}` : ""}</p>
      <p class="cp-as">As printed: <em>${esc(surface)}</em></p>
      <a class="cp-open" href="${esc(href(w, p))}">${p ? `Open p. ${esc(p)} in the reader` : "Open the work in the reader"}</a>
      <div class="cp-page">${p ? '<p class="cp-wait" role="status">Loading the page…</p>' : ""}</div>`;
    pop.hidden = false;
    const r = a.getBoundingClientRect();
    if (root.innerWidth <= 700) { pop.style.left = "8px"; pop.style.top = "auto"; }
    else {
      pop.style.left = `${Math.max(8, Math.min(r.left, root.innerWidth - pop.offsetWidth - 8))}px`;
      const below = r.bottom + 10, h = pop.offsetHeight;
      pop.style.top = `${below + h > root.innerHeight - 8 ? Math.max(8, r.top - h - 10) : below}px`;
    }
    if (!p) return;
    const PW = await pageWindow();
    const host = pop.querySelector(".cp-page");
    if (!host || pop.hidden) return;
    const ok = PW ? await PW.fill(host, { slug: w, page: p, hl: "" }) : false;
    if (!ok && !pop.hidden) host.innerHTML = "";
  }
  reading.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a.citelink");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault(); open(a);
  });
  pop.addEventListener("click", (e) => { if (e.target.closest(".cp-x")) close(); });
  doc.addEventListener("mousedown", (e) => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("a.citelink")) close(); });
  doc.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) close(); });
})(typeof window === "undefined" ? globalThis : window);
