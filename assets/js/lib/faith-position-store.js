/*
 * The Faith Received — every PLACE in a work, in one place.
 *
 * "Notebook saves the text and bookmarks saves the place." (Ian, and
 * it is a better statement of the boundary than anything that was
 * written here before.) So: passages belong to
 * assets/js/lib/faith-notebook-store.js and nothing outside that file
 * may define a kept passage. Places belong here, and there is exactly
 * one store for them.
 *
 * TWO KINDS OF PLACE, ONE RECORD. They are the same kind of thing, and
 * splitting them across two stores would have produced two systems both
 * claiming to know where the reader is:
 *
 *   the stop   where reading stopped, recorded on the reader's behalf
 *              as they scroll. One per work, because "where I stopped"
 *              is a single fact that a second stop replaces.
 *   a mark     a place the reader chose, from the Bookmark button at
 *              the foot of a section. MANY per work, because places
 *              are not exclusive: marking a second section must not
 *              silently discard the first.
 *
 * places() returns both, each carrying `kind`, which is the flag that
 * tells them apart. Everything else about them is identical.
 *
 * A MARK IS NOT A WORK BOOKMARK, AND THIS FILE DOES NOT OWN THOSE.
 * Which WORKS are bookmarked lives in the mo-kit Worker's KV, per
 * member, keyed "tfr:<corpus>:<work>", and is fetched and written by
 * assets/js/lib/faith-work-bookmarks.js. That split is forced rather
 * than chosen: `GET /bookmarks?ids_only=1` hands back bare strings and
 * a bookmark has no field to carry an anchor, so a place cannot ride in
 * KV without a worker change. The consequence is stated on screen
 * rather than hidden (see partials/faith-received/_bookmarks-panel.hbs):
 * the work follows the reader between devices and the places in it do
 * not. If bookmarks ever grow a place field, this file is what gets
 * replaced and every surface follows without being rewritten.
 *
 * A work bookmark and a section bookmark differ only in precision. Both
 * write the same KV id; the section one additionally writes a mark
 * here. That is why bookmarking from a browse row and bookmarking from
 * inside the reader cannot produce two competing records.
 *
 * WHAT IS STORED. One localStorage key, `fr_positions`, holding an
 * object keyed `<corpus>|<work>` — the same key shape the Notebook
 * workspace groups by:
 *
 *   { "pld|2741": { p: 57, a: "section-12", t: 1756900000000,
 *                   m: [ { a: "section-19", c: "Book I, ch. 3",
 *                          t: 1756900000000 }, … ] }, … }
 *
 *     p  printed page, or null. ONLY ever set where the reader could
 *        prove a section covers it (see below).
 *     a  the anchor: the block's data-src-id, or its DOM id, or the
 *        id of the section that holds it.
 *     t  when the record was last touched, which is the eviction order.
 *     m  the marks, newest first. Each has the same `a` as the stop,
 *        plus `c`, a SHORT LABEL — a heading or a citation, never the
 *        passage. A mark that copied the text would be a second copy of
 *        a notebook entry, drifting the moment the notebook one is
 *        edited. See MAX_CITE.
 *
 * Records written before marks existed simply have no `m`, which reads
 * as a work with a stop and no marks. Nothing needs migrating.
 *
 * WHY THE PAGE IS OFTEN NULL. `?p=` is not a universal locator. It
 * works because openInitialSection() finds the section whose
 * [data-from, data-to) covers the page, and opens THAT. Early English
 * Books renders sections with no data-from at all, so a `?p=` there
 * resolves to nothing and the reader lands at the top of the work
 * having been promised otherwise. So the page is written only when the
 * capturing side has already found the section that covers it, which
 * makes a `?p=` that cannot resolve structurally impossible rather
 * than merely unlikely. Everything else addresses by fragment, which
 * is the convention already in hitUrl() (faith-browse-search.js) and
 * readerUrl() (faith-notebook-store.js).
 *
 * THE RESTORE URL. Built by appendTo(), which takes a reader URL that
 * someone else already owns — the catalogue's own `url`, or the one
 * pushRecent() builds — and adds the locator to it:
 *
 *   paginated    /the-faith-received/reader/?c=pld&w=2741&p=57
 *   unpaginated  /the-faith-received/reader/?c=pld&w=2741#r42942
 *   no position  the URL exactly as it arrived, never a dead link
 *
 * Both are already handled by openInitialSection(); no new parameter
 * was invented for this and none is needed. In particular NOT `?q=`,
 * which has two consumers in the reader and one of them opens the Find
 * bar.
 *
 * WHICH PLACE A LINK RESUMES TO is the calling surface's business, not
 * this file's, so appendTo() takes it as an argument:
 *
 *   "stop" (default)  the Library's "Continue reading" shelf. That row
 *                     means "carry on", so it goes where reading
 *                     stopped even if the work also has marks.
 *   "mark"            the Bookmarks panel's work row. That row means
 *                     "the thing I saved", so the newest mark wins and
 *                     the stop is the fallback.
 *
 * The default keeps every existing caller doing exactly what it did.
 */
