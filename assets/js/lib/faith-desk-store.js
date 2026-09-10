/*
 * The Faith Received — the Desk's documents, in one place.
 *
 * A Desk document is a piece the reader is WRITING, with passages from
 * the library quoted into it. Ported from the corpus owner's `fr_docs`
 * store ({v:1,docs:[{id,ts,title,html}]}), which his Desk read and
 * wrote inline.
 *
 * This is the one store in the port that genuinely holds new content
 * rather than references. A collection (faith-collections-store.js)
 * points at notebook entries and a saved Compare view is only an
 * address, so both can be rebuilt from other things. A draft cannot.
 * Everything here is the reader's own prose and exists nowhere else,
 * which sets the rules the rest of this file follows.
 *
 * IT NEVER EVICTS. MOFaithNotebook drops the oldest half of the
 * notebook rather than fail a save, because a clipped passage can be
 * clipped again from a book that has not moved. That trade is wrong
 * here: the oldest half of someone's drafts is the half they finished.
 * put() returns false on a full quota and the Desk says so on screen,
 * with the text still in the editor and an export button beside the
 * message. A write that cannot happen must never look like one that did.
 *
 * THE SHAPE. localStorage, key `fr_desk_docs`:
 *
 *   { v     1 — the envelope's version, carried through untouched so a
 *           later format can be told apart from this one
 *     docs  [{ id          "d" + base36 time + base36 random
 *              title       the reader's own, or "Untitled paper"
 *              html        the editor's innerHTML
 *              collection  id of the collection this paper works from,
 *                          or "" — see below
 *              ts          epoch ms of the last save }] }
 *
 * Newest-first: put() unshifts the touched document, so array order is
 * recency order and the rail needs no sort key.
 *
 * ON `collection`. A paper is usually written out of one collection,
 * and the Desk's research rail defaults to it rather than to everything
 * the reader has ever kept. It is a DEFAULT and not a constraint:
 * nothing stops a paper quoting a passage from another collection, and
 * a collection that has since been deleted degrades to "all", never to
 * an empty rail. A paper whose sources look like they vanished is worse
 * than a paper showing more sources than it strictly needs.
 *
 * ON `html`. Written by document.execCommand into a contenteditable, so
 * it is the browser's own markup and not arbitrary input, but it is
 * still markup being put back with innerHTML on load. The Desk sanitises
 * on the way IN, never on the way out — see the note over insertHtml()
 * in assets/js/page/faith-desk.js. Nothing here may be rendered by any
 * other surface.
 */
(function () {
  "use strict";

  // Two self-contained partials on the Research page (Compare, which
  // writes a draft when it hands one to the Desk, and the Desk itself)
  // each declare this store, so the file is on that page twice.
  // Defining it twice is harmless while every function here reads
  // localStorage on every call and holds nothing in memory — but
  // consumers capture `window.MOFaithDesk` in a const on their first
  // line, and the moment anything in here gains a cache the second
  // definition becomes a second, diverging copy. First one wins.
  if (window.MOFaithDesk) return;

  const KEY = "fr_desk_docs";
  const CONTEXT_KEY = "fr_desk_context";

  const MAX_DOCS = 100;
  const MAX_TITLE = 160;

  function newId() {
    return `d${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  }

  function normalise(d) {
    if (!d || typeof d !== "object") return null;
    const id = String(d.id || "");
    if (!id) return null;
    return {
      id,
      title: String(d.title || "Untitled paper").slice(0, MAX_TITLE),
      html: typeof d.html === "string" ? d.html : "",
      collection: String(d.collection || ""),
      ts: Number(d.ts) || Date.now(),
    };
  }

  function all() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const env = raw ? JSON.parse(raw) : null;
      const list = env && Array.isArray(env.docs) ? env.docs : [];
      return list.map(normalise).filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  // The whole list, written whole. Returns false rather than throwing,
  // and rather than dropping anything to make room — see the header.
  // The envelope's own `v` is read back and carried through so that a
  // future version written by a newer build is not silently downgraded
  // by this one.
  function put(list) {
    let version = 1;
    try {
      const raw = window.localStorage.getItem(KEY);
      const env = raw ? JSON.parse(raw) : null;
      if (env && env.v) version = env.v;
    } catch (_) { /* unreadable envelope — write a fresh v1 below */ }
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: version, docs: list.slice(0, MAX_DOCS) }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function get(id) {
    return all().filter((d) => d.id === id)[0] || null;
  }

  function create(fields) {
    const doc = normalise({ ...(fields || {}), id: newId(), ts: Date.now() });
    if (!put([doc].concat(all()))) return null;
    return doc;
  }

  // Read-modify-write of one document, moving it to the front. Returns
  // null on a failed write so the caller can tell the reader; the Desk
  // treats that as "keep the text on screen and offer an export".
  function update(id, fields) {
    const list = all();
    const hit = list.filter((d) => d.id === id)[0];
    if (!hit) return null;
    if (fields.title != null) hit.title = String(fields.title).slice(0, MAX_TITLE) || "Untitled paper";
    if (fields.html != null) hit.html = String(fields.html);
    if (fields.collection !== undefined) hit.collection = String(fields.collection || "");
    hit.ts = Date.now();
    if (!put([hit].concat(list.filter((d) => d.id !== id)))) return null;
    return hit;
  }

  function remove(id) {
    const list = all().filter((d) => d.id !== id);
    if (!put(list)) return null;
    return list;
  }

  /* ── Which paper was last open ───────────────────────────────── */

  // Its own key, like the collections' active id and for the same
  // reason: it changes on every document switch and a failed write of
  // it must never put a draft at risk.
  function context() {
    try {
      return JSON.parse(window.localStorage.getItem(CONTEXT_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function setContext(docId) {
    try {
      window.localStorage.setItem(CONTEXT_KEY, JSON.stringify({ docId: String(docId || ""), ts: Date.now() }));
    } catch (_) { /* UI state */ }
  }

  /* ── Export ──────────────────────────────────────────────────── */

  // The editor's markup as Markdown. Deliberately a small, explicit
  // walk rather than a general converter: the editor only ever produces
  // the seven blocks its toolbar makes, plus the <blockquote><cite>
  // pairs the insert path writes, and an unknown element yields its
  // text rather than being dropped.
  function toMarkdown(node) {
    let out = "";
    Array.prototype.forEach.call(node.childNodes, (n) => {
      if (n.nodeType === 3) { out += n.textContent; return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      const inner = toMarkdown(n);
      if (tag === "h2") out += `\n## ${inner.trim()}\n\n`;
      else if (tag === "h3") out += `\n### ${inner.trim()}\n\n`;
      else if (tag === "b" || tag === "strong") out += `**${inner}**`;
      else if (tag === "i" || tag === "em") out += `*${inner}*`;
      else if (tag === "blockquote") out += `\n${inner.trim().split("\n").map((l) => `> ${l}`).join("\n")}\n\n`;
      else if (tag === "cite") out += `\n— ${inner.trim()}`;
      else if (tag === "a") out += `[${inner}](${n.getAttribute("href") || ""})`;
      else if (tag === "li") out += `- ${inner.trim()}\n`;
      else if (tag === "ul" || tag === "ol") out += `\n${inner}\n`;
      else if (tag === "p" || tag === "div") out += `${inner.trim()}\n\n`;
      else if (tag === "br") out += "\n";
      else out += inner;
    });
    return out;
  }

  window.MOFaithDesk = {
    KEY,
    MAX_TITLE,
    newId,
    all,
    put,
    get,
    create,
    update,
    remove,
    context,
    setContext,
    toMarkdown,
  };
})();
