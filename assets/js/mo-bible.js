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
  function linkVerses(html, book, chapterNum) {
    const href = `${SCRIPTURE_PAGE}?book=${encodeURIComponent(book.name)}&chapter=${chapterNum}`;
    return String(html).replace(/<sup>(\d+)<\/sup>/g, (whole, n) =>
      `<a class="bible-verse-ref" href="${href}#v${n}"` +
      ` title="Where the tradition cites ${escapeHtml(book.name)} ${chapterNum}"` +
      `><sup>${n}</sup></a>`);
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
          `<div class="bible-chapter-content article-content">${linkVerses(content, book, chapterNum)}</div>`;
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
