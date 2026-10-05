/* The author room: where to start, and the library's controversies and comparisons.
 *
 * v1/enrich/authors/<room>.json on the library worker carries, per author,
 *   start          which of their works to read first, and why;
 *   controversies  the authors they refute or who refute them in the library,
 *                  with the number of pages and a two-sentence summary;
 *   compare        the authors they share the most subjects with, summarised.
 * Each controversy and comparison opens on the compare desk with the pair on
 * it, where faith-port-compare-notes.js shows the full digest with pages.
 *
 * Folds after the room's "Read about" biography, in the same look. A room the
 * library has no notes for shows nothing. Machine-written, and the block says so.
 */
(function () {
  "use strict";

  const BASE = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const desk = (a, b) => `/the-faith-received/compare/#a=${encodeURIComponent(a)},${encodeURIComponent(b)}`;
  const roomOf = () => (String(location.hash || "").replace(/^#/, "").split("/")[0] || "").trim();

  function fold(title, count, body) {
    return `<details class="rx-author-bio rn-fold"><summary>${esc(title)}${count ? ` <small>(${count})</small>` : ""}</summary>${body}</details>`;
  }

  function html(d, room) {
    const parts = [];
    if (Array.isArray(d.start) && d.start.length) {
      parts.push(fold("Start reading", 0, `<ol class="rn-list">${d.start.map((s) =>
        `<li><a href="/the-faith-received/read/?w=${encodeURIComponent(s.work)}">${esc(s.title || s.work)}</a><span>${esc(s.why)}</span></li>`).join("")}</ol>`));
    }
    if (Array.isArray(d.controversies) && d.controversies.length) {
      parts.push(fold("Controversies", d.controversies.length, `<ul class="rn-list">${d.controversies.map((c) =>
        `<li><a href="${desk(room, c.with_room)}">${esc(c.role === "refutes" ? `Answers ${c.with}` : `Answered by ${c.with}`)}</a>
         <small>${Number(c.n || 0).toLocaleString()} pages</small><span>${esc(c.summary)}</span></li>`).join("")}</ul>`));
    }
    if (Array.isArray(d.compare) && d.compare.length) {
      parts.push(fold("Compared with", d.compare.length, `<ul class="rn-list">${d.compare.map((c) =>
        `<li><a href="${desk(room, c.with_room)}">${esc(c.with)}</a><span>${esc(c.summary)}</span></li>`).join("")}</ul>`));
    }
    if (!parts.length) return "";
    return parts.join("") + `<p class="rx-note rn-note">Library notes: machine-written from the authors' own pages; open the compare desk for the pages behind each.</p>`;
  }

  const cache = new Map();
  let busy = false;
  async function draw() {
    const room = roomOf();
    const bar = document.querySelector(".ridbar");
    if (!room || !bar || busy) return;
    const old = document.getElementById("rnNotes");
    if (old && old.dataset.room === room) return;
    busy = true;
    try {
      if (!cache.has(room)) cache.set(room, await getJSON(`${BASE}/v1/enrich/authors/${encodeURIComponent(room)}.json`));
      const d = cache.get(room);
      if (old) old.remove();
      if (!d || roomOf() !== room || !document.querySelector(".ridbar")) return;
      const body = html(d, room);
      if (!body) return;
      const box = document.createElement("section");
      box.id = "rnNotes";
      box.className = "rn-notes";
      box.dataset.room = room;
      box.innerHTML = body;
      const bio = document.querySelector(".ridbar ~ details.rx-author-bio");
      const after = bio || document.querySelector(".ridbar");
      after.parentNode.insertBefore(box, after.nextSibling);
    } finally {
      busy = false;
    }
  }

  // The room is drawn by authors.in03.js on its own schedule and redrawn on
  // every route, so this checks for the header rather than racing it.
  setInterval(draw, 700);
  addEventListener("hashchange", draw);
})();
