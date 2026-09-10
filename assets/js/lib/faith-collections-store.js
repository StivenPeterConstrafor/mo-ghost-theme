/*
 * The Faith Received — collections, in one place.
 *
 * A collection is a NAMED GROUP OF NOTEBOOK ENTRIES: the collection
 * strip inside the Notebook workspace, which was the /pins/ page until
 * it became clear it had always been a filter over the notebook rather
 * than a second place to keep things. Ported from the corpus
 * owner's `fr_collections_v1` store, which kept
 * [{id,name,items:[…],edges:[…],memo,sort}] and held the saved records
 * themselves inside each collection.
 *
 * WHAT CHANGED IN THE PORT, AND WHY. His `items` are whole saved
 * records — slug, page, title, note, the lot. Ours are ENTRY IDS into
 * window.MOFaithNotebook (assets/js/lib/faith-notebook-store.js), and
 * nothing here ever copies an entry's fields.
 *
 * That is not tidiness. This theme already has exactly one definition
 * of what a kept passage looks like, and that file's header says in as
 * many words that nothing outside it may read or write `fr_notebook`.
 * Storing the passage a second time inside a collection would be the
 * drift that file was factored out to prevent: the reader edits a note
 * in the notebook panel, the copy inside the collection keeps the old
 * text, and the reader is shown two different versions of their own
 * work with no way to tell which is current. A collection here is
 * therefore membership and nothing else — a name, a memo, an ordered
 * list of ids, and the relations drawn between them.
 *
 * The cost is that an id can dangle: the notebook caps at 500 entries
 * and removing one does not walk the collections. So resolve() drops
 * ids the notebook no longer has, and every surface renders what
 * resolve() returns rather than the raw list. An entry that has gone is
 * simply not in its collection any more, which is the truth.
 *
 * THE SHAPE. localStorage, per browser, key `fr_collections`:
 *
 *   { id     "c" + base36 time + base36 random
 *     name   the reader's own name for it, capped at 60 chars
 *     memo   working notes for the collection, capped at 2000
 *     items  [entryId …] — ORDER IS THE READER'S ORDER, see below
 *     edges  [{a,b,rel}] — a directed relation between two of its own
 *            items. Same vocabulary as MOFaithNotebook.RELATIONS.
 *     sort   "" (the reader's own order) | "author" (grouped)
 *     at     YYYY-MM-DD }
 *
 * ON ORDER. `items` is in the reader's hand order, oldest-first as
 * added, and move() is the only thing that reorders it. This is the
 * opposite of the notebook's own list, which is newest-first because it
 * is a log. A collection is an argument being assembled, so the order
 * is a claim the reader is making and nothing may re-sort it in place.
 * `sort: "author"` is a VIEW applied at render time; it never rewrites
 * `items`, so switching to author grouping and back is lossless.
 *
 * THE ACTIVE COLLECTION. `fr_collections_active` holds the id of the
 * collection new pins land in. Separate key on purpose: it is a piece
 * of UI state, it changes far more often than the collections do, and a
 * failed write of it must never risk the collections themselves.
 */
