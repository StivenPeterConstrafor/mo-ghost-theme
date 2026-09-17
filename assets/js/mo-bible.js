/*
 * /bible/ — Scripture reader.
 *
 * WHAT CHANGED, AND WHY THE PAGE WAS BROKEN. This file used to speak
 * api.bible: /bibles, /bibles/<id>/books, /bibles/<id>/chapters/<id>.
 * The mo-bible worker was rewritten to serve bolls.life and answers one
 * route only —
 *
 *     GET /chapter/{translation}/{bookNumber}/{chapter}
 *        → { data: { content: "<div class=bolls-scripture>…", verseCount } }
 *
 * — so every call this file made 404'd and the page had been showing
 * "Bible reader is unavailable right now" in production. Found
 * 2026-09-15 while wiring verses to the Scripture Index.
 *
 * THE BOOK TABLE IS OURS NOW. That endpoint returns a chapter and
 * nothing else: no translation list, no books, no chapter counts. The
 * canon is fixed and small, so it is stated here rather than fetched.
 * Book NUMBERS are the worker's addressing (1–66, Genesis to
 * Revelation); the USFM ids are kept because the URL hash is built from
 * them and existing links must keep working.
 *
 * Hash format is unchanged: #{bookId}.{chapter} — #JHN.3, #ROM.8.
 *
 * VERSES LINK TO THE TRADITION. Each verse number is wrapped in a link
 * to the Scripture Index at that book and chapter, which is the
 * granularity the index actually holds (it is keyed "John 3"). The
 * cross-reference panel below the text is unchanged and still lists the
 * creeds and confessions citing the chapter.
 */
