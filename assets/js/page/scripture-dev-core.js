/*
 * /the-faith-received/scripture/ — shared core for the Scripture reader and Verse Desk.
 *
 * Two pages load this: the chapter reader (scripture-dev.js) and the
 * Verse Desk (scripture-dev-desk.js). Everything both of them need lives
 * here once: the canon table, the address format, the two data sources,
 * the filter controls, and the source row with its inline preview.
 *
 * TWO DATA SOURCES, NEVER MIXED.
 *   - Scripture text comes from mo-bible (bolls.life), in the reader's
 *     chosen translation. It is display text and nothing else.
 *   - Citations come from mo-tfr-verse, a read-only worker over the
 *     library's per-verse shards. It merges the capped shard with its
 *     .more companion server-side, so the counts, filters and top five
 *     cover every citation rather than the first thousand, and the
 *     browser never downloads a 5 MB chapter to answer one verse.
 *   The citation data is numbered as the ASV numbers verses. The five
 *   translations offered here share that numbering outside a handful of
 *   verses (chiefly Psalm superscriptions), so a verse number is passed
 *   straight across.
 *
 * ONE ADDRESS FOR EVERY VERSE. ?ref=john.3.16 (or john.3 for a chapter)
 * is read by one template per page. There is no page per verse: the
 * route is fixed and the verse is a query string, so all 31,102 verses
 * have a Verse Desk without 31,102 URLs existing anywhere.
 *
 * GIST IS NOT A QUOTATION. Citation rows carry `g`, a machine-written
 * description of the page. It is shown as a plain description in muted
 * type and never inside a blockquote. The only thing set as a quotation
 * is the passage the worker resolves from the work itself (Ian's ruling,
 * 2026-09-11: direct quotes only).
 *
 * NO SCROLL BOXES. Previews open in the page flow and take their own
 * height. The commentary strip scrolls sideways by Ian's request, and
 * the reader's sidebar scrolls on its own (sidebars are the recorded
 * exception, 2026-09-22). Nothing else here caps its height.
 */