(function () {
  "use strict";

  const KEY = "fr_positions";
  // Positions are small (~60 bytes each) but this is a 68,724-work
  // library and the map is never pruned by anything else.
  const MAX = 120;
  // Marks per work. A reader working through Calvin can reasonably mark
  // a few dozen places; past this the oldest go, in the same
  // oldest-first way whole records do.
  const MAX_MARKS = 60;
  // The label on a mark is a heading or a citation. Capped low on
  // purpose: the cap is what stops a "label" from quietly becoming a
  // copy of the passage, which is the notebook's job and not this
  // file's.
  const MAX_CITE = 140;
  const MAX_ANCHOR = 200;

  const KINDS = { STOP: "stop", MARK: "mark" };

  const keyFor = (corpus, work) => `${String(corpus || "tfr")}|${String(work || "")}`;

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const map = raw ? JSON.parse(raw) : {};
      return map && typeof map === "object" && !Array.isArray(map) ? map : {};
    } catch (_) {
      return {};
    }
  }

  function save(map) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(map));
      return true;
    } catch (_) {
      return false;
    }
  }

  // Oldest first out. A reader who has 120 works on the go is not the
  // case being designed for; a reader whose oldest position quietly
  // ages out is.
  //
  // `t` is the record's LAST TOUCH, bumped by both a stop and a mark,
  // so a work the reader only ever marks is not evicted as though it
  // had been abandoned.
  function prune(map) {
    const keys = Object.keys(map);
    if (keys.length <= MAX) return map;
    keys
      .sort((a, b) => (map[b].t || 0) - (map[a].t || 0))
      .slice(MAX)
      .forEach((k) => { delete map[k]; });
    return map;
  }

  // The stored record for a work, or a fresh empty one. Never returns
  // null, so every writer below can treat "no record yet" and "a record
  // with nothing in it" as the same case.
  function record(map, corpus, work) {
    const hit = map[keyFor(corpus, work)];
    if (hit && typeof hit === "object" && !Array.isArray(hit)) return hit;
    return { p: null, a: "", t: 0 };
  }

  function cleanAnchor(s) {
    return String(s == null ? "" : s).trim().slice(0, MAX_ANCHOR);
  }

  // The STOP only. Never returns a half-record: a stored value that has
  // neither a usable page nor a usable anchor is the same as no
  // position at all, and saying so here keeps every caller from
  // re-checking. `at` is the record's last touch rather than the stop's
  // own capture time, which is the same thing for every existing caller
  // (none of them reads it) and is why it is not worth a second field.
  function get(corpus, work) {
    if (!work) return null;
    const hit = load()[keyFor(corpus, work)];
    if (!hit || typeof hit !== "object") return null;
    const page = typeof hit.p === "number" && isFinite(hit.p) && hit.p > 0 ? hit.p : null;
    const anchor = typeof hit.a === "string" ? hit.a : "";
    if (!page && !anchor) return null;
    return { page, anchor, at: typeof hit.t === "number" ? hit.t : 0 };
  }

  // `page` is the caller's promise that a section covering it exists.
  // Anything that is not a positive finite number is stored as null
  // rather than coerced, because a `?p=NaN` is a worse answer than no
  // page at all.
  function set(corpus, work, pos) {
    if (!work) return false;
    const page = pos && typeof pos.page === "number" && isFinite(pos.page) && pos.page > 0
      ? Math.floor(pos.page) : null;
    const anchor = pos && typeof pos.anchor === "string" ? pos.anchor.slice(0, MAX_ANCHOR) : "";
    if (!page && !anchor) return false;
    const map = load();
    // Read-modify-write, NOT a fresh literal. This runs every 1.5s of
    // scrolling; assigning a new object here would have wiped the
    // reader's marks the moment they scrolled after making one.
    const rec = record(map, corpus, work);
    rec.p = page;
    rec.a = anchor;
    rec.t = Date.now();
    map[keyFor(corpus, work)] = rec;
    return save(prune(map));
  }

  function clear(corpus, work) {
    const map = load();
    delete map[keyFor(corpus, work)];
    save(map);
  }

  /* ── Marks: the places the reader chose ──────────────────────── */

  // Newest first, and shaped like get()'s return so a caller can treat
  // a mark and the stop the same way. A stored mark with no anchor is
  // no place at all and is dropped here rather than by every caller.
  function marks(corpus, work) {
    if (!work) return [];
    const hit = load()[keyFor(corpus, work)];
    const list = hit && Array.isArray(hit.m) ? hit.m : [];
    return list
      .filter((m) => m && typeof m.a === "string" && m.a)
      .map((m) => ({
        kind: KINDS.MARK,
        page: null,
        anchor: m.a,
        cite: typeof m.c === "string" ? m.c : "",
        at: typeof m.t === "number" ? m.t : 0,
      }));
  }

  function latestMark(corpus, work) {
    return marks(corpus, work)[0] || null;
  }

  function hasMark(corpus, work, anchor) {
    const want = cleanAnchor(anchor);
    if (!want) return false;
    return marks(corpus, work).some((m) => m.anchor === want);
  }

  // Adding a mark that already exists MOVES it to the front rather than
  // duplicating it: the anchor is the identity of the place, and a
  // section can only be marked once. Returns true when a mark exists
  // afterwards, which is what a toggling button paints.
  function addMark(corpus, work, mark) {
    const anchor = cleanAnchor(mark && mark.anchor);
    if (!work || !anchor) return false;
    const map = load();
    const rec = record(map, corpus, work);
    const list = (Array.isArray(rec.m) ? rec.m : []).filter((m) => m && m.a !== anchor);
    list.unshift({
      a: anchor,
      c: String((mark && mark.cite) || "").replace(/\s+/g, " ").trim().slice(0, MAX_CITE),
      t: Date.now(),
    });
    rec.m = list.slice(0, MAX_MARKS);
    rec.t = Date.now();
    map[keyFor(corpus, work)] = rec;
    return save(prune(map));
  }

  // Removing the last mark leaves the record alone. It may still hold a
  // stop, and a work with no marks is not a work nobody has read.
  function removeMark(corpus, work, anchor) {
    const want = cleanAnchor(anchor);
    if (!work || !want) return false;
    const map = load();
    const key = keyFor(corpus, work);
    const rec = map[key];
    if (!rec || !Array.isArray(rec.m)) return false;
    rec.m = rec.m.filter((m) => m && m.a !== want);
    map[key] = rec;
    save(map);
    return true;
  }

  // Returns the state AFTER the toggle, which is what the button paints.
  function toggleMark(corpus, work, mark) {
    const anchor = cleanAnchor(mark && mark.anchor);
    if (!work || !anchor) return false;
    if (hasMark(corpus, work, anchor)) {
      removeMark(corpus, work, anchor);
      return false;
    }
    addMark(corpus, work, mark);
    return true;
  }

  // Every place in one work, marks first and the stop last, each
  // carrying `kind`. The Bookmarks panel renders this list under the
  // work it belongs to; the order is "what I chose, then where I got
  // to", which is how a reader looking at a saved work reads it.
  function places(corpus, work) {
    const out = marks(corpus, work);
    const stop = get(corpus, work);
    if (stop) out.push({ kind: KINDS.STOP, page: stop.page, anchor: stop.anchor, cite: "", at: stop.at });
    return out;
  }

  /* ── The restore URL ─────────────────────────────────────────── */

  // Only reader links get a locator. A locator on anything else is at
  // best meaningless and at worst a `p=` landing in someone's search
  // query, so a URL that is not the reader is handed back untouched.
  const READER_PATH = "/the-faith-received/reader/";

  function isReaderUrl(url) {
    const s = String(url || "");
    // Absolute or relative; either way the path is what decides.
    try {
      const u = new URL(s, window.location.origin);
      return u.pathname === READER_PATH;
    } catch (_) {
      return s.indexOf(READER_PATH) === 0;
    }
  }

  // The locator is appended to a URL somebody else built, so the only
  // parts written here are a number and an encoded anchor. Neither can
  // introduce a scheme, a host, or a second fragment, which is why this
  // is safe to run AFTER MOSafeHref has passed the base URL: appending
  // "#r42942" to a sanitized link cannot unsanitize it.
  // `prefer` is "stop" (the default, and what every caller written
  // before marks existed gets) or "mark". See the header note on which
  // surface asks for which.
  function appendTo(url, corpus, work, prefer) {
    const base = String(url || "");
    if (!base || !isReaderUrl(base)) return base;
    const pos = prefer === KINDS.MARK
      ? (latestMark(corpus, work) || get(corpus, work))
      : get(corpus, work);
    if (!pos) return base;
    // A URL that already carries a locator was built by someone with
    // more information than we have — a search hit, a citation link —
    // and is left alone.
    if (base.indexOf("#") >= 0 || /[?&]p=/.test(base)) return base;
    if (pos.page) {
      return `${base}${base.indexOf("?") >= 0 ? "&" : "?"}p=${encodeURIComponent(pos.page)}`;
    }
    return `${base}#${encodeURIComponent(pos.anchor)}`;
  }

  // True where appendTo() would actually add something — the question
  // a surface asks before it prints "picks up where you left off".
  function has(corpus, work, prefer) {
    if (prefer === KINDS.MARK && latestMark(corpus, work)) return true;
    return !!get(corpus, work);
  }

  window.MOFaithPosition = {
    KEY,
    MAX,
    MAX_MARKS,
    MAX_CITE,
    KINDS,
    keyFor,
    load,
    get,
    set,
    clear,
    has,
    appendTo,
    isReaderUrl,
    marks,
    latestMark,
    hasMark,
    addMark,
    removeMark,
    toggleMark,
    places,
  };
})();