(function () {
  "use strict";

  // Three self-contained partials on the Research page each declare the
  // stores they need, so this file is on that page twice. Defining it
  // twice was harmless while every function here reads localStorage on
  // every call and holds nothing in memory — but a consumer captures
  // `window.MOFaithCollections` in a const on its first line, and the
  // moment anything in here gains a cache the second definition becomes
  // a second, diverging copy. First one wins, which on that page is the
  // one loaded immediately after the notebook store, which is the order
  // RELATIONS below needs.
  if (window.MOFaithCollections) return;

  const KEY = "fr_collections";
  const ACTIVE_KEY = "fr_collections_active";

  const MAX_COLLECTIONS = 60;
  const MAX_NAME = 60;
  const MAX_MEMO = 2000;
  const MAX_ITEMS = 500;
  const MAX_EDGES = 500;

  // The same five the notebook's constellations use. Kept as a
  // reference to MOFaithNotebook rather than a second literal: two
  // vocabularies for one relation is how a shared link stops opening.
  const RELATIONS = (window.MOFaithNotebook && window.MOFaithNotebook.RELATIONS)
    || ["supports", "contests", "cites", "expands", "parallels"];

  function newId() {
    return `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  }

  /* ── Reading and writing ─────────────────────────────────────── */

  // Every collection that comes off disk goes through this, so a
  // hand-edited or half-written record cannot reach a render. A row
  // that cannot be repaired is dropped rather than guessed at.
  function normalise(c) {
    if (!c || typeof c !== "object") return null;
    const id = String(c.id || "");
    if (!id) return null;
    return {
      id,
      name: String(c.name || "Untitled collection").slice(0, MAX_NAME),
      memo: String(c.memo == null ? "" : c.memo).slice(0, MAX_MEMO),
      items: Array.isArray(c.items) ? c.items.map(String).slice(0, MAX_ITEMS) : [],
      edges: Array.isArray(c.edges)
        ? c.edges
          .filter((e) => e && e.a && e.b)
          .map((e) => ({ a: String(e.a), b: String(e.b), rel: String(e.rel || "parallels") }))
          .slice(0, MAX_EDGES)
        : [],
      sort: c.sort === "author" ? "author" : "",
      at: String(c.at || new Date().toISOString().slice(0, 10)),
    };
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return [];
      return list.map(normalise).filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  // Returns true only on a real write. Every caller that changes
  // something a reader typed checks this: a silent false here is a note
  // the reader believes is saved and is not.
  function save(list) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_COLLECTIONS)));
      return true;
    } catch (_) {
      return false;
    }
  }

  /* ── The active collection ───────────────────────────────────── */

  function activeId() {
    try {
      return window.localStorage.getItem(ACTIVE_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function setActive(id) {
    try {
      window.localStorage.setItem(ACTIVE_KEY, String(id || ""));
    } catch (_) { /* UI state — never worth failing a save over */ }
  }

  /* ── Collections ─────────────────────────────────────────────── */

  function create(name) {
    const list = load();
    const c = normalise({
      id: newId(),
      name: String(name || "").trim().slice(0, MAX_NAME) || "New collection",
      items: [],
    });
    list.push(c);
    if (!save(list)) return null;
    return c;
  }

  function update(id, fields) {
    const list = load();
    const hit = list.filter((c) => c.id === id)[0];
    if (!hit) return null;
    if (fields.name != null) hit.name = String(fields.name).trim().slice(0, MAX_NAME) || hit.name;
    if (fields.memo != null) hit.memo = String(fields.memo).slice(0, MAX_MEMO);
    if (fields.sort !== undefined) hit.sort = fields.sort === "author" ? "author" : "";
    if (!save(list)) return null;
    return hit;
  }

  function remove(id) {
    const list = load().filter((c) => c.id !== id);
    if (!save(list)) return null;
    if (activeId() === id) setActive(list.length ? list[0].id : "");
    return list;
  }

  /* ── Items ───────────────────────────────────────────────────── */

  // Adding an entry that is already in the collection is a no-op rather
  // than a duplicate row: the same passage twice in one argument is
  // never what was meant, and a duplicate would give two identical
  // cards with no way to tell which the relations point at.
  function add(collectionId, entryId) {
    const list = load();
    const hit = list.filter((c) => c.id === collectionId)[0];
    if (!hit) return null;
    const id = String(entryId);
    if (hit.items.indexOf(id) === -1) hit.items.push(id);
    if (!save(list)) return null;
    return hit;
  }

  // Drops the item AND every relation that touched it, for the same
  // reason MOFaithNotebook.remove() does: an edge to something no
  // longer here is an invisible row that still counts toward the cap
  // and would be re-encoded into any share link made afterwards.
  function removeItem(collectionId, entryId) {
    const list = load();
    const hit = list.filter((c) => c.id === collectionId)[0];
    if (!hit) return null;
    const id = String(entryId);
    hit.items = hit.items.filter((x) => x !== id);
    hit.edges = hit.edges.filter((e) => e.a !== id && e.b !== id);
    if (!save(list)) return null;
    return hit;
  }

  // Moves one item by `delta` places within its collection. Clamped
  // rather than wrapped: a card at the top that jumps to the bottom
  // because the reader pressed Up once too often is a reorder nobody
  // asked for and there is no undo.
  function move(collectionId, entryId, delta) {
    const list = load();
    const hit = list.filter((c) => c.id === collectionId)[0];
    if (!hit) return null;
    const from = hit.items.indexOf(String(entryId));
    if (from === -1) return null;
    const to = from + (delta > 0 ? 1 : -1);
    if (to < 0 || to >= hit.items.length) return hit;
    const moved = hit.items.splice(from, 1)[0];
    hit.items.splice(to, 0, moved);
    if (!save(list)) return null;
    return hit;
  }

  /* ── Edges ───────────────────────────────────────────────────── */

  function addEdge(collectionId, a, b, rel) {
    const list = load();
    const hit = list.filter((c) => c.id === collectionId)[0];
    if (!hit || a === b) return null;
    const relation = RELATIONS.indexOf(rel) === -1 ? "parallels" : rel;
    // Both ends must be in this collection. An edge to something
    // outside it cannot be drawn and cannot be shared.
    if (hit.items.indexOf(String(a)) === -1 || hit.items.indexOf(String(b)) === -1) return null;
    hit.edges.push({ a: String(a), b: String(b), rel: relation });
    if (!save(list)) return null;
    return hit;
  }

  function removeEdge(collectionId, index) {
    const list = load();
    const hit = list.filter((c) => c.id === collectionId)[0];
    if (!hit) return null;
    hit.edges.splice(index, 1);
    if (!save(list)) return null;
    return hit;
  }

  /* ── Resolution ──────────────────────────────────────────────── */

  // A collection's ids joined to the notebook's entries, in the
  // reader's own order, with ids the notebook no longer holds dropped.
  // Every surface renders THIS and never `collection.items` directly.
  function resolve(collection) {
    const NB = window.MOFaithNotebook;
    if (!collection || !NB) return [];
    const byId = new Map();
    NB.load().forEach((e) => byId.set(e.id, e));
    return collection.items.map((id) => byId.get(id)).filter(Boolean);
  }

  // Entries that are in no collection at all. Shown as their own group
  // so that a passage kept while reading is never invisible merely
  // because the reader has not filed it yet.
  function unfiled() {
    const NB = window.MOFaithNotebook;
    if (!NB) return [];
    const filed = new Set();
    load().forEach((c) => c.items.forEach((id) => filed.add(id)));
    return NB.load().filter((e) => !filed.has(e.id));
  }

  // Which collections hold this entry. The notebook panel uses it to
  // show a passage's filing without loading every collection itself.
  function collectionsFor(entryId) {
    const id = String(entryId);
    return load().filter((c) => c.items.indexOf(id) !== -1);
  }

  window.MOFaithCollections = {
    KEY,
    ACTIVE_KEY,
    MAX_NAME,
    MAX_MEMO,
    RELATIONS,
    newId,
    load,
    save,
    activeId,
    setActive,
    create,
    update,
    remove,
    add,
    removeItem,
    move,
    addEdge,
    removeEdge,
    resolve,
    unfiled,
    collectionsFor,
  };
})();