(function () {
  "use strict";

  const VERSE_API = "https://mo-tfr-verse.mo-podcast-feed.workers.dev";
  const bibleMeta = document.querySelector('meta[name="mo-bible-base"]');
  const BIBLE_BASE = ((bibleMeta && bibleMeta.content) || "https://mo-bible.mo-podcast-feed.workers.dev").replace(/\/$/, "");
  const LS_TRANSLATION = "mo-scripture-dev:translation";

  // Ian, 2026-09-22: ESV, NIV, CSB, KJV, NASB. Codes are bolls.life's
  // (CSB is CSB17 there). ESV first because it is the default.
  const TRANSLATIONS = [
    ["ESV", "ESV", "English Standard Version"],
    ["NIV", "NIV", "New International Version"],
    ["CSB17", "CSB", "Christian Standard Bible"],
    ["KJV", "KJV", "King James Version"],
    ["NASB", "NASB", "New American Standard Bible"],
  ];

  // [address slug, display name, chapters, library slug]. Index + 1 is
  // the bolls book number. The address slug is the readable one in our
  // URLs; the library slug is what the citation shards are keyed by
  // (the library names its books as the ASV does: "I Samuel",
  // "Revelation of John").
  const BOOKS = [
    ["genesis", "Genesis", 50], ["exodus", "Exodus", 40], ["leviticus", "Leviticus", 27],
    ["numbers", "Numbers", 36], ["deuteronomy", "Deuteronomy", 34], ["joshua", "Joshua", 24],
    ["judges", "Judges", 21], ["ruth", "Ruth", 4], ["1-samuel", "1 Samuel", 31, "i-samuel"],
    ["2-samuel", "2 Samuel", 24, "ii-samuel"], ["1-kings", "1 Kings", 22, "i-kings"],
    ["2-kings", "2 Kings", 25, "ii-kings"], ["1-chronicles", "1 Chronicles", 29, "i-chronicles"],
    ["2-chronicles", "2 Chronicles", 36, "ii-chronicles"], ["ezra", "Ezra", 10],
    ["nehemiah", "Nehemiah", 13], ["esther", "Esther", 10], ["job", "Job", 42],
    ["psalms", "Psalms", 150], ["proverbs", "Proverbs", 31], ["ecclesiastes", "Ecclesiastes", 12],
    ["song-of-solomon", "Song of Solomon", 8], ["isaiah", "Isaiah", 66], ["jeremiah", "Jeremiah", 52],
    ["lamentations", "Lamentations", 5], ["ezekiel", "Ezekiel", 48], ["daniel", "Daniel", 12],
    ["hosea", "Hosea", 14], ["joel", "Joel", 3], ["amos", "Amos", 9], ["obadiah", "Obadiah", 1],
    ["jonah", "Jonah", 4], ["micah", "Micah", 7], ["nahum", "Nahum", 3], ["habakkuk", "Habakkuk", 3],
    ["zephaniah", "Zephaniah", 3], ["haggai", "Haggai", 2], ["zechariah", "Zechariah", 14],
    ["malachi", "Malachi", 4], ["matthew", "Matthew", 28], ["mark", "Mark", 16], ["luke", "Luke", 24],
    ["john", "John", 21], ["acts", "Acts", 28], ["romans", "Romans", 16],
    ["1-corinthians", "1 Corinthians", 16, "i-corinthians"],
    ["2-corinthians", "2 Corinthians", 13, "ii-corinthians"], ["galatians", "Galatians", 6],
    ["ephesians", "Ephesians", 6], ["philippians", "Philippians", 4], ["colossians", "Colossians", 4],
    ["1-thessalonians", "1 Thessalonians", 5, "i-thessalonians"],
    ["2-thessalonians", "2 Thessalonians", 3, "ii-thessalonians"],
    ["1-timothy", "1 Timothy", 6, "i-timothy"], ["2-timothy", "2 Timothy", 4, "ii-timothy"],
    ["titus", "Titus", 3], ["philemon", "Philemon", 1], ["hebrews", "Hebrews", 13],
    ["james", "James", 5], ["1-peter", "1 Peter", 5, "i-peter"], ["2-peter", "2 Peter", 3, "ii-peter"],
    ["1-john", "1 John", 5, "i-john"], ["2-john", "2 John", 1, "ii-john"],
    ["3-john", "3 John", 1, "iii-john"], ["jude", "Jude", 1],
    ["revelation", "Revelation", 22, "revelation-of-john"],
  ].map((b, i) => ({ slug: b[0], name: b[1], chapters: b[2], lib: b[3] || b[0], num: i + 1 }));
  const BOOK_BY_SLUG = new Map(BOOKS.map((b) => [b.slug, b]));

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;

  // ── Addresses ───────────────────────────────────────────────────
  // "john.3.16" | "john.3" -> {book, c, v}. Out-of-range chapters are
  // refused rather than clamped; the caller falls back to a default.
  function parseRef(raw) {
    const m = String(raw || "").trim().toLowerCase().match(/^([a-z0-9-]+)\.(\d{1,3})(?:\.(\d{1,3}))?$/);
    if (!m) return null;
    const book = BOOK_BY_SLUG.get(m[1]);
    const c = parseInt(m[2], 10);
    if (!book || !(c >= 1 && c <= book.chapters)) return null;
    const v = m[3] ? parseInt(m[3], 10) : 0;
    return { book, c, v: v > 0 ? v : 0 };
  }
  const refKey = (book, c, v) => `${book.slug}.${c}${v ? `.${v}` : ""}`;
  // "Psalm 23:1", not "Psalms 23:1": a single psalm takes the singular.
  /* Addresses from before the swap (Ian, 2026-09-22: this reader became
   * /the-faith-received/scripture/). Links across the site still use the
   * old forms, so the reader reads them rather than breaking them:
   *   ?book=John&chapter=3#v16      the old Scripture Index and /bible/
   *   #ref-john-3 | #ref-i-corinthians-13   the old Index's anchors
   *   #b/<library slug>/<c>?v=16    the ported Bible (scripture-tools'
   *                                 bibleURL), after the forwarder
   * Book names and library slugs both resolve ("I Corinthians",
   * "i-corinthians", "1 Corinthians", "revelation-of-john"). */
  const ROMAN = { i: "1", ii: "2", iii: "3" };
  function bookFrom(raw) {
    let n = String(raw || "").trim().toLowerCase().replace(/[\s_]+/g, "-")
      .replace(/^(iii|ii|i)-/, (m, r) => `${ROMAN[r]}-`)
      .replace(/^(?:the-)?revelation(?:-of-(?:st\.?-?)?john)?$/, "revelation")
      .replace(/^(?:song-of-songs|canticles)$/, "song-of-solomon")
      .replace(/^psalm$/, "psalms");
    if (BOOK_BY_SLUG.has(n)) return BOOK_BY_SLUG.get(n);
    n = n.replace(/^([123])(?=[a-z])/, "$1-");
    return BOOK_BY_SLUG.get(n) || BOOKS.find((b) => b.lib === raw) || null;
  }
  function legacyRef(loc) {
    const l = loc || window.location;
    const qs = new URLSearchParams(l.search);
    const hash = String(l.hash || "").replace(/^#/, "");
    const mk = (b, c, v) => {
      const book = bookFrom(b);
      const cc = parseInt(c, 10);
      if (!book || !(cc >= 1 && cc <= book.chapters)) return null;
      const vv = parseInt(v, 10);
      return { book, c: cc, v: vv > 0 ? vv : 0 };
    };
    let m = hash.match(/^b\/([a-z0-9-]+)(?:\/(\d+))?(?:\?(.*))?$/i);
    if (m) return mk(m[1], m[2] || 1, new URLSearchParams(m[3] || "").get("v"));
    m = hash.match(/^ref-(.+)-(\d+)$/i);
    if (m) return mk(m[1], m[2], 0);
    if (qs.get("book")) return mk(qs.get("book"), qs.get("chapter") || 1, (hash.match(/^v(\d+)$/) || [])[1]);
    return null;
  }

  const refLabel = (book, c, v) => `${book.slug === "psalms" && c ? "Psalm" : book.name} ${c}${v ? `:${v}` : ""}`;
  const readerHref = (book, c, v, t) =>
    `/the-faith-received/scripture/?ref=${refKey(book, c, v)}${t ? `&t=${encodeURIComponent(t)}` : ""}`;
  const deskHref = (book, c, v, t) =>
    `/the-faith-received/scripture/desk/?ref=${refKey(book, c, v)}${t ? `&t=${encodeURIComponent(t)}` : ""}`;

  // The library's links are relative to its own reader ("/read?w=…").
  // Ours lives under /the-faith-received/read/. Anything that is not
  // one of those two shapes is dropped rather than trusted.
  function sourceHref(h, w, p) {
    const raw = String(h || "");
    let m = raw.match(/^\/read\/?\?(w=[^#]*)(#[A-Za-z0-9_.:-]*)?$/);
    if (m) return `/the-faith-received/read/?${m[1]}${m[2] || ""}`;
    m = raw.match(/^\/the-faith-received\/read\/\?w=[^#]*(#[A-Za-z0-9_.:-]*)?$/);
    if (m) return raw;
    if (w) return `/the-faith-received/read/?w=${encodeURIComponent(w)}${p ? `#b${encodeURIComponent(p)}-0` : ""}`;
    return "";
  }

  // ── Translations ────────────────────────────────────────────────
  function translationInfo(code) {
    const t = TRANSLATIONS.find((x) => x[0] === code);
    return t ? { code: t[0], short: t[1], name: t[2] } : null;
  }
  function recalledTranslation() {
    const q = new URLSearchParams(location.search).get("t");
    if (q && translationInfo(q)) return q;
    try {
      const s = localStorage.getItem(LS_TRANSLATION);
      if (s && translationInfo(s)) return s;
    } catch (e) { /* storage refused: fall through to the default */ }
    return "ESV";
  }
  function rememberTranslation(code) {
    try { localStorage.setItem(LS_TRANSLATION, code); } catch (e) { /* per-visit only */ }
  }

  // ── Scripture text (mo-bible) ───────────────────────────────────
  const chapterCache = new Map();
  function fetchChapterHtml(code, book, c) {
    const key = `${code}/${book.num}/${c}`;
    if (chapterCache.has(key)) return chapterCache.get(key);
    const p = fetch(`${BIBLE_BASE}/chapter/${encodeURIComponent(code)}/${book.num}/${c}`, { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        const html = d && d.data && d.data.content;
        if (!html) throw new Error("empty chapter");
        return html;
      });
    p.catch(() => chapterCache.delete(key));
    chapterCache.set(key, p);
    return p;
  }

  /* Strong's numbers are markup, not Scripture. Same shape test as
   * mo-bible.js: one number or a comma list, sometimes with a book name
   * glued on upstream. Anything with sentence punctuation survives. */
  const STRONGS = /^\s*[A-Za-z]*\d+\s*(?:,\s*[A-Za-z]*\d+\s*)*$/;
  function stripStrongs(root) {
    root.querySelectorAll("s, S").forEach((el) => { if (STRONGS.test(el.textContent || "")) el.remove(); });
  }
  const isMarker = (n) => n.nodeType === 1 && n.tagName === "SUP" && /^\d+$/.test((n.textContent || "").trim());
  function verseBlocks(root) {
    const found = Array.prototype.slice.call(root.querySelectorAll("p, .line"));
    if (!found.length) return [root];
    return found.filter((b) => !found.some((o) => o !== b && o.contains(b)));
  }

  /* Wrap every verse in a span the page can act on. Ported from
   * mo-bible.js's markVerses(), which already handles the two cases that
   * break the naive version: a verse that runs past a </p>, and poetry
   * that arrives as <div class="stanza"><span class="line">. Verse
   * numbers become visible <sup class="v"> so the old page's styling
   * applies unchanged. */
  function markVerses(root) {
    stripStrongs(root);
    let carry = 0;
    const idSeen = new Set();
    verseBlocks(root).forEach((block) => {
      const nodes = Array.prototype.slice.call(block.childNodes);
      if (!nodes.length) return;
      nodes.forEach((n) => block.removeChild(n));
      let span = null;
      const open = (v) => {
        span = document.createElement("span");
        span.className = "bible-verse";
        span.dataset.v = String(v);
        span.setAttribute("tabindex", "0");
        span.setAttribute("role", "button");
        if (!idSeen.has(v)) { span.id = `v${v}`; idSeen.add(v); }
        block.appendChild(span);
      };
      nodes.forEach((node) => {
        if (isMarker(node)) {
          carry = parseInt((node.textContent || "").trim(), 10);
          open(carry);
          node.classList.add("v");
          node.setAttribute("aria-hidden", "true");
        } else if (!span) {
          if (carry) open(carry); else { block.appendChild(node); return; }
        }
        span.appendChild(node);
      });
    });
  }

  /* Chapter HTML is upstream markup (bolls.life via mo-bible), so it is
   * sanitised to the few tags Scripture uses and nothing but `class`.
   * Fails CLOSED: with no DOMPurify (boot.min.js failed) the caller gets
   * null and shows its error rather than inserting raw HTML. */
  const CHAPTER_TAGS = ["p", "span", "div", "sup", "sub", "s", "br", "i", "em", "b", "strong", "h1", "h2", "h3", "h4", "small"];
  function cleanChapter(html) {
    if (!window.DOMPurify) return null;
    return window.DOMPurify.sanitize(html, { ALLOWED_TAGS: CHAPTER_TAGS, ALLOWED_ATTR: ["class"] });
  }

  function verseTextFrom(root, v) {
    return Array.prototype.slice.call(root.querySelectorAll(`.bible-verse[data-v="${Number(v)}"]`))
      .map((el) => {
        const copy = el.cloneNode(true);
        copy.querySelectorAll("sup").forEach((s) => s.remove());
        return (copy.textContent || "").trim();
      }).join(" ").replace(/\s+/g, " ").trim();
  }

  // One verse's text in one translation, by rendering the chapter off
  // screen and reading the verse back out. Used by the Desk's parallel
  // translations, which want five chapters and one verse from each.
  function fetchVerseText(code, book, c, v) {
    return fetchChapterHtml(code, book, c).then((html) => {
      const box = document.createElement("div");
      const clean = cleanChapter(html);
      if (clean === null) throw new Error("sanitiser unavailable");
      box.innerHTML = clean;
      markVerses(box);
      return verseTextFrom(box, v);
    });
  }

  // ── Citations (mo-tfr-verse) ────────────────────────────────────
  function api(path, params) {
    const u = new URL(VERSE_API + path);
    Object.keys(params || {}).forEach((k) => {
      const val = params[k];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && !val.length)) return;
      u.searchParams.set(k, Array.isArray(val) ? val.join(k === "au" ? "|" : ",") : String(val));
    });
    return fetch(u.toString(), { credentials: "omit" }).then((r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }
  const fetchVerse = (book, c, v, f, offset, limit) => api("/v1/verse", {
    b: book.lib, c, v, tr: f.tr, au: f.au, cen: f.cen, q: f.q, w: f.w, offset: offset || 0, limit: limit || 20,
  });
  const fetchCommentaries = (book, c, f) => api("/v1/verse/commentaries", {
    b: book.lib, c, tr: f.tr, au: f.au, cen: f.cen,
  });
  const fetchPassage = (row, book, c, v) => api("/v1/verse/passage", {
    w: row.w, p: row.p, h: row.h, b: book.lib, c, v,
  });

  // ── Filters ─────────────────────────────────────────────────────
  // One filter state shape everywhere: tradition (shelf codes), author
  // names, centuries, and a search string. Single choice per facet in
  // the UI; the API takes lists, so widening this later is local.
  const emptyFilters = () => ({ tr: [], au: [], cen: [], q: "" });
  const activeCount = (f) => f.tr.length + f.au.length + f.cen.length + (f.q ? 1 : 0);

  /* Three selects with live counts, plus an optional search box and a
   * Clear link. `onChange(filters)` fires on every change; the search box
   * debounces. Counts come from the latest response's facets, so each
   * select shows what choosing that option would leave. */
  function filterBar(host, opts) {
    const f = emptyFilters();
    const idp = `sdf-${Math.random().toString(36).slice(2, 8)}`;
    host.classList.add("sd-filters");
    host.innerHTML =
      `<div class="sd-filter-row">` +
        `<label class="sd-filter"><span class="sd-filter-label">Tradition</span><select id="${idp}-tr" data-k="tr"><option value="">All traditions</option></select></label>` +
        `<label class="sd-filter"><span class="sd-filter-label">Author</span><select id="${idp}-au" data-k="au"><option value="">All authors</option></select></label>` +
        `<label class="sd-filter"><span class="sd-filter-label">Century</span><select id="${idp}-cen" data-k="cen"><option value="">All centuries</option></select></label>` +
      `</div>${ 
      opts.search ? `<label class="sd-search"><span class="sd-filter-label">${esc(opts.searchLabel || "Search these citations")}</span><input type="search" id="${idp}-q" placeholder="${esc(opts.searchPlaceholder || "Author, work, or subject")}" autocomplete="off"></label>` : "" 
      }<button type="button" class="sd-clear" hidden>Clear filters</button>`;
    const selects = host.querySelectorAll("select");
    const $q = host.querySelector("input[type=search]");
    const $clear = host.querySelector(".sd-clear");
    const fire = () => { $clear.hidden = !activeCount(f); opts.onChange(f); };
    selects.forEach((s) => s.addEventListener("change", () => {
      f[s.dataset.k] = s.value ? [s.value] : [];
      fire();
    }));
    let t = 0;
    if ($q) $q.addEventListener("input", () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => { f.q = $q.value.trim(); fire(); }, 250);
    });
    $clear.addEventListener("click", () => {
      f.tr = []; f.au = []; f.cen = []; f.q = "";
      selects.forEach((s) => { s.value = ""; });
      if ($q) $q.value = "";
      fire();
    });
    return {
      filters: f,
      // Repaint the options from a response's facets, keeping the
      // current choice selected even if its count fell to zero.
      update(facets) {
        selects.forEach((s) => {
          const {k} = s.dataset;
          const list = (facets && facets[k === "tr" ? "tradition" : k === "au" ? "author" : "century"]) || [];
          const cur = f[k][0] || "";
          const first = s.options[0].outerHTML;
          const seen = new Set();
          // Printed tradition names go through MOFaithLabel ("English Divines" shows as "English writers"); values stay the worker's.
          const shown = (v) => (k === "tr" && window.MOFaithLabel ? window.MOFaithLabel.shelf(v) : v);
          const opt = list.map((x) => {
            seen.add(String(x.k));
            return `<option value="${esc(x.k)}"${String(x.k) === cur ? " selected" : ""}>${esc(shown(x.label || x.k))} (${fmt(x.n)})</option>`;
          });
          if (cur && !seen.has(cur)) opt.unshift(`<option value="${esc(cur)}" selected>${esc(shown(cur))} (0)</option>`);
          s.innerHTML = first + opt.join("");
          s.value = cur;
          s.disabled = !list.length && !cur;
        });
      },
      reset() { $clear.click(); },
      // Choose one option from outside the bar (the Desk's charts).
      set(k, value) {
        const s = host.querySelector(`select[data-k="${k}"]`);
        if (!s) return;
        const val = String(value || "");
        if (val && !Array.prototype.some.call(s.options, (o) => o.value === val)) {
          s.insertAdjacentHTML("beforeend", `<option value="${esc(val)}">${esc(val)}</option>`);
        }
        s.value = val;
        f[k] = val ? [val] : [];
        fire();
      },
    };
  }

  // ── Source rows with inline preview ─────────────────────────────
  const HOW = { quotation: "Quotes", explicit: "Cites", allusion: "Alludes", citation: "Cites", exegesis: "Expounds" };
  const centuryLabel = (c) => {
    const n = Number(c);
    if (!n) return "";
    const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
    return `${n}${s} c.`;
  };

  /* A work, with a Preview toggle that opens the passage below itself.
   * `row` is a citation row (or a top-work entry, which has the same
   * w/t/a/h keys plus a count). The preview reads the author's words at
   * the cited place from the worker and sets them as a quotation; if the
   * worker cannot place them, it says so and offers the reader link,
   * rather than falling back to the machine-written gist. */
  // The library cuts gists at a fixed length, often mid-word. Say so.
  const gist = (g) => {
    const t = String(g).trim();
    return /[.!?)"\u201d\u2019]$/.test(t) ? t : `${t}\u2026`;
  };

  function sourceItem(row, ctx, extra) {
    const li = document.createElement("li");
    li.className = "sd-source";
    const href = sourceHref(row.h, row.w, row.p);
    const meta = [row.a, centuryLabel(row.cen)].filter(Boolean).map(esc).join(" · ");
    const pid = `sdp-${Math.random().toString(36).slice(2, 9)}`;
    li.innerHTML =
      `<div class="sd-source-head">` +
        `<div class="sd-source-id">` +
          `<span class="sd-source-title">${esc(row.t || row.w)}</span>` +
          `<span class="sd-source-meta">${meta}${extra && extra.count ? ` · ${plural(extra.count, "citation", "citations")}` : ""}${!extra && row.how ? ` · ${esc(HOW[row.how] || row.how)}` : ""}</span>` +
        `</div>` +
        `<button type="button" class="sd-preview-btn" aria-expanded="false" aria-controls="${pid}">Preview</button>` +
      `</div>${ 
      row.g && !(extra && extra.count) ? `<p class="sd-source-gist">${esc(gist(row.g))}</p>` : "" 
      }<div class="sd-preview" id="${pid}" hidden></div>`;
    const $btn = li.querySelector(".sd-preview-btn");
    const $pv = li.querySelector(".sd-preview");
    let loaded = false;
    $btn.addEventListener("click", () => {
      const open = $btn.getAttribute("aria-expanded") !== "true";
      $btn.setAttribute("aria-expanded", String(open));
      $btn.textContent = open ? "Hide" : "Preview";
      $pv.hidden = !open;
      if (!open || loaded) return;
      loaded = true;
      $pv.innerHTML = `<p class="sd-muted" role="status">Finding the passage…</p>`;
      const pick = extra && extra.pickRow ? extra.pickRow() : Promise.resolve(row);
      pick.then((r) => fetchPassage(r || row, ctx.book, ctx.c, ctx.v).then((d) => ({ d, r: r || row })))
        .then(({ d, r }) => {
          const link = sourceHref((d && d.href) || r.h, r.w, r.p) || href;
          const read = link ? `<a class="sd-read-link" href="${esc(link)}">Read in context</a>` : "";
          if (d && d.found && d.text) {
            // The worker trims to the neighbourhood of the reference and
            // says which ends it cut; mark them so a clipped sentence is
            // not read as the author's whole thought.
            const text = `${d.clipped_start ? "… " : ""}${d.text}${d.clipped_end ? " …" : ""}`;
            $pv.innerHTML =
              `<blockquote class="sd-quote"${d.lang ? ` lang="${esc(d.lang)}"` : ""}>${esc(text)}</blockquote>` +
              `<p class="sd-preview-foot">${d.locator ? `<span>${esc(d.locator)}</span>` : ""}${read}</p>`;
          } else {
            const why = d && d.reason === "licensed"
              ? "This edition's text is licensed, so it cannot be previewed here."
              : "The passage could not be extracted from this edition.";
            $pv.innerHTML = `<p class="sd-muted">${why}</p><p class="sd-preview-foot">${read}</p>`;
          }
        })
        .catch(() => {
          loaded = false;
          $pv.innerHTML = `<p class="sd-muted">The passage did not load. Select Hide, then Preview, to try again.</p>`;
        });
    });
    return li;
  }

  /* Commentaries for a book, filtered to those that cover the chapter.
   * Ian, 2026-09-22: a Commentaries dropdown at the top, the list on a
   * single line that scrolls sideways, with the same filters as the
   * citations. The strip is the one horizontal scroller on these pages
   * by his request; its items are links, so there is nothing inside it
   * that grows. `host` receives the filters and the strip; `onCount`
   * reports the unfiltered total so the toggle can carry it. */
  function commentaryStrip(host, ctx, onCount) {
    host.innerHTML =
      `<div class="sd-comm-filters"></div>` +
      `<p class="sd-comm-status sd-muted" role="status"></p>` +
      `<ul class="sd-comm-strip" aria-label="Commentaries"></ul>`;
    const $status = host.querySelector(".sd-comm-status");
    const $strip = host.querySelector(".sd-comm-strip");
    let run = 0;
    const load = (f) => {
      const my = ++run;
      $status.textContent = "Loading commentaries…";
      fetchCommentaries(ctx.book, ctx.c, f).then((d) => {
        // A strip replaced by the next chapter's must not report here.
        if (my !== run || !$strip.isConnected) return;
        if (!d) { $status.textContent = "No commentaries are catalogued for this book yet."; $strip.innerHTML = ""; return; }
        bar.update(d.facets);
        if (onCount) onCount(d.total);
        const items = d.items || [];
        $status.textContent = items.length
          ? (activeCount(f)
            ? `${plural(d.matched, "commentary", "commentaries")} of ${fmt(d.total)} match`
            : `${plural(d.total, "commentary", "commentaries")} on ${ctx.book.name} ${ctx.c}. Scroll sideways for more.`)
          : (d.total ? "No commentaries match these filters." : "No commentaries are catalogued for this book yet.");
        $status.hidden = !$status.textContent;
        $strip.innerHTML = items.map((e) => {
          const href = sourceHref(e.href, e.w);
          const range = e.c1 ? `Chapters ${e.c1}${e.c2 && e.c2 !== e.c1 ? `–${e.c2}` : ""}` : (e.annotation ? "Annotations" : (e.kind || "Commentary"));
          const meta = [centuryLabel(e.cen)].filter(Boolean).map(esc).join(" · ");
          const inner =
            `<span class="sd-comm-title">${esc(e.t)}</span>` +
            `<span class="sd-comm-author">${esc(e.a || "")}</span>` +
            `<span class="sd-comm-meta">${esc(range)}${meta ? ` · ${meta}` : ""}</span>`;
          // No usable link: show the card, but do not point it back here.
          return href
            ? `<li class="sd-comm"><a class="sd-comm-card" href="${esc(href)}">${inner}</a></li>`
            : `<li class="sd-comm"><span class="sd-comm-card">${inner}</span></li>`;
        }).join("");
      }).catch(() => {
        if (my !== run || !$strip.isConnected) return;
        $status.hidden = false;
        $status.innerHTML = `Commentaries did not load. <button type="button" class="sd-clear" data-sd-retry>Try again</button>`;
        $status.querySelector("[data-sd-retry]").addEventListener("click", () => load(bar.filters));
      });
    };
    const bar = filterBar(host.querySelector(".sd-comm-filters"), { onChange: load });
    load(bar.filters);
    return { reload: () => load(bar.filters) };
  }

  window.MOScriptureDev = {
    commentaryStrip, cleanChapter,
    TRANSLATIONS, BOOKS, BOOK_BY_SLUG, esc, fmt, plural,
    parseRef, legacyRef, refKey, refLabel, readerHref, deskHref, sourceHref,
    translationInfo, recalledTranslation, rememberTranslation,
    fetchChapterHtml, markVerses, verseTextFrom, fetchVerseText,
    fetchVerse, fetchCommentaries, fetchPassage,
    emptyFilters, activeCount, filterBar, sourceItem, centuryLabel,
    // For /the-faith-received/topics/, which reads the same worker.
    api, VERSE_API,
  };
})();
