/* The glossary page: a Latin or Greek term's meaning in brief, above the tradition's definitions.
 *
 * faith-glossary.js lists, per term, how the library's authors define it, each
 * with its page. For a Latin or Greek term the reader often needs the plain
 * meaning first. v1/enrich/glossary/brief/<two letters>.json on the library
 * worker holds 8,800 such terms (keyed as the glossary keys them: lowercase,
 * a-z0-9 only; a Greek term by its transliteration), each meaning checked twice
 * against its use in the library. One small file per first two letters, fetched
 * only when a term with that start is shown.
 *
 * Adds one line under the term's heading; changes nothing else. Machine-written,
 * and the line says so on hover.
 */
(function () {
  "use strict";

  const list = document.querySelector("[data-faith-glossary-entries]");
  if (!list) return;
  const BASE = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const key = (t) => String(t || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const buckets = new Map();
  const bucket = (b) => {
    if (!buckets.has(b)) buckets.set(b, fetch(`${BASE}/v1/enrich/glossary/brief/${b}.json`).then((r) => (r.ok ? r.json() : null)).then((d) => (d && d.terms) || {}).catch(() => ({})));
    return buckets.get(b);
  };

  async function annotate() {
    const heads = Array.from(list.querySelectorAll(".faith-glossary-term")).filter((h) => !h.dataset.brief);
    for (const h of heads) {
      h.dataset.brief = "1";
      const k = key(h.textContent);
      if (k.length < 2) continue;
      const hit = (await bucket(k.slice(0, 2)))[k];
      if (!hit || !hit.gloss || !h.isConnected) continue;
      const p = document.createElement("p");
      p.className = "faith-glossary-brief";
      p.title = "Machine-written from the library's use of the term, checked twice";
      p.innerHTML = `<span>${hit.lang === "grc" ? "Greek" : "Latin"}${hit.greek ? ` ${esc(hit.greek)}` : ""}, in brief:</span> ${esc(hit.gloss)}`;
      h.insertAdjacentElement("afterend", p);
    }
  }

  new MutationObserver(() => { annotate(); }).observe(list, { childList: true });
  annotate();
})();