(function () {
  "use strict";

  // ── Config ─────────────────────────────────────────────────────
  const meta = document.querySelector('meta[name="mo-bible-base"]');
  const BIBLE_BASE = (meta && meta.content || "").replace(/\/$/, "");
  if (!BIBLE_BASE) {
    console.error("mo-bible: missing <meta name=\"mo-bible-base\">; reader disabled");
    return;
  }

  const LS_TRANSLATION = "mo-bible:translation";
  const SCRIPTURE_INDEX_URL = window.moAssetUrl("/assets/data/faith-received/scripture-index.json");
  const SCRIPTURE_PAGE = "/the-faith-received/scripture/";

  // The translations the worker allows. Kept in step with
  // ALLOWED_TRANSLATIONS in workers/bible/bible.js — a value not in that
  // set comes back 400.
  const TRANSLATIONS = [
    ["ESV", "English Standard Version"],
    ["KJV", "King James Version"],
    ["NKJV", "New King James Version"],
    ["NASB", "New American Standard Bible"],
    ["NIV", "New International Version"],
    ["CSB17", "Christian Standard Bible"],
    ["BSB", "Berean Standard Bible"],
    ["AMP", "Amplified Bible"],
    ["MEV", "Modern English Version"],
    ["ASV", "American Standard Version"],
    ["WEB", "World English Bible"],
    ["YLT", "Young's Literal Translation"],
  ];

  // [USFM id, display name, chapter count]. Index + 1 is the book number
  // the worker addresses.
  const BOOKS = [
    ["GEN","Genesis",50],["EXO","Exodus",40],["LEV","Leviticus",27],["NUM","Numbers",36],
    ["DEU","Deuteronomy",34],["JOS","Joshua",24],["JDG","Judges",21],["RUT","Ruth",4],
    ["1SA","1 Samuel",31],["2SA","2 Samuel",24],["1KI","1 Kings",22],["2KI","2 Kings",25],
    ["1CH","1 Chronicles",29],["2CH","2 Chronicles",36],["EZR","Ezra",10],["NEH","Nehemiah",13],
    ["EST","Esther",10],["JOB","Job",42],["PSA","Psalms",150],["PRO","Proverbs",31],
    ["ECC","Ecclesiastes",12],["SNG","Song of Solomon",8],["ISA","Isaiah",66],["JER","Jeremiah",52],
    ["LAM","Lamentations",5],["EZK","Ezekiel",48],["DAN","Daniel",12],["HOS","Hosea",14],
    ["JOL","Joel",3],["AMO","Amos",9],["OBA","Obadiah",1],["JON","Jonah",4],
    ["MIC","Micah",7],["NAM","Nahum",3],["HAB","Habakkuk",3],["ZEP","Zephaniah",3],
    ["HAG","Haggai",2],["ZEC","Zechariah",14],["MAL","Malachi",4],
    ["MAT","Matthew",28],["MRK","Mark",16],["LUK","Luke",24],["JHN","John",21],
    ["ACT","Acts",28],["ROM","Romans",16],["1CO","1 Corinthians",16],["2CO","2 Corinthians",13],
    ["GAL","Galatians",6],["EPH","Ephesians",6],["PHP","Philippians",4],["COL","Colossians",4],
    ["1TH","1 Thessalonians",5],["2TH","2 Thessalonians",3],["1TI","1 Timothy",6],["2TI","2 Timothy",4],
    ["TIT","Titus",3],["PHM","Philemon",1],["HEB","Hebrews",13],["JAS","James",5],
    ["1PE","1 Peter",5],["2PE","2 Peter",3],["1JN","1 John",5],["2JN","2 John",1],
    ["3JN","3 John",1],["JUD","Jude",1],["REV","Revelation",22],
  ].map((b, i) => ({ id: b[0], name: b[1], chapters: b[2], num: i + 1 }));

  const BOOK_BY_ID = new Map(BOOKS.map((b) => [b.id, b]));
  const DEFAULT_BOOK = "GEN";

  // ── DOM ────────────────────────────────────────────────────────
  const $status = document.querySelector("[data-bible-status]");
  const $body = document.querySelector("[data-bible-chapter-body]");
  const $translation = document.querySelector("[data-bible-translation]");
  const $book = document.querySelector("[data-bible-book]");
  const $chapter = document.querySelector("[data-bible-chapter]");
  const $prev = document.querySelector("[data-bible-prev]");
  const $next = document.querySelector("[data-bible-next]");
  const $attribution = document.querySelector("[data-bible-attribution]");
  const $xrefs = document.querySelector("[data-bible-cross-refs]");
  const $xrefsList = document.querySelector("[data-bible-cross-refs-list]");
  const $xrefsCount = document.querySelector("[data-bible-cross-refs-count]");

  if (!$body || !$translation) return;

  let scriptureIndex = null;
  const current = { translation: null, bookId: null, chapterNum: null, bookName: null };

  // ── Helpers ────────────────────────────────────────────────────
  function chapterUrl(translation, book, chapterNum) {
    return `${BIBLE_BASE}/chapter/${encodeURIComponent(translation)}/${book.num}/${chapterNum}`;
  }

  function setStatus(text, isError) {
    if (!$status) return;
    $status.textContent = text || "";
    $status.classList.toggle("is-error", !!isError);
    $status.hidden = !text;
  }

  function hashState() {
    const h = (window.location.hash || "").replace(/^#/, "");
    const m = h.match(/^([A-Za-z0-9]+)\.(\d+)$/);
    if (!m) return null;
    const book = BOOK_BY_ID.get(m[1].toUpperCase());
    const ch = parseInt(m[2], 10);
    if (!book || !(ch >= 1 && ch <= book.chapters)) return null;
    return { bookId: book.id, chapterNum: ch };
  }

  function setHash(bookId, chapterNum) {
    const next = `#${bookId}.${chapterNum}`;
    if (window.location.hash === next) return;
    history.pushState(null, "", next);
  }

  function rememberTranslation(id) {
    try { localStorage.setItem(LS_TRANSLATION, id); } catch (e) {}
  }
  function recalledTranslation() {
    try { return localStorage.getItem(LS_TRANSLATION) || null; } catch (e) { return null; }
  }

  // ── The selects ────────────────────────────────────────────────
  function populateTranslations() {
    $translation.innerHTML = "";
    for (const [id, label] of TRANSLATIONS) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${label} (${id})`;
      $translation.appendChild(opt);
    }
    const want = recalledTranslation();
    $translation.value = (want && TRANSLATIONS.some((t) => t[0] === want)) ? want : "ESV";
    return $translation.value;
  }

  function populateBooks() {
    $book.innerHTML = "";
    for (const b of BOOKS) {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.name;
      $book.appendChild(opt);
    }
  }

  function populateChapters(bookId) {
    const book = BOOK_BY_ID.get(bookId);
    $chapter.innerHTML = "";
    if (!book) { $chapter.disabled = true; return; }
    for (let n = 1; n <= book.chapters; n++) {
      const opt = document.createElement("option");
      opt.value = String(n);
      opt.textContent = String(n);
      $chapter.appendChild(opt);
    }
    $chapter.disabled = false;
  }

  // ── Render one chapter ─────────────────────────────────────────
  // Verse numbers arrive as <sup>N</sup>. Each becomes a link to the
  // Scripture Index for this book and chapter, so a verse is one click
  // from everything in the library that cites it.
  /* Verses become addressable things rather than loose text.
   *
   * The verse number used to be a bare link to the Scripture Index, one
   * destination and nothing else. A verse is the unit a reader actually
   * wants to act on -- to ask about it, to search the library for it, to
   * quote it -- so each one is wrapped in an element that the tools below
   * can anchor to, and the old index link becomes one entry among them.
   *
   * Done in the DOM rather than by rewriting the HTML string, because a
   * verse does not respect the markup: it can begin mid-paragraph and run
   * past a </p> into the next one, and a regex that wraps from one <sup>
   * to the next would produce crossed tags. Walking blocks and carrying
   * the open verse number across them yields one span per block per
   * verse, all sharing data-v -- correct, and it keeps the prose flowing
   * instead of breaking the chapter into one line per verse.
   */
  const isMarker = (n) =>
    n.nodeType === 1 && n.tagName === "SUP" && /^\d+$/.test((n.textContent || "").trim());

  function markVerses(root) {
    const blocks = root.querySelectorAll("p").length
      ? Array.prototype.slice.call(root.querySelectorAll("p"))
      : [root];
    let carry = 0;
    const idSeen = new Set();

    blocks.forEach((block) => {
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
        // Only the first block of a verse answers to #v12.
        if (!idSeen.has(v)) { span.id = `v${v}`; idSeen.add(v); }
        block.appendChild(span);
      };

      nodes.forEach((node) => {
        if (isMarker(node)) {
          carry = parseInt((node.textContent || "").trim(), 10);
          open(carry);
        } else if (!span) {
          // Text before any marker in this block continues the verse the
          // previous block left open. With nothing open (a heading), it
          // stays where it is.
          if (carry) open(carry); else { block.appendChild(node); return; }
        }
        span.appendChild(node);
      });
    });
  }

  function loadChapter(translation, bookId, chapterNum) {
    const book = BOOK_BY_ID.get(bookId);
    if (!book) return Promise.resolve();
    setStatus("Loading…");
    $body.classList.remove("is-loaded");
    return fetch(chapterUrl(translation, book, chapterNum), { credentials: "omit" })
      .then((r) => {
        if (!r.ok) {
          return r.json().catch(() => null).then((b) => {
            throw new Error((b && b.error) || `HTTP ${r.status}`);
          });
        }
        return r.json();
      })
      .then((resp) => {
        const content = resp && resp.data && resp.data.content;
        if (!content) {
          setStatus("This chapter is unavailable in the selected translation.", true);
          $body.innerHTML = "";
          return;
        }
        $body.innerHTML =
          `<header class="bible-chapter-header">` +
            `<p class="bible-chapter-eyebrow">${escapeHtml(book.name)}</p>` +
            `<h2 class="bible-chapter-heading"><em>Chapter ${chapterNum}</em></h2>` +
          `</header>` +
          `<div class="bible-chapter-content article-content">${content}</div>`;
        const $content = $body.querySelector(".bible-chapter-content");
        if ($content) markVerses($content);
        closeVersePop();
        $body.classList.add("is-loaded");
        setStatus("");

        current.translation = translation;
        current.bookId = book.id;
        current.chapterNum = chapterNum;
        current.bookName = book.name;

        $prev.disabled = book.num === 1 && chapterNum === 1;
        $next.disabled = book.num === 66 && chapterNum === book.chapters;

        if ($translation.value !== translation) $translation.value = translation;
        if ($book.value !== book.id) { $book.value = book.id; populateChapters(book.id); }
        if ($chapter.value !== String(chapterNum)) $chapter.value = String(chapterNum);
        setHash(book.id, chapterNum);
        renderAttribution(translation);
        renderCrossRefs(book.name, chapterNum);
        syncChapterTools();
      })
      .catch((err) => {
        console.error("mo-bible chapter", err);
        setStatus("That chapter could not be loaded. Please try again.", true);
      });
  }

  // Walk the canon rather than the current book, so the last chapter of
  // one book steps into the first of the next.
  function step(delta) {
    const book = BOOK_BY_ID.get(current.bookId);
    if (!book) return;
    let n = current.chapterNum + delta;
    let b = book;
    if (n < 1) {
      b = BOOKS[book.num - 2];
      if (!b) return;
      n = b.chapters;
    } else if (n > book.chapters) {
      b = BOOKS[book.num];
      if (!b) return;
      n = 1;
    }
    loadChapter(current.translation, b.id, n);
  }

  function renderAttribution(translation) {
    if (!$attribution) return;
    const entry = TRANSLATIONS.find((t) => t[0] === translation);
    $attribution.textContent = entry
      ? `${entry[1]} (${entry[0]}), served through bolls.life.`
      : "";
  }

  // ── Cross-references to The Faith Received ─────────────────────
  function loadScriptureIndex() {
    if (scriptureIndex) return Promise.resolve(scriptureIndex);
    return fetch(SCRIPTURE_INDEX_URL, { credentials: "omit" })
      .then((r) => { return r.ok ? r.json() : null; })
      .then((data) => { scriptureIndex = data; return data; })
      .catch(() => { return null; });
  }

  function renderCrossRefs(bookName, chapterNum) {
    if (!$xrefs || !$xrefsList) return;
    loadScriptureIndex().then((data) => {
      if (!data || !data.index) { $xrefs.hidden = true; return; }
      const key = `${bookName} ${chapterNum}`;
      const hits = data.index[key] || [];
      if (!hits.length) { $xrefs.hidden = true; $xrefsList.innerHTML = ""; return; }
      $xrefsList.innerHTML = hits.map((h) => {
        let href = `/the-faith-received/${h.source}/`;
        if (h.id) href += `#${h.id}`;
        return (
          `<li class="bible-cross-ref">` +
            `<a class="bible-cross-ref-link" href="${href}">` +
              `<span class="bible-cross-ref-source">${escapeHtml(sourceLabel(h.source))}</span>` +
              `<span class="bible-cross-ref-title"><em>${escapeHtml(h.title || "")}</em></span>${ 
              h.excerpt ? `<span class="bible-cross-ref-excerpt">${escapeHtml(h.excerpt)}</span>` : "" 
            }</a>` +
          `</li>`
        );
      }).join("");
      if ($xrefsCount) $xrefsCount.textContent = `${hits.length} ${hits.length === 1 ? "passage" : "passages"}`;
      $xrefs.hidden = false;
    });
  }

  // Map slugs in scripture-index.json to human-readable source labels.
  // The slugs match the TFR document slugs; this table is the visible
  // shorthand. Anything not in the table falls back to a title-cased
  // version of the slug.
  const SOURCE_LABELS = {
    "heidelberg": "Heidelberg Catechism",
    "westminster-shorter": "Westminster Shorter Catechism",
    "westminster-larger": "Westminster Larger Catechism",
    "belgic": "Belgic Confession",
    "augsburg": "Augsburg Confession",
    "thirty-nine-articles": "Thirty-Nine Articles",
    "1689": "1689 London Baptist Confession",
    "apostles-creed": "Apostles' Creed",
    "nicene-creed": "Nicene Creed",
    "chalcedonian": "Chalcedonian Definition",
    "athanasian": "Athanasian Creed",
    "didache": "Didache",
    "lausanne": "Lausanne Covenant",
    "diognetus": "Epistle to Diognetus",
    "athanasius-incarnation": "Athanasius, On the Incarnation",
    "augustine-confessions": "Augustine, Confessions",
    "ninety-five-theses": "Luther, 95 Theses",
    "edwards-resolutions": "Edwards, Resolutions",
    "calvin-institutes": "Calvin, Institutes",
    "charnock-attributes": "Charnock, Attributes",
    "imitation-of-christ": "Imitation of Christ",
    "polanus-syntagma": "Polanus, Syntagma",
    "rerum-novarum": "Leo XIII, Rerum Novarum",
  };
  function sourceLabel(slug) {
    if (SOURCE_LABELS[slug]) return SOURCE_LABELS[slug];
    return slug.replace(/-/g, " ").replace(/\b\w/g, (m) => { return m.toUpperCase(); });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ── Ask and Search, from the verse ────────────────────────────
   *
   * Both HAND OFF rather than answer here, and that is deliberate.
   * /v1/ask and /v1/vsearch are member-gated and metered on the server,
   * and /bible/ is a public page. Re-implementing either here would mean
   * a second copy of the gate, the rate limit and the sign-in prompt on
   * the one surface most likely to be someone's first visit -- and the
   * gate that matters is the server's, so the copy would only ever be a
   * worse version of the message the reader already gets.
   *
   * So the verse carries its question to the surface that owns it: Ask
   * reads ?ask=, the search page reads ?q=. Each already knows how to
   * ask an anonymous reader to sign in, and the question survives it.
   *
   * Both are full-viewport once open, so opening them in place here
   * would cover this page anyway. Navigating costs the reader nothing
   * and costs this page five scripts it would otherwise carry on every
   * load, for a panel most visits never open.
   */
  const ASK_PAGE = "/the-faith-received/ask/";
  const SEARCH_PAGE = "/the-faith-received/search/";

  let $pop = null;

  function closeVersePop() {
    if ($pop) { $pop.remove(); $pop = null; }
    const was = $body.querySelector(".bible-verse.is-active");
    if (was) was.classList.remove("is-active");
  }

  function verseText(n) {
    // A verse can be several spans; read them in order, and drop the
    // verse number itself so the quote starts at the first word.
    const parts = Array.prototype.slice.call(
      $body.querySelectorAll(`.bible-verse[data-v="${String(n).replace(/"/g, "")}"]`),
    ).map((el) => {
      const copy = el.cloneNode(true);
      Array.prototype.slice.call(copy.querySelectorAll("sup")).forEach((s) => s.remove());
      return (copy.textContent || "").trim();
    });
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  function link(cls, href, label, hint) {
    const a = document.createElement("a");
    a.className = cls;
    // Same-origin paths built here from a fixed prefix and an encoded
    // query. Anchors rather than a scripted redirect, so the reader can
    // see the destination and open it in a new tab.
    a.setAttribute("href", href);
    a.textContent = label;
    if (hint) a.title = hint;
    return a;
  }

  function openVersePop(span) {
    const n = span.dataset.v;
    if (!n) return;
    const active = $pop && $pop.dataset.v === n;
    closeVersePop();
    if (active) return; // second click on the same verse closes

    const book = current.bookName || "";
    const ref = `${book} ${current.chapterNum}:${n}`;
    const text = verseText(n);
    // Enough of the verse to make the question specific, short enough to
    // stay inside a URL that has to survive a sign-in round trip.
    const quote = text.length > 240 ? `${text.slice(0, 240).replace(/\s+\S*$/, "")}…` : text;

    $pop = document.createElement("div");
    $pop.className = "bible-pop";
    $pop.dataset.v = n;
    $pop.setAttribute("role", "dialog");
    $pop.setAttribute("aria-label", `Tools for ${ref}`);

    const head = document.createElement("p");
    head.className = "bible-pop-ref";
    head.textContent = ref;
    $pop.appendChild(head);

    const row = document.createElement("div");
    row.className = "bible-pop-row";
    row.appendChild(link(
      "bible-pop-btn bible-pop-btn--primary",
      `${ASK_PAGE}?ask=${encodeURIComponent(
        `What does the historic Christian tradition say about ${ref} — “${quote}”?`)}`,
      "Ask",
      `Ask the library about ${ref}`,
    ));
    row.appendChild(link(
      "bible-pop-btn",
      `${SEARCH_PAGE}?q=${encodeURIComponent(quote.slice(0, 120))}`,
      "Search",
      `Search the library for the words of ${ref}`,
    ));
    row.appendChild(link(
      "bible-pop-btn",
      `${SCRIPTURE_PAGE}?book=${encodeURIComponent(book)}&chapter=${current.chapterNum}#v${n}`,
      "Cited by",
      `Where the tradition cites ${book} ${current.chapterNum}`,
    ));

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "bible-pop-btn";
    copy.textContent = "Copy";
    copy.title = `Copy ${ref}`;
    copy.addEventListener("click", () => {
      const payload = `“${text}” — ${ref} (${current.translation || ""})`.replace(/ \(\)$/, "");
      const done = () => { copy.textContent = "Copied"; window.setTimeout(() => { copy.textContent = "Copy"; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(done, () => { copy.textContent = "Press ⌘C"; });
      } else { copy.textContent = "Press ⌘C"; }
    });
    row.appendChild(copy);
    $pop.appendChild(row);

    span.classList.add("is-active");
    span.appendChild($pop);
  }

  // Delegated, because the chapter is replaced on every navigation and a
  // handler bound to a verse would die with it.
  $body.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest(".bible-pop")) return;
    const span = e.target.closest && e.target.closest(".bible-verse");
    if (span) { e.preventDefault(); openVersePop(span); return; }
    closeVersePop();
  });

  $body.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const span = e.target.closest && e.target.closest(".bible-verse");
    if (!span || e.target.closest(".bible-pop")) return;
    e.preventDefault();
    openVersePop(span);
  });

  document.addEventListener("click", (e) => {
    if ($pop && !e.target.closest(".bible-chapter-content")) closeVersePop();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeVersePop(); });

  // Chapter-level, for the reader who wants the whole passage rather
  // than one verse. Same hand-off, same two surfaces.
  const $askChapter = document.querySelector("[data-bible-ask]");
  const $searchChapter = document.querySelector("[data-bible-search]");
  function syncChapterTools() {
    const ref = `${current.bookName || ""} ${current.chapterNum || ""}`.trim();
    if (!ref) return;
    if ($askChapter) {
      $askChapter.setAttribute("href", `${ASK_PAGE}?ask=${encodeURIComponent(
        `What does the historic Christian tradition say about ${ref}?`)}`);
      $askChapter.title = `Ask the library about ${ref}`;
    }
    if ($searchChapter) {
      $searchChapter.setAttribute("href", `${SEARCH_PAGE}?q=${encodeURIComponent(ref)}`);
      $searchChapter.title = `Search the library for ${ref}`;
    }
  }

  // ── Wire up ────────────────────────────────────────────────────
  function init() {
    const translation = populateTranslations();
    populateBooks();
    const hs = hashState() || { bookId: DEFAULT_BOOK, chapterNum: 1 };
    $book.value = hs.bookId;
    populateChapters(hs.bookId);
    $chapter.value = String(hs.chapterNum);
    loadChapter(translation, hs.bookId, hs.chapterNum);
  }

  $translation.addEventListener("change", () => {
    const translation = $translation.value;
    rememberTranslation(translation);
    loadChapter(translation, current.bookId || DEFAULT_BOOK, current.chapterNum || 1);
  });

  $book.addEventListener("change", () => {
    const bookId = $book.value;
    populateChapters(bookId);
    loadChapter(current.translation || $translation.value, bookId, 1);
  });

  $chapter.addEventListener("change", () => {
    const n = parseInt($chapter.value, 10);
    if (n >= 1) loadChapter(current.translation || $translation.value, $book.value, n);
  });

  $prev.addEventListener("click", () => step(-1));
  $next.addEventListener("click", () => step(1));

  window.addEventListener("hashchange", () => {
    const hs = hashState();
    if (!hs) return;
    if (hs.bookId === current.bookId && hs.chapterNum === current.chapterNum) return;
    loadChapter(current.translation || $translation.value, hs.bookId, hs.chapterNum);
  });

  // Keyboard: ← / → cycle chapters when no input is focused.
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowLeft" && !$prev.disabled) { e.preventDefault(); $prev.click(); }
    if (e.key === "ArrowRight" && !$next.disabled) { e.preventDefault(); $next.click(); }
  });

  init();
})();
